-- Add screenshots table for extension screenshot storage
-- Created: 2025-07-13

-- Screenshots table
CREATE TABLE IF NOT EXISTS extension_screenshots (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES extension_sessions(session_id),
    screenshot_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    viewport_data JSONB,
    file_url TEXT, -- S3 URL for the screenshot file
    file_size INTEGER,
    tab_id INTEGER,
    tab_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_extension_screenshots_session_id ON extension_screenshots(session_id);
CREATE INDEX IF NOT EXISTS idx_extension_screenshots_screenshot_id ON extension_screenshots(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_extension_screenshots_event_type ON extension_screenshots(event_type);
CREATE INDEX IF NOT EXISTS idx_extension_screenshots_timestamp ON extension_screenshots(timestamp);