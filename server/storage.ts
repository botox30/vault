import { db } from "./db";
import { 
  users, friendRequests, friends, messages,
  type User, type InsertUser, 
  type FriendRequest, 
  type Friend,
  type Message
} from "@shared/schema";
import { eq, or, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest>;
  getFriendRequest(id: number): Promise<FriendRequest | undefined>;
  getFriendRequests(userId: string): Promise<(FriendRequest & { fromUser: User })[]>;
  getExistingFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest | undefined>;
  
  acceptFriendRequest(requestId: number): Promise<void>;
  rejectFriendRequest(requestId: number): Promise<void>;
  
  getFriends(userId: string): Promise<(Friend & { friend: User })[]>;
  isFriend(userId1: string, userId2: string): Promise<boolean>;

  // Messages
  saveMessage(fromUserId: string, toUserId: string, content: string): Promise<Message>;
  getMessageHistory(userId1: string, userId2: string): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest> {
    const [request] = await db.insert(friendRequests)
      .values({ fromUserId, toUserId, status: "pending" })
      .returning();
    return request;
  }

  async getFriendRequest(id: number): Promise<FriendRequest | undefined> {
    const [request] = await db.select().from(friendRequests).where(eq(friendRequests.id, id));
    return request;
  }

  async getExistingFriendRequest(fromUserId: string, toUserId: string): Promise<FriendRequest | undefined> {
    const [request] = await db.select().from(friendRequests)
      .where(
        or(
          and(eq(friendRequests.fromUserId, fromUserId), eq(friendRequests.toUserId, toUserId)),
          and(eq(friendRequests.fromUserId, toUserId), eq(friendRequests.toUserId, fromUserId))
        )
      );
    return request;
  }

  async getFriendRequests(userId: string): Promise<(FriendRequest & { fromUser: User })[]> {
    const results = await db.select({
      request: friendRequests,
      fromUser: users,
    })
    .from(friendRequests)
    .innerJoin(users, eq(friendRequests.fromUserId, users.id))
    .where(and(eq(friendRequests.toUserId, userId), eq(friendRequests.status, "pending")));

    return results.map(r => ({ ...r.request, fromUser: r.fromUser }));
  }

  async acceptFriendRequest(requestId: number): Promise<void> {
    const request = await this.getFriendRequest(requestId);
    if (!request) throw new Error("Request not found");

    await db.transaction(async (tx) => {
      await tx.insert(friends).values([
        { userId: request.fromUserId, friendId: request.toUserId },
        { userId: request.toUserId, friendId: request.fromUserId },
      ]);
      await tx.delete(friendRequests).where(eq(friendRequests.id, requestId));
    });
  }

  async rejectFriendRequest(requestId: number): Promise<void> {
    await db.delete(friendRequests).where(eq(friendRequests.id, requestId));
  }

  async getFriends(userId: string): Promise<(Friend & { friend: User })[]> {
    const results = await db.select({
      friendship: friends,
      user: users,
    })
    .from(friends)
    .innerJoin(users, eq(friends.friendId, users.id))
    .where(eq(friends.userId, userId));

    return results.map(r => ({ ...r.friendship, friend: r.user }));
  }

  async isFriend(userId1: string, userId2: string): Promise<boolean> {
    const [friendship] = await db.select().from(friends)
      .where(and(eq(friends.userId, userId1), eq(friends.friendId, userId2)));
    return !!friendship;
  }

  async saveMessage(fromUserId: string, toUserId: string, content: string): Promise<Message> {
    const [message] = await db.insert(messages)
      .values({ fromUserId, toUserId, content })
      .returning();
    return message;
  }

  async getMessageHistory(userId1: string, userId2: string): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(
        or(
          and(eq(messages.fromUserId, userId1), eq(messages.toUserId, userId2)),
          and(eq(messages.fromUserId, userId2), eq(messages.toUserId, userId1))
        )
      )
      .orderBy(messages.createdAt);
  }
}

export const storage = new DatabaseStorage();
