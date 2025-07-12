import pool from '../database';
import fs from 'fs';
import path from 'path';

export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Read and execute initial schema
    const initialSchema = fs.readFileSync(
      path.join(__dirname, '../../migrations/001_initial_schema.sql'),
      'utf8'
    );
    await pool.query(initialSchema);
    console.log('✅ Initial schema created');
    
    // Read and execute update schema
    const updateSchema = fs.readFileSync(
      path.join(__dirname, '../../migrations/002_update_workers_schema.sql'),
      'utf8'
    );
    await pool.query(updateSchema);
    console.log('✅ Workers schema updated');
    
    return { success: true, message: 'All migrations completed successfully' };
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}