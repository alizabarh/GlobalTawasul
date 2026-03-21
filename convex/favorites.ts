import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all favorites for a user
export const getUserFavorites = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const favorites = await ctx.db
            .query("favorites")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();

        // Get post details for each favorite
        const favoritesWithPosts = await Promise.all(
            favorites.map(async (fav) => {
                const post = await ctx.db.get(fav.postId);
                if (!post) return null;
                
                const user = await ctx.db.get(post.userId);
                return {
                    ...fav,
                    post,
                    authorName: user?.name || "",
                    authorUsername: user?.username || "",
                    authorAvatar: user?.avatarUrl || "",
                };
            })
        );

        return favoritesWithPosts.filter(Boolean);
    },
});

// Check if a post is favorited by a user
export const isFavorited = query({
    args: { userId: v.id("users"), postId: v.id("posts") },
    handler: async (ctx, { userId, postId }) => {
        const favorite = await ctx.db
            .query("favorites")
            .withIndex("by_user_post", (q) => q.eq("userId", userId).eq("postId", postId))
            .first();
        return !!favorite;
    },
});

// Add to favorites
export const addFavorite = mutation({
    args: { userId: v.id("users"), postId: v.id("posts") },
    handler: async (ctx, { userId, postId }) => {
        // Check if already favorited
        const existing = await ctx.db
            .query("favorites")
            .withIndex("by_user_post", (q) => q.eq("userId", userId).eq("postId", postId))
            .first();

        if (existing) {
            throw new Error("الم منشور مضاف للمفضلة سابقاً");
        }

        const favoriteId = await ctx.db.insert("favorites", {
            userId,
            postId,
            createdAt: Date.now(),
        });

        return favoriteId;
    },
});

// Remove from favorites
export const removeFavorite = mutation({
    args: { userId: v.id("users"), postId: v.id("posts") },
    handler: async (ctx, { userId, postId }) => {
        const favorite = await ctx.db
            .query("favorites")
            .withIndex("by_user_post", (q) => q.eq("userId", userId).eq("postId", postId))
            .first();

        if (!favorite) {
            throw new Error("الم منشور في المفضلة");
        }

        await ctx.db.delete(favorite._id);
        return true;
    },
});

// Toggle favorite
export const toggleFavorite = mutation({
    args: { userId: v.id("users"), postId: v.id("posts") },
    handler: async (ctx, { userId, postId }) => {
        const existing = await ctx.db
            .query("favorites")
            .withIndex("by_user_post", (q) => q.eq("userId", userId).eq("postId", postId))
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { favorited: false };
        } else {
            await ctx.db.insert("favorites", {
                userId,
                postId,
                createdAt: Date.now(),
            });
            return { favorited: true };
        }
    },
});