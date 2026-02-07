import { pgTable, text, serial, uuid, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  status: text("status").default("offline"), // online, idle, dnd, offline
  customStatus: text("custom_status"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: uuid("from_user_id").notNull(),
  toUserId: uuid("to_user_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  fromUserId: uuid("from_user_id").notNull(),
  toUserId: uuid("to_user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
});

export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  friendId: uuid("friend_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const usersRelations = relations(users, ({ many }) => ({
  sentRequests: many(friendRequests, { relationName: "sentRequests" }),
  receivedRequests: many(friendRequests, { relationName: "receivedRequests" }),
  friends: many(friends, { relationName: "userFriends" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  fromUser: one(users, { fields: [messages.fromUserId], references: [users.id], relationName: "sentMessages" }),
  toUser: one(users, { fields: [messages.toUserId], references: [users.id], relationName: "receivedMessages" }),
}));

export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
  fromUser: one(users, { fields: [friendRequests.fromUserId], references: [users.id], relationName: "sentRequests" }),
  toUser: one(users, { fields: [friendRequests.toUserId], references: [users.id], relationName: "receivedRequests" }),
}));

export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, { fields: [friends.userId], references: [users.id], relationName: "userFriends" }),
  friend: one(users, { fields: [friends.friendId], references: [users.id] }),
}));

// === BASE SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertFriendRequestSchema = createInsertSchema(friendRequests).omit({ id: true, createdAt: true, status: true });

// === EXPLICIT API CONTRACT TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Message = typeof messages.$inferSelect;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type Friend = typeof friends.$inferSelect;

export type UserResponse = {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  customStatus: string | null;
};

export type MessageResponse = Message;

// WebSocket message types
export type WSMessage = 
  | { type: 'message'; payload: { fromUserId: string; toUserId: string; ciphertext: string; id?: number; createdAt?: Date | string | null } }
  | { type: 'status'; payload: { userId: string; status: 'online' | 'offline' | 'idle' | 'dnd' } };
