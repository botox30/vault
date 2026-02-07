import type { Express, Request } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { type User } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createToken, verifyToken } from "./auth";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

declare module "http" {
  interface IncomingMessage {
    userId?: string;
  }
}

const toUserResponse = (user: User) => ({
  id: user.id,
  username: user.username,
  email: user.email ?? null,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const requireAuth = (req: Request, res: any, next: any) => {
    const authHeader = req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return res.sendStatus(401);
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const payload = verifyToken(token);
    if (!payload) {
      return res.sendStatus(401);
    }

    req.userId = payload.sub;
    next();
  };

  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      const token = createToken(user.id);

      res.status(201).json({ token, user: toUserResponse(user) });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      next(err);
    }
  });

  app.post(api.auth.login.path, async (req, res, next) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const isValid = await bcrypt.compare(input.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const token = createToken(user.id);
      res.json({ token, user: toUserResponse(user) });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      next(err);
    }
  });

  app.post(api.auth.logout.path, requireAuth, (_req, res) => {
    res.status(200).json({ message: "Logged out" });
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    if (!req.userId) return res.sendStatus(401);
    const user = await storage.getUser(req.userId);
    if (!user) return res.sendStatus(401);
    res.json(toUserResponse(user));
  });

  app.get(api.auth.search.path, requireAuth, async (req, res) => {
    const username = String(req.query.username || "").trim();
    if (!username) {
      return res.status(400).json({ message: "Username query is required" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ id: user.id, username: user.username });
  });

  app.post(api.friends.request.path, requireAuth, async (req, res) => {
    try {
      const { username } = req.body;
      const targetUser = await storage.getUserByUsername(username);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const fromUserId = req.userId!;
      if (fromUserId === targetUser.id) {
        return res.status(409).json({ message: "Cannot add yourself" });
      }

      const existingRequest = await storage.getExistingFriendRequest(fromUserId, targetUser.id);
      const isAlreadyFriend = await storage.isFriend(fromUserId, targetUser.id);

      if (existingRequest || isAlreadyFriend) {
        return res.status(409).json({ message: "Request pending or already friends" });
      }

      await storage.createFriendRequest(fromUserId, targetUser.id);
      res.status(201).json({ message: "Request sent" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.friends.requests.path, requireAuth, async (req, res) => {
    const requests = await storage.getFriendRequests(req.userId!);
    res.json(
      requests.map((request) => ({
        id: request.id,
        fromUser: {
          id: request.fromUser.id,
          username: request.fromUser.username,
        },
        createdAt: request.createdAt,
      }))
    );
  });

  app.post(api.friends.accept.path, requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(String(req.params.id), 10);
      const request = await storage.getFriendRequest(requestId);
      
      if (!request || request.toUserId !== req.userId) {
        return res.status(404).json({ message: "Request not found" });
      }

      await storage.acceptFriendRequest(requestId);
      res.json({ message: "Accepted" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.friends.reject.path, requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(String(req.params.id), 10);
      const request = await storage.getFriendRequest(requestId);
      
      if (!request || request.toUserId !== req.userId) {
        return res.status(404).json({ message: "Request not found" });
      }

      await storage.rejectFriendRequest(requestId);
      res.json({ message: "Rejected" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.friends.list.path, requireAuth, async (req, res) => {
    const friends = await storage.getFriends(req.userId!);
    res.json(
      friends.map((friendship) => ({
        id: friendship.id,
        friend: {
          id: friendship.friend.id,
          username: friendship.friend.username,
        },
      }))
    );
  });

  app.get(api.messages.history.path, requireAuth, async (req, res) => {
    const friendId = String(req.params.friendId);
    const messages = await storage.getMessageHistory(req.userId!, friendId);
    res.json(messages);
  });

  // === WebSocket Server ===
  const wss = new WebSocketServer({ noServer: true, path: "/ws" });
  const clients = new Map<string, WebSocket>();

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/ws")) {
      const host = request.headers.host ?? "localhost";
      const requestUrl = new URL(request.url, `http://${host}`);
      const token = requestUrl.searchParams.get("token");
      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const payload = verifyToken(token);
      if (!payload) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      request.userId = payload.sub;
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws, req) => {
    const userId = req.userId;
    if (!userId) {
      ws.close();
      return;
    }

    const existingConnection = clients.get(userId);
    if (existingConnection && existingConnection.readyState === WebSocket.OPEN) {
      existingConnection.close();
    }

    clients.set(userId, ws);

    // Send online status to friends (could be improved)
    // For now just echo

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "message") {
          const { toUserId, ciphertext } = message.payload;

          if (!toUserId || typeof ciphertext !== "string") {
            return;
          }

          if (toUserId === userId) {
            return;
          }
          
          // Verify friendship
          const isFriend = await storage.isFriend(userId, toUserId);
          if (!isFriend) {
            return; // Drop message if not friends
          }

          const savedMessage = await storage.saveMessage(userId, toUserId, ciphertext);

          const recipientSocket = clients.get(toUserId);
          if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
            recipientSocket.send(JSON.stringify({
              type: "message",
              payload: {
                fromUserId: userId,
                toUserId,
                ciphertext,
                id: savedMessage.id,
                createdAt: savedMessage.createdAt,
              }
            }));
          }
          
          // Echo back to sender for consistency/ID
          ws.send(JSON.stringify({
            type: "message",
            payload: {
              fromUserId: userId,
              toUserId,
              ciphertext,
              id: savedMessage.id,
              createdAt: savedMessage.createdAt,
            }
          }));
        }
      } catch (err) {
        console.error("WS Message Error:", err);
      }
    });

    ws.on("close", () => {
      clients.delete(userId);
    });
  });

  return httpServer;
}
