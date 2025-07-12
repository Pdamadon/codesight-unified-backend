-- Initial schema for CodeSight Research Platform
-- Created: 2025-07-12

-- Workers table for managing research participants
CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    demographics JSONB,
    tech_setup JSONB,
    consent_given BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'onboarding',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for recording sessions
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_sessions_worker_id ON sessions(worker_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();