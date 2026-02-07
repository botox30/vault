import { useState, useEffect, useRef } from "react";
import { type WSMessage } from "@shared/schema";
import { useAuth } from "./use-auth";

export interface ChatMessage {
  id: string; // generated locally for list keys
  fromUserId: number;
  text: string;
  timestamp: Date;
}

export function useChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Record<number, ChatMessage[]>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log("WS Connected");
      setConnected(true);
    };

    wsRef.current.onclose = () => {
      console.log("WS Disconnected");
      setConnected(false);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        
        if (message.type === "message") {
          const { fromUserId, toUserId, text } = message.payload;
          
          // If I sent it, add to my view of that friend (toUserId)
          // If I received it, add to my view of sender (fromUserId)
          const partnerId = fromUserId === user.id ? toUserId : fromUserId;

          const newMsg: ChatMessage = {
            id: crypto.randomUUID(),
            fromUserId,
            text,
            timestamp: new Date(),
          };

          setMessages(prev => ({
            ...prev,
            [partnerId]: [...(prev[partnerId] || []), newMsg]
          }));
        }
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    return () => {
      wsRef.current?.close();
    };
  }, [user]);

  const sendMessage = (toUserId: number, text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user) {
      const payload = {
        type: "message",
        payload: { toUserId, text }
      };
      wsRef.current.send(JSON.stringify(payload));
      
      // Optimistically add to local state
      const newMsg: ChatMessage = {
        id: crypto.randomUUID(),
        fromUserId: user.id,
        text,
        timestamp: new Date(),
      };
      
      setMessages(prev => ({
        ...prev,
        [toUserId]: [...(prev[toUserId] || []), newMsg]
      }));
    }
  };

  return { messages, sendMessage, connected };
}
