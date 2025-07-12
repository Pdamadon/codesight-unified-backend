-- Extension session tracking tables
-- Created: 2025-07-12

-- Extension sessions table
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

-- Extension events table
CREATE TABLE IF NOT EXISTS extension_events (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES extension_sessions(session_id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_extension_sessions_session_id ON extension_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_extension_sessions_worker_id ON extension_sessions(worker_id);
CREATE INDEX IF NOT EXISTS idx_extension_sessions_status ON extension_sessions(status);
CREATE INDEX IF NOT EXISTS idx_extension_events_session_id ON extension_events(session_id);
CREATE INDEX IF NOT EXISTS idx_extension_events_type ON extension_events(event_type);
CREATE INDEX IF NOT EXISTS idx_extension_events_timestamp ON extension_events(timestamp);

-- Add updated_at trigger for extension_sessions
CREATE TRIGGER update_extension_sessions_updated_at BEFORE UPDATE ON extension_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();