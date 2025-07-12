"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('connect', () => {
    console.log('🗄️  Database connected');
});
pool.on('error', (err) => {
    console.error('Database error:', err);
});
exports.default = pool;
//# sourceMappingURL=database.js.map