import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PgSession = connectPg(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === Auth Middleware ===
  const sessionParser = session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  });

  app.use(sessionParser);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // === API Routes ===

  // Auth
  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      next(err);
    }
  });

  app.post(api.auth.login.path, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed" });
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Friends
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    next();
  };

  app.post(api.friends.request.path, requireAuth, async (req, res) => {
    try {
      const { username } = req.body;
      const targetUser = await storage.getUserByUsername(username);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // @ts-ignore
      const fromUserId = req.user!.id;
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
    // @ts-ignore
    const requests = await storage.getFriendRequests(req.user!.id);
    res.json(requests);
  });

  app.post(api.friends.accept.path, requireAuth, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getFriendRequest(requestId);
      
      // @ts-ignore
      if (!request || request.toUserId !== req.user!.id) {
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
      const requestId = parseInt(req.params.id);
      const request = await storage.getFriendRequest(requestId);
      
      // @ts-ignore
      if (!request || request.toUserId !== req.user!.id) {
        return res.status(404).json({ message: "Request not found" });
      }

      await storage.rejectFriendRequest(requestId);
      res.json({ message: "Rejected" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.friends.list.path, requireAuth, async (req, res) => {
    // @ts-ignore
    const friends = await storage.getFriends(req.user!.id);
    res.json(friends);
  });

  app.get(api.messages.history.path, requireAuth, async (req, res) => {
    const friendId = parseInt(req.params.friendId);
    // @ts-ignore
    const messages = await storage.getMessageHistory(req.user!.id, friendId);
    res.json(messages);
  });

  // === WebSocket Server ===
  const wss = new WebSocketServer({ noServer: true, path: "/ws" });
  const clients = new Map<number, WebSocket>();

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/ws")) {
      // @ts-ignore
      sessionParser(request, {}, () => {
        // @ts-ignore
        if (!request.session.passport?.user) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      });
    }
  });

  wss.on("connection", (ws, req) => {
    // @ts-ignore
    const userId = req.session.passport.user;
    clients.set(userId, ws);

    // Send online status to friends (could be improved)
    // For now just echo

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "message") {
          const { toUserId, text } = message.payload;
          
          // Verify friendship
          const isFriend = await storage.isFriend(userId, toUserId);
          if (!isFriend) {
            return; // Drop message if not friends
          }

          // Save message to database
          const savedMessage = await storage.saveMessage(userId, toUserId, text);

          const recipientSocket = clients.get(toUserId);
          if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
            recipientSocket.send(JSON.stringify({
              type: "message",
              payload: {
                id: savedMessage.id,
                fromUserId: userId,
                text,
                createdAt: savedMessage.createdAt,
              }
            }));
          }
          
          // Echo back to sender for consistency/ID
          ws.send(JSON.stringify({
            type: "message",
            payload: {
              id: savedMessage.id,
              fromUserId: userId,
              text,
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

  // Seed Data (if no users)
  if (process.env.NODE_ENV !== "production") {
    const existingUser = await storage.getUserByUsername("demo");
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash("demo123", 10);
      await storage.createUser({ username: "demo", password: hashedPassword, email: "demo@example.com" });
    }
  }

  return httpServer;
}
