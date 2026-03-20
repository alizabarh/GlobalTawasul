import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all users
export const getAll = query({
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        return users;
    },
});

// Get user by ID
export const getById = query({
    args: { id: v.id("users") },
    handler: async (ctx, { id }) => {
        const user = await ctx.db.get(id);
        if (!user) return null;

        // Get followers and following counts
        const followers = await ctx.db
            .query("followers")
            .withIndex("by_following", (q) => q.eq("followingId", id).eq("status", "accepted"))
            .collect();

        const following = await ctx.db
            .query("followers")
            .withIndex("by_follower", (q) => q.eq("followerId", id).eq("status", "accepted"))
            .collect();

        return {
            ...user,
            followersCount: followers.length,
            followingCount: following.length,
        };
    },
});

// Create user
export const create = mutation({
    args: {
        email: v.string(),
        name: v.string(),
        username: v.string(),
        bio: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await ctx.db.insert("users", {
            ...args,
            bio: args.bio || "",
            avatarUrl: args.avatarUrl || "",
            coverUrl: "",
            createdAt: Date.now(),
        });
        return userId;
    },
});

// Update user
export const update = mutation({
    args: {
        id: v.id("users"),
        name: v.optional(v.string()),
        bio: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        coverUrl: v.optional(v.string()),
    },
    handler: async (ctx, { id, ...updates }) => {
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});
