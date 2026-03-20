import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get conversations for a user
export const getConversations = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        // Get all messages where user is sender or receiver
        const sent = await ctx.db
            .query("messages")
            .withIndex("by_sender", (q) => q.eq("senderId", userId))
            .collect();

        const received = await ctx.db
            .query("messages")
            .withIndex("by_receiver", (q) => q.eq("receiverId", userId))
            .collect();

        const allMessages = [...sent, ...received];

        // Group by conversation
        const conversations = new Map();

        for (const msg of allMessages) {
            const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;

            if (!conversations.has(otherId)) {
                const otherUser = await ctx.db.get(otherId);
                conversations.set(otherId, {
                    otherUser,
                    lastMessage: msg,
                    unreadCount: 0,
                });
            }

            const conv = conversations.get(otherId);
            if (msg.createdAt > conv.lastMessage.createdAt) {
                conv.lastMessage = msg;
            }

            if (msg.receiverId === userId && !msg.readAt) {
                conv.unreadCount++;
            }
        }

        return Array.from(conversations.values());
    },
});

// Get messages between two users
export const getMessages = query({
    args: {
        userId: v.id("users"),
        otherId: v.id("users"),
    },
    handler: async (ctx, { userId, otherId }) => {
        const sent = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
                q.eq("senderId", userId).eq("receiverId", otherId)
            )
            .collect();

        const received = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
                q.eq("senderId", otherId).eq("receiverId", userId)
            )
            .collect();

        const messages = [...sent, ...received].sort((a, b) => a.createdAt - b.createdAt);

        return messages;
    },
});

// Send message
export const send = mutation({
    args: {
        senderId: v.id("users"),
        receiverId: v.id("users"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const messageId = await ctx.db.insert("messages", {
            ...args,
            createdAt: Date.now(),
            readAt: undefined,
        });
        return messageId;
    },
});

// Mark messages as read
export const markRead = mutation({
    args: {
        userId: v.id("users"),
        senderId: v.id("users"),
    },
    handler: async (ctx, { userId, senderId }) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
                q.eq("senderId", senderId).eq("receiverId", userId)
            )
            .collect();

        for (const msg of messages) {
            if (!msg.readAt) {
                await ctx.db.patch(msg._id, { readAt: Date.now() });
            }
        }

        return true;
    },
});
