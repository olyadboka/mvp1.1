"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type MessagePayload = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
};

type WsMessage =
  | { type: "auth"; ok: boolean }
  | { type: "online"; userIds: string[] }
  | { type: "message"; message: MessagePayload }
  | { type: "error"; message: string };

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 10000;

export function useWebSocket(
  token: string | null,
  onMessage?: (message: MessagePayload) => void,
) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastMessage, setLastMessage] = useState<MessagePayload | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const tokenRef = useRef(token);
  const onMessageRef = useRef(onMessage);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectDelayRef = useRef(RECONNECT_DELAY);
  tokenRef.current = token;
  onMessageRef.current = onMessage;

  const sendMessage = useCallback((conversationId: string, content: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "message", conversationId, content }));
    }
  }, []);

  const sendBroadcast = useCallback(
    (
      conversationId: string,
      message: {
        id: string;
        senderId?: string;
        content: string;
        createdAt: string;
        sender: { id: string; name: string; avatarUrl: string | null };
      },
    ) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "message_broadcast",
            conversationId,
            message: {
              id: message.id,
              senderId: message.senderId,
              content: message.content,
              createdAt: message.createdAt,
              sender: message.sender,
            },
          }),
        );
      }
    },
    [],
  );

  //
  useEffect(() => {
    if (!token) {
      setConnected(false);
      setOnlineUserIds(new Set());
      return;
    }

    let mounted = true;

    function connect() {
      if (!mounted || !tokenRef.current) return;

      const wsUrl =
        typeof window !== "undefined" && process.env.NEXT_PUBLIC_WS_URL
          ? process.env.NEXT_PUBLIC_WS_URL + "/ws"
          : (() => {
              const protocol =
                typeof window !== "undefined" &&
                window.location.protocol === "https:"
                  ? "wss:"
                  : "ws:";
              let host =
                typeof window !== "undefined"
                  ? window.location.host
                  : "localhost:4000";
              // Local dev: npm run dev uses Next on 4000 + ws-server on 4001
              if (
                typeof window !== "undefined" &&
                window.location.port === "4000"
              ) {
                host = window.location.hostname + ":4001";
              }
              return `${protocol}//${host}/ws`;
            })();
      const ws = new WebSocket(wsUrl);

      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", token: tokenRef.current }));
        reconnectDelayRef.current = RECONNECT_DELAY;
      };

      ws.onmessage = (event) => {
        try {
          const data: WsMessage = JSON.parse(event.data);
          if (data.type === "auth" && data.ok) {
            setConnected(true);
          } else if (data.type === "online") {
            setOnlineUserIds(new Set(data.userIds || []));
          } else if (data.type === "message") {
            const msg = data.message;
            setLastMessage(msg);
            onMessageRef.current?.(msg);
          }
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        setConnected(false);
        setOnlineUserIds(new Set());
        if (!mounted || !tokenRef.current) return;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 1.5,
            MAX_RECONNECT_DELAY,
          );
        }, reconnectDelayRef.current);
      };

      ws.onerror = () => {
        setConnected(false);
      };
    }

    connect();

    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
      setOnlineUserIds(new Set());
    };
  }, [token]);

  return { onlineUserIds, lastMessage, connected, sendMessage, sendBroadcast };
}
