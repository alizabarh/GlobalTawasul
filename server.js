const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

const databaseUrl = process.env.DATABASE_URL || '';
const requiredApiKey = (process.env.API_KEY || '').trim();

const pool = databaseUrl
    ? new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
    })
    : null;

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
    if (!pool) {
        console.warn('DATABASE_URL is not set. Running without remote DB.');
        return;
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS app_state (
            state_key TEXT PRIMARY KEY,
            state_json JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
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

app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

initDb()
    .then(() => {
        app.listen(port, () => {
            console.log(`GlobalTawasul server running on port ${port}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize database:', error.message);
        process.exit(1);
    });
