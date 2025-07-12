import pool from '../database';

export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Create workers table with all required columns
    await pool.query(`
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
    
    // Create sessions table
    await pool.query(`
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
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
      CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
      CREATE INDEX IF NOT EXISTS idx_sessions_worker_id ON sessions(worker_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    `);
    console.log('✅ Indexes created');
    
    // Create or replace trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Add triggers
    await pool.query(`
      DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
      CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
      DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
      CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Triggers created');
    
    return { success: true, message: 'All migrations completed successfully' };
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}