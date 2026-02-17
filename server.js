require("dotenv").config({ path: ".env.local" });

const http = require("http");
const next = require("next");
const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback-secret-min-32-characters-long";

// userId -> Set of WebSocket
const onlineUsers = new Map();

function broadcastOnlineList() {
  const userIds = Array.from(onlineUsers.keys());
  const payload = JSON.stringify({ type: "online", userIds });
  onlineUsers.forEach((sockets) => {
    sockets.forEach((ws) => {
      if (ws.readyState === 1) ws.send(payload);
    });
  });
}

function getOtherParticipant(conversation, userId) {
  return conversation.userAId === userId
    ? conversation.userBId
    : conversation.userAId;
}

app.prepare().then(() => {
  // Single server for both Next.js and WebSocket (required for Railway single PORT)
  const port = process.env.PORT || 4000;
  const server = http.createServer((req, res) => handle(req, res));
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    ws.userId = null;
    ws.authenticated = false;

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (!ws.authenticated) {
          if (data.type !== "auth" || !data.token) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Send auth with token first",
              }),
            );
            return;
          }
          jwt.verify(data.token, JWT_SECRET, (err, decoded) => {
            if (err) {
              ws.send(
                JSON.stringify({ type: "error", message: "Invalid token" }),
              );
              return;
            }
            ws.userId = decoded.userId;
            ws.authenticated = true;
            if (!onlineUsers.has(decoded.userId))
              onlineUsers.set(decoded.userId, new Set());
            onlineUsers.get(decoded.userId).add(ws);
            ws.send(JSON.stringify({ type: "auth", ok: true }));
            // Send current online list to this client so status works immediately
            const userIds = Array.from(onlineUsers.keys());
            ws.send(JSON.stringify({ type: "online", userIds }));
            broadcastOnlineList();
          });
          return;
        }

        if (data.type === "message" && data.conversationId && data.content) {
          const conversationId = data.conversationId;
          const content = String(data.content).trim();
          if (!content) return;

          const conv = await prisma.conversation.findFirst({
            where: {
              id: conversationId,
              OR: [{ userAId: ws.userId }, { userBId: ws.userId }],
            },
          });
          if (!conv) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Conversation not found",
              }),
            );
            return;
          }

          const message = await prisma.message.create({
            data: { conversationId, senderId: ws.userId, content },
            include: {
              sender: { select: { id: true, name: true, avatarUrl: true } },
            },
          });

          const otherId = getOtherParticipant(conv, ws.userId);
          const payload = JSON.stringify({
            type: "message",
            message: {
              id: message.id,
              conversationId: message.conversationId,
              senderId: message.senderId,
              content: message.content,
              createdAt:
                message.createdAt instanceof Date
                  ? message.createdAt.toISOString()
                  : message.createdAt,
              sender: message.sender,
            },
          });

          ws.send(payload);
          const otherSockets = onlineUsers.get(otherId);
          if (otherSockets) {
            otherSockets.forEach((s) => {
              if (s.readyState === 1) s.send(payload);
            });
          }
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }
    });

    ws.on("close", () => {
      if (ws.userId && onlineUsers.has(ws.userId)) {
        onlineUsers.get(ws.userId).delete(ws);
        if (onlineUsers.get(ws.userId).size === 0)
          onlineUsers.delete(ws.userId);
        broadcastOnlineList();
      }
    });
  });

  server.listen(port, () => {
    console.log(`> Next.js + WebSocket on http://localhost:${port} (ws at /ws)`);
  });
});
