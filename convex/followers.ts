import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get followers of a user
export const getFollowers = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const followers = await ctx.db
            .query("followers")
            .withIndex("by_following", (q) => q.eq("followingId", userId).eq("status", "accepted"))
            .collect();

        const followersWithUsers = await Promise.all(
            followers.map(async (f) => {
                const user = await ctx.db.get(f.followerId);
                return {
                    ...f,
                    user,
                };
            })
        );

        return followersWithUsers;
    },
});

// Get who a user is following
export const getFollowing = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const following = await ctx.db
            .query("followers")
            .withIndex("by_follower", (q) => q.eq("followerId", userId).eq("status", "accepted"))
            .collect();

        const followingWithUsers = await Promise.all(
            following.map(async (f) => {
                const user = await ctx.db.get(f.followingId);
                return {
                    ...f,
                    user,
                };
            })
        );

        return followingWithUsers;
    },
});

// Get follow requests
export const getRequests = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const requests = await ctx.db
            .query("followers")
            .withIndex("by_status", (q) => q.eq("followingId", userId).eq("status", "pending"))
            .collect();

        const requestsWithUsers = await Promise.all(
            requests.map(async (r) => {
                const user = await ctx.db.get(r.followerId);
                return {
                    ...r,
                    user,
                };
            })
        );

        return requestsWithUsers;
    },
});

// Follow user
export const follow = mutation({
    args: {
        followerId: v.id("users"),
        followingId: v.id("users"),
    },
    handler: async (ctx, { followerId, followingId }) => {
        // Check if already following
        const existing = await ctx.db
            .query("followers")
            .withIndex("by_follower", (q) =>
                q.eq("followerId", followerId).eq("followingId", followingId)
            )
            .first();

        if (existing) return existing._id;

        const requestId = await ctx.db.insert("followers", {
            followerId,
            followingId,
            status: "pending",
            createdAt: Date.now(),
        });

        return requestId;
    },
});

// Accept follow request
export const accept = mutation({
    args: {
        followerId: v.id("users"),
        followingId: v.id("users"),
    },
    handler: async (ctx, { followerId, followingId }) => {
        const request = await ctx.db
            .query("followers")
            .withIndex("by_follower", (q) =>
                q.eq("followerId", followerId).eq("followingId", followingId)
            )
            .first();

        if (!request) throw new Error("Request not found");

        await ctx.db.patch(request._id, { status: "accepted" });
        return true;
    },
});

// Unfollow
export const unfollow = mutation({
    args: {
        followerId: v.id("users"),
        followingId: v.id("users"),
    },
    handler: async (ctx, { followerId, followingId }) => {
        const request = await ctx.db
            .query("followers")
            .withIndex("by_follower", (q) =>
                q.eq("followerId", followerId).eq("followingId", followingId)
            )
            .first();

        if (request) {
            await ctx.db.delete(request._id);
        }

        return true;
    },
});
