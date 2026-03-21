import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple hash function (in production, use bcrypt or similar)
function hashPassword(password: string): string {
    // This is a simple hash for demonstration
    // In production, use a proper hashing library
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return "hash_" + Math.abs(hash).toString(16);
}

// Register new user
export const register = mutation({
    args: {
        email: v.string(),
        password: v.string(),
        name: v.string(),
        username: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if email already exists
        const existingByEmail = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existingByEmail) {
            throw new Error("البريد الإلكتروني مستخدم بالفعل");
        }

        // Check if username already exists
        const existingByUsername = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .first();

        if (existingByUsername) {
            throw new Error("اسم المستخدم مستخدم بالفعل");
        }

        // Create user with hashed password
        const userId = await ctx.db.insert("users", {
            email: args.email,
            passwordHash: hashPassword(args.password),
            name: args.name,
            username: args.username,
            bio: "",
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(args.name)}&background=random`,
            coverUrl: "",
            createdAt: Date.now(),
        });

        return { userId, email: args.email, name: args.name, username: args.username };
    },
});

// Login user
export const login = mutation({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        // Find user by email
        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (!user) {
            throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }

        // Check if user has a password (some users might be OAuth only)
        if (!user.passwordHash) {
            throw new Error("يرجى استخدام تسجيل الدخول الاجتماعي");
        }

        // Verify password
        const hashedInput = hashPassword(args.password);
        if (user.passwordHash !== hashedInput) {
            throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }

        // Return user info (excluding password)
        return {
            userId: user._id,
            email: user.email,
            name: user.name,
            username: user.username,
            avatarUrl: user.avatarUrl,
        };
    },
});

// Get current user by ID
export const getCurrentUser = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        // Return user without password
        return {
            userId: user._id,
            email: user.email,
            name: user.name,
            username: user.username,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            coverUrl: user.coverUrl,
            createdAt: user.createdAt,
        };
    },
});

// Verify user credentials (for session validation)
export const verifySession = query({
    args: {
        userId: v.id("users"),
        email: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user || user.email !== args.email) {
            return null;
        }
        return {
            userId: user._id,
            email: user.email,
            name: user.name,
            username: user.username,
            avatarUrl: user.avatarUrl,
        };
    },
});
