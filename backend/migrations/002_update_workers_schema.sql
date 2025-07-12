-- Update workers table schema to match frontend API
-- Created: 2025-07-12

-- Add new columns for the updated worker registration
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS paypal_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS worker_data JSONB;

-- Update the workers table structure to be more flexible
-- The worker_data JSONB field will contain: firstName, lastName, age, country, experience, timezone, availability

-- We'll keep the existing columns for backward compatibility but use the new structure going forward