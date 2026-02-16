require("dotenv").config({ path: ".env.local" });

const http = require("http");
const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const JWT_SECRET =
  process.env.JWT_SECRET || "fallback-secret-min-32-characters-long";

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

const wsPort = process.env.WS_PORT || 4001;
const server = http.createServer((_req, res) => {
  res.writeHead(404);
  res.end();
});
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
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
            })
          );
          return;
        }
        jwt.verify(data.token, JWT_SECRET, (err, decoded) => {
          if (err) {
            ws.send(
              JSON.stringify({ type: "error", message: "Invalid token" })
            );
            return;
          }
          ws.userId = decoded.userId;
          ws.authenticated = true;
          if (!onlineUsers.has(decoded.userId))
            onlineUsers.set(decoded.userId, new Set());
          onlineUsers.get(decoded.userId).add(ws);
          ws.send(JSON.stringify({ type: "auth", ok: true }));
          broadcastOnlineList();
        });
        return;
      }

      // Message already saved via API; broadcast to other participant only (no DB write)
      if (data.type === "message_broadcast" && data.message && data.conversationId) {
        const conv = await prisma.conversation.findFirst({
          where: {
            id: data.conversationId,
            OR: [{ userAId: ws.userId }, { userBId: ws.userId }],
          },
        });
        if (!conv) return;
        const payload = JSON.stringify({
          type: "message",
          message: {
            id: data.message.id,
            conversationId: data.conversationId,
            senderId: data.message.senderId ?? ws.userId,
            content: data.message.content,
            createdAt: data.message.createdAt,
            sender: data.message.sender ?? { id: ws.userId, name: "", avatarUrl: null },
          },
        });
        const otherId = getOtherParticipant(conv, ws.userId);
        const otherSockets = onlineUsers.get(otherId);
        if (otherSockets) {
          otherSockets.forEach((s) => {
            if (s.readyState === 1) s.send(payload);
          });
        }
        return;
      }

      // Legacy: create message in DB and echo to both (use when client does not use API first)
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
            })
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

server.listen(wsPort, () => {
  console.log(`> WebSocket server on ws://localhost:${wsPort}/ws`);
});
