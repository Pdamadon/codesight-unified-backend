"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = void 0;
const database_1 = __importDefault(require("../database"));
async function runMigrations() {
    try {
        console.log('🔄 Running database migrations...');
        await database_1.default.query(`
      CREATE TABLE IF NOT EXISTS workers (
        id SERIAL PRIMARY KEY,
        worker_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        paypal_email VARCHAR(255),
        worker_data JSONB,
        demographics JSONB,
        tech_setup JSONB,
        consent_given BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'onboarding',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Workers table created');
        await database_1.default.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        worker_id VARCHAR(255) REFERENCES workers(worker_id),
        session_data JSONB,
        video_url VARCHAR(500),
        audio_url VARCHAR(500),
        transcription TEXT,
        analysis JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Sessions table created');
        await database_1.default.query(`
      CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
      CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_worker_id ON sessions(worker_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    `);
        console.log('✅ Indexes created');
        await database_1.default.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
        await database_1.default.query(`
      DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
      CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
      DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
      CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
        console.log('✅ Triggers created');
        await database_1.default.query(`
      CREATE TABLE IF NOT EXISTS extension_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        worker_id VARCHAR(255) REFERENCES workers(worker_id),
        status VARCHAR(50) DEFAULT 'active',
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        total_events INTEGER DEFAULT 0,
        user_agent TEXT,
        extension_data JSONB,
        session_summary JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Extension sessions table created');
        await database_1.default.query(`
      CREATE TABLE IF NOT EXISTS extension_events (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) REFERENCES extension_sessions(session_id),
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Extension events table created');
        await database_1.default.query(`
      CREATE INDEX IF NOT EXISTS idx_extension_sessions_session_id ON extension_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_extension_sessions_worker_id ON extension_sessions(worker_id);
      CREATE INDEX IF NOT EXISTS idx_extension_sessions_status ON extension_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_extension_events_session_id ON extension_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_extension_events_type ON extension_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_extension_events_timestamp ON extension_events(timestamp);
    `);
        console.log('✅ Extension indexes created');
        await database_1.default.query(`
      DROP TRIGGER IF EXISTS update_extension_sessions_updated_at ON extension_sessions;
      CREATE TRIGGER update_extension_sessions_updated_at BEFORE UPDATE ON extension_sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
        console.log('✅ Extension triggers created');
        return { success: true, message: 'All migrations completed successfully' };
    }
    catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    }
}
exports.runMigrations = runMigrations;
//# sourceMappingURL=migrate.js.map