import { internalMutation } from "./_generated/server";

export const seedUsers = internalMutation({
    handler: async (ctx) => {
        // Check if users already exist
        const existing = await ctx.db.query("users").collect();
        if (existing.length > 0) {
            console.log("Users already exist, skipping seed");
            return;
        }

        const users = [
            {
                email: "user1@example.com",
                passwordHash: "hashed_password_123",
                name: "أحمد محمد",
                username: "ahmed_m",
                bio: "مطور ويب ومتحمس للتقنية",
                avatarUrl: "https://i.pravatar.cc/150?img=1",
                coverUrl: "",
                createdAt: Date.now(),
            },
            {
                email: "user2@example.com",
                passwordHash: "hashed_password_123",
                name: "سارة أحمد",
                username: "sara_ahmed",
                bio: "مصممة جرافيك وأحب الفن",
                avatarUrl: "https://i.pravatar.cc/150?img=5",
                coverUrl: "",
                createdAt: Date.now(),
            },
            {
                email: "user3@example.com",
                passwordHash: "hashed_password_123",
                name: "محمد علي",
                username: "mohammed_a",
                bio: "صحفي وكاتب محتوى",
                avatarUrl: "https://i.pravatar.cc/150?img=3",
                coverUrl: "",
                createdAt: Date.now(),
            },
            {
                email: "user4@example.com",
                passwordHash: "hashed_password_123",
                name: "فاطمة حسن",
                username: "fatima_h",
                bio: "طالبة علوم حاسوب",
                avatarUrl: "https://i.pravatar.cc/150?img=9",
                coverUrl: "",
                createdAt: Date.now(),
            },
            {
                email: "user5@example.com",
                passwordHash: "hashed_password_123",
                name: "عمر خالد",
                username: "omar_k",
                bio: "مدون تقني",
                avatarUrl: "https://i.pravatar.cc/150?img=11",
                coverUrl: "",
                createdAt: Date.now(),
            },
        ];

        for (const user of users) {
            await ctx.db.insert("users", user);
        }

        console.log(`Seeded ${users.length} users`);
    },
});
