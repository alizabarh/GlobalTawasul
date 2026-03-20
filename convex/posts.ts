import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get all posts
export const getAll = query({
    handler: async (ctx) => {
        const posts = await ctx.db
            .query("posts")
            .withIndex("by_created", (q) => q.desc())
            .take(100);

        // Get user info for each post
        const postsWithUsers = await Promise.all(
            posts.map(async (post) => {
                const user = await ctx.db.get(post.userId);
                return {
                    ...post,
                    authorName: user?.name || "",
                    authorUsername: user?.username || "",
                    authorAvatar: user?.avatarUrl || "",
                };
            })
        );

        return postsWithUsers;
    },
});

// Get posts by user
export const getByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        const posts = await ctx.db
            .query("posts")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(100);

        const user = await ctx.db.get(userId);

        return posts.map((post) => ({
            ...post,
            authorName: user?.name || "",
            authorUsername: user?.username || "",
            authorAvatar: user?.avatarUrl || "",
        }));
    },
});

// Create post
export const create = mutation({
    args: {
        userId: v.id("users"),
        content: v.string(),
        imageUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const postId = await ctx.db.insert("posts", {
            ...args,
            imageUrl: args.imageUrl || "",
            likes: 0,
            comments: 0,
            createdAt: Date.now(),
        });
        return postId;
    },
});

// Like post
export const like = mutation({
    args: { postId: v.id("posts") },
    handler: async (ctx, { postId }) => {
        const post = await ctx.db.get(postId);
        if (!post) throw new Error("Post not found");

        await ctx.db.patch(postId, { likes: post.likes + 1 });
        return post.likes + 1;
    },
});
