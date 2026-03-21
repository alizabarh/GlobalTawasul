require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Database = require('better-sqlite3');

const app = express();
const port = process.env.PORT || 3000;

const databaseUrl = process.env.DATABASE_URL || '';
const requiredApiKey = (process.env.API_KEY || '').trim();

// PostgreSQL pool (for production)
const pool = databaseUrl && !databaseUrl.includes('sqlite')
    ? new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
    })
    : null;

// SQLite database (for local development)
let sqliteDb = null;
if (!pool) {
    sqliteDb = new Database('globaltawasul.db');
    console.log('Using SQLite database: globaltawasul.db');
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

function hasValidApiKey(req) {
    if (!requiredApiKey) return true;

    const fromHeader = (req.headers['x-api-key'] || '').trim();
    const authHeader = (req.headers.authorization || '').trim();
    const fromBearer = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';

    return fromHeader === requiredApiKey || fromBearer === requiredApiKey;
}

function requireApiKey(req, res, next) {
    if (!hasValidApiKey(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
}

async function initDb() {
    // PostgreSQL initialization (Supabase)
    if (pool) {
        console.log('Initializing PostgreSQL database...');
        
        // Create tables if they don't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                bio TEXT DEFAULT '',
                avatar_url TEXT,
                cover_url TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS followers (
                id SERIAL PRIMARY KEY,
                follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status TEXT DEFAULT 'accepted',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(follower_id, following_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                read_at TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                image_url TEXT,
                likes INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_state (
                state_key TEXT PRIMARY KEY,
                state_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('PostgreSQL tables created successfully');
        return;
    }

    // SQLite initialization
    if (sqliteDb) {
        sqliteDb.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                bio TEXT DEFAULT '',
                avatar_url TEXT,
                cover_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS followers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status TEXT DEFAULT 'accepted',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(follower_id, following_id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                read_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                image_url TEXT,
                likes INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS app_state (
                state_key TEXT PRIMARY KEY,
                state_json TEXT NOT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert demo users if none exist
        const count = sqliteDb.prepare('SELECT COUNT(*) as count FROM users').get();
        if (count.count === 0) {
            const insert = sqliteDb.prepare(`
                INSERT INTO users (email, name, username, bio, avatar_url) VALUES
                (?, ?, ?, ?, ?)
            `);
            const users = [
                ['user1@example.com', 'أحمد محمد', 'ahmed_m', 'مطور ويب ومتحمس للتقنية', 'https://i.pravatar.cc/150?img=1'],
                ['user2@example.com', 'سارة أحمد', 'sara_ahmed', 'مصممة جرافيك وأحب الفن', 'https://i.pravatar.cc/150?img=5'],
                ['user3@example.com', 'محمد علي', 'mohammed_a', 'صحفي وكاتب محتوى', 'https://i.pravatar.cc/150?img=3'],
                ['user4@example.com', 'فاطمة حسن', 'fatima_h', 'طالبة علوم حاسوب', 'https://i.pravatar.cc/150?img=9'],
                ['user5@example.com', 'عمر خالد', 'omar_k', 'مدون تقني', 'https://i.pravatar.cc/150?img=11']
            ];
            for (const user of users) {
                insert.run(...user);
            }
            console.log('Demo users created in SQLite');
        }
        return;
    }

    // PostgreSQL initialization
    if (!pool) {
        console.warn('DATABASE_URL is not set. Running without remote DB.');
        return;
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            name VARCHAR(100) NOT NULL,
            username VARCHAR(50) UNIQUE NOT NULL,
            bio TEXT DEFAULT '',
            avatar_url TEXT,
            cover_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS followers (
            id SERIAL PRIMARY KEY,
            follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) DEFAULT 'accepted',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(follower_id, following_id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            read_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS posts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            image_url TEXT,
            likes INTEGER DEFAULT 0,
            comments INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS app_state (
            state_key TEXT PRIMARY KEY,
            state_json JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    const usersExist = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersExist.rows[0].count) === 0) {
        await pool.query(`
            INSERT INTO users (email, name, username, bio, avatar_url) VALUES
            ('user1@example.com', 'أحمد محمد', 'ahmed_m', 'مطور ويب ومتحمس للتقنية', 'https://i.pravatar.cc/150?img=1'),
            ('user2@example.com', 'سارة أحمد', 'sara_ahmed', 'مصممة جرافيك وأحب الفن', 'https://i.pravatar.cc/150?img=5'),
            ('user3@example.com', 'محمد علي', 'mohammed_a', 'صحفي وكاتب محتوى', 'https://i.pravatar.cc/150?img=3'),
            ('user4@example.com', 'فاطمة حسن', 'fatima_h', 'طالبة علوم حاسوب', 'https://i.pravatar.cc/150?img=9'),
            ('user5@example.com', 'عمر خالد', 'omar_k', 'مدون تقني', 'https://i.pravatar.cc/150?img=11');
        `);
        console.log('Demo users created in PostgreSQL');
    }
}

app.get('/health', async (_req, res) => {
    if (!pool) return res.status(200).send('OK');
    try {
        await pool.query('SELECT 1');
        return res.status(200).send('OK');
    } catch {
        return res.status(503).send('DB_NOT_READY');
    }
});

app.get('/social/state', requireApiKey, async (_req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });

    try {
        const result = await pool.query(
            'SELECT state_json FROM app_state WHERE state_key = $1',
            ['global']
        );

        if (!result.rows.length) return res.status(200).json({});
        return res.status(200).json(result.rows[0].state_json);
    } catch {
        return res.status(500).json({ error: 'Failed to load state' });
    }
});

async function saveState(req, res) {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });

    try {
        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        await pool.query(
            `
                INSERT INTO app_state (state_key, state_json, updated_at)
                VALUES ($1, $2::jsonb, NOW())
                ON CONFLICT (state_key)
                DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = NOW()
            `,
            ['global', JSON.stringify(payload)]
        );

        return res.status(200).json({ ok: true });
    } catch {
        return res.status(500).json({ error: 'Failed to save state' });
    }
}

app.put('/social/state', requireApiKey, saveState);

app.post('/social/state', requireApiKey, async (req, res) => {
    return saveState(req, res);
});

// Simple hash function (same as convex/auth.ts)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return "hash_" + Math.abs(hash).toString(16);
}

// Auth API - Register
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, username } = req.body;
    
    if (!email || !password || !name || !username) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    try {
        if (sqliteDb) {
            // Check if email exists
            const existingEmail = sqliteDb.prepare('SELECT id FROM users WHERE email = ?').get(email);
            if (existingEmail) {
                return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
            }

            // Check if username exists
            const existingUsername = sqliteDb.prepare('SELECT id FROM users WHERE username = ?').get(username);
            if (existingUsername) {
                return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
            }

            // Create user
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            const result = sqliteDb.prepare(`
                INSERT INTO users (email, password_hash, name, username, avatar_url)
                VALUES (?, ?, ?, ?, ?)
            `).run(email, hashPassword(password), name, username, avatarUrl);

            return res.status(201).json({
                userId: result.lastInsertRowid,
                email,
                name,
                username,
                avatarUrl
            });
        }

        if (pool) {
            // Check if email exists
            const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            if (existingEmail.rows.length) {
                return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
            }

            // Check if username exists
            const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
            if (existingUsername.rows.length) {
                return res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' });
            }

            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            const result = await pool.query(`
                INSERT INTO users (email, password_hash, name, username, avatar_url)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, email, name, username, avatar_url
            `, [email, hashPassword(password), name, username, avatarUrl]);

            return res.status(201).json(result.rows[0]);
        }

        return res.status(503).json({ error: 'Database is not configured' });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب' });
    }
});

// Auth API - Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    try {
        if (sqliteDb) {
            const user = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
            
            if (!user) {
                return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            }

            const hashedInput = hashPassword(password);
            if (user.password_hash !== hashedInput) {
                return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            }

            return res.json({
                userId: user.id,
                email: user.email,
                name: user.name,
                username: user.username,
                avatarUrl: user.avatar_url
            });
        }

        if (pool) {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = result.rows[0];

            if (!user) {
                return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            }

            const hashedInput = hashPassword(password);
            if (user.password_hash !== hashedInput) {
                return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            }

            return res.json({
                userId: user.id,
                email: user.email,
                name: user.name,
                username: user.username,
                avatarUrl: user.avatar_url
            });
        }

        return res.status(503).json({ error: 'Database is not configured' });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
    }
});

// Users API
app.get('/api/users', async (_req, res) => {
    try {
        if (sqliteDb) {
            const users = sqliteDb.prepare(`
                SELECT u.id, u.name, u.username, u.bio, u.avatar_url, u.cover_url,
                       (SELECT COUNT(*) FROM followers WHERE following_id = u.id AND status = 'accepted') as followers_count,
                       (SELECT COUNT(*) FROM followers WHERE follower_id = u.id AND status = 'accepted') as following_count
                FROM users u
                ORDER BY u.created_at DESC
            `).all();
            return res.json(users);
        }
        if (!pool) return res.status(503).json({ error: 'Database is not configured' });
        const result = await pool.query(`
            SELECT u.id, u.name, u.username, u.bio, u.avatar_url, u.cover_url,
                   (SELECT COUNT(*) FROM followers WHERE following_id = u.id AND status = 'accepted') as followers_count,
                   (SELECT COUNT(*) FROM followers WHERE follower_id = u.id AND status = 'accepted') as following_count
            FROM users u
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.username, u.bio, u.avatar_url, u.cover_url,
                   (SELECT COUNT(*) FROM followers WHERE following_id = u.id AND status = 'accepted') as followers_count,
                   (SELECT COUNT(*) FROM followers WHERE follower_id = u.id AND status = 'accepted') as following_count
            FROM users u WHERE u.id = $1
        `, [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Followers API
app.get('/api/followers/:userId', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.username, u.avatar_url, f.status, f.created_at
            FROM followers f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = $1 AND f.status = 'accepted'
            ORDER BY f.created_at DESC
        `, [req.params.userId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/following/:userId', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.username, u.avatar_url, f.status, f.created_at
            FROM followers f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = $1 AND f.status = 'accepted'
            ORDER BY f.created_at DESC
        `, [req.params.userId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/follow-requests/:userId', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    try {
        const result = await pool.query(`
            SELECT u.id, u.name, u.username, u.avatar_url, f.id as request_id, f.created_at
            FROM followers f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = $1 AND f.status = 'pending'
            ORDER BY f.created_at DESC
        `, [req.params.userId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/follow', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    const { followerId, followingId } = req.body;
    if (!followerId || !followingId) return res.status(400).json({ error: 'Missing IDs' });
    try {
        await pool.query(`
            INSERT INTO followers (follower_id, following_id, status)
            VALUES ($1, $2, 'pending')
            ON CONFLICT (follower_id, following_id) DO NOTHING
        `, [followerId, followingId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/follow/accept', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    const { followerId, followingId } = req.body;
    try {
        await pool.query(`
            UPDATE followers SET status = 'accepted'
            WHERE follower_id = $1 AND following_id = $2
        `, [followerId, followingId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/follow/reject', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    const { followerId, followingId } = req.body;
    try {
        await pool.query(`
            DELETE FROM followers
            WHERE follower_id = $1 AND following_id = $2
        `, [followerId, followingId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/unfollow', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    const { followerId, followingId } = req.body;
    try {
        await pool.query(`
            DELETE FROM followers
            WHERE follower_id = $1 AND following_id = $2
        `, [followerId, followingId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Messages API
app.get('/api/conversations/:userId', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (other_user_id)
                u.id as other_user_id,
                u.name,
                u.username,
                u.avatar_url,
                m.content as last_message,
                m.created_at as last_message_time,
                (SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND sender_id = u.id AND read_at IS NULL) as unread_count
            FROM (
                SELECT sender_id as other_id FROM messages WHERE receiver_id = $1
                UNION
                SELECT receiver_id as other_id FROM messages WHERE sender_id = $1
            ) conv
            JOIN users u ON u.id = conv.other_id
            LEFT JOIN messages m ON (
                (m.sender_id = $1 AND m.receiver_id = u.id) OR
                (m.receiver_id = $1 AND m.sender_id = u.id)
            ) AND m.id = (
                SELECT id FROM messages
                WHERE (sender_id = $1 AND receiver_id = u.id) OR (receiver_id = $1 AND sender_id = u.id)
                ORDER BY created_at DESC LIMIT 1
            )
            ORDER BY u.id, m.created_at DESC
        `, [req.params.userId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/messages/:userId/:otherId', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    try {
        const result = await pool.query(`
            SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
            ORDER BY m.created_at ASC
        `, [req.params.userId, req.params.otherId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/messages', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    const { senderId, receiverId, content } = req.body;
    if (!senderId || !receiverId || !content) return res.status(400).json({ error: 'Missing data' });
    try {
        const result = await pool.query(`
            INSERT INTO messages (sender_id, receiver_id, content)
            VALUES ($1, $2, $3) RETURNING *
        `, [senderId, receiverId, content]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/messages/read', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    const { userId, senderId } = req.body;
    try {
        await pool.query(`
            UPDATE messages SET read_at = NOW()
            WHERE receiver_id = $1 AND sender_id = $2 AND read_at IS NULL
        `, [userId, senderId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Posts API
app.get('/api/posts', async (_req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    try {
        const result = await pool.query(`
            SELECT p.*, u.name as author_name, u.username as author_username, u.avatar_url as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/posts/user/:userId', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    try {
        const result = await pool.query(`
            SELECT p.*, u.name as author_name, u.username as author_username, u.avatar_url as author_avatar
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC
        `, [req.params.userId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/posts', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database is not configured' });
    const { userId, content, imageUrl } = req.body;
    if (!userId || !content) return res.status(400).json({ error: 'Missing data' });
    try {
        const result = await pool.query(`
            INSERT INTO posts (user_id, content, image_url)
            VALUES ($1, $2, $3) RETURNING *
        `, [userId, content, imageUrl]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/login', (_req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/logout', (_req, res) => {
    res.redirect('/login');
});

app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

initDb()
    .then(() => {
        app.listen(port, () => {
            if (pool) {
                console.log(`GlobalTawasul server running on port ${port} (with database)`);
            } else {
                console.log(`GlobalTawasul server running on port ${port} (local mode)`);
            }
        });
    })
    .catch((error) => {
        console.warn('Database initialization failed:', error.message);
        console.log('Starting server in local mode...');
        app.listen(port, () => {
            console.log(`GlobalTawasul server running on port ${port} (local mode)`);
        });
    });
