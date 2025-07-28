-- Clear all data from existing tables (keeping schema intact)
-- This preserves Prisma migrations but removes all user data

-- Delete in order to respect foreign key constraints
DELETE FROM training_data;
DELETE FROM quality_reports;
DELETE FROM psychology_profiles;
DELETE FROM context_enhancements;
DELETE FROM vision_analysis_cache;
DELETE FROM task_assignments;
DELETE FROM generated_tasks;
DELETE FROM interactions;
DELETE FROM screenshots;
DELETE FROM session_archives;
DELETE FROM unified_sessions;
DELETE FROM system_config;

-- Verify tables are empty
SELECT 'unified_sessions' as table_name, COUNT(*) as count FROM unified_sessions
UNION ALL
SELECT 'interactions', COUNT(*) FROM interactions
UNION ALL
SELECT 'screenshots', COUNT(*) FROM screenshots
UNION ALL
SELECT 'training_data', COUNT(*) FROM training_data
UNION ALL
SELECT 'vision_analysis_cache', COUNT(*) FROM vision_analysis_cache
UNION ALL
SELECT 'generated_tasks', COUNT(*) FROM generated_tasks;