import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        email: v.string(),
        passwordHash: v.optional(v.string()),
        name: v.string(),
        username: v.string(),
        bio: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        coverUrl: v.optional(v.string()),
        createdAt: v.number(),
    })
        .index("by_email", ["email"])
        .index("by_username", ["username"]),

    followers: defineTable({
        followerId: v.id("users"),
        followingId: v.id("users"),
        status: v.string(), // "pending" | "accepted"
        createdAt: v.number(),
    })
        .index("by_follower", ["followerId"])
        .index("by_following", ["followingId"])
        .index("by_status", ["followingId", "status"]),

    posts: defineTable({
        userId: v.id("users"),
        content: v.string(),
        imageUrl: v.optional(v.string()),
        likes: v.number(),
        comments: v.number(),
        createdAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_created", ["createdAt"]),

    messages: defineTable({
        senderId: v.id("users"),
        receiverId: v.id("users"),
        content: v.string(),
        createdAt: v.number(),
        readAt: v.optional(v.number()),
    })
        .index("by_sender", ["senderId"])
        .index("by_receiver", ["receiverId"])
        .index("by_conversation", ["senderId", "receiverId"]),

    favorites: defineTable({
        userId: v.id("users"),
        postId: v.id("posts"),
        createdAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_post", ["postId"])
        .index("by_user_post", ["userId", "postId"]),
});
