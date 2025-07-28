-- Clear all data from tables (keeping schema intact)
-- This preserves Prisma migrations but removes all user data

-- Delete training data first (has foreign keys)
DELETE FROM training_data;

-- Delete session-related data
DELETE FROM enhanced_interactions;
DELETE FROM screenshots;
DELETE FROM unified_sessions;

-- Clear cache and analysis data
DELETE FROM analysis_cache;

-- Clear any other data tables (add as needed)
-- Note: This preserves the _prisma_migrations table automatically

-- Verify tables are empty
SELECT 'unified_sessions' as table_name, COUNT(*) as count FROM unified_sessions
UNION ALL
SELECT 'enhanced_interactions', COUNT(*) FROM enhanced_interactions  
UNION ALL
SELECT 'screenshots', COUNT(*) FROM screenshots
UNION ALL
SELECT 'training_data', COUNT(*) FROM training_data
UNION ALL
SELECT 'analysis_cache', COUNT(*) FROM analysis_cache;