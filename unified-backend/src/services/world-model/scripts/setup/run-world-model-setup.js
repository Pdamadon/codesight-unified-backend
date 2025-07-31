/**
 * World Model Setup Runner with Environment Variables
 * 
 * Loads .env file and then runs the built setup tool
 */

import * as dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

console.log('🔧 Loading environment variables...');
console.log(`✅ MONGODB_CONNECTION_STRING: ${process.env.MONGODB_CONNECTION_STRING ? 'Loaded' : 'Missing'}`);
console.log(`✅ MONGODB_DATABASE_NAME: ${process.env.MONGODB_DATABASE_NAME || 'Using default'}`);
console.log('');

// Now import and run the setup
import('./dist/services/world-model/setup-world-model.js')
  .then(module => {
    const { WorldModelSetup } = module;
    const setup = new WorldModelSetup();
    return setup.setup();
  })
  .catch(error => {
    console.error('❌ Setup failed:', error.message);
    
    // Provide helpful debugging info
    if (error.message.includes('Invalid scheme')) {
      console.error('\n🔍 Debug Information:');
      console.error(`MONGODB_CONNECTION_STRING value: "${process.env.MONGODB_CONNECTION_STRING}"`);
      console.error(`Length: ${process.env.MONGODB_CONNECTION_STRING?.length || 0}`);
      console.error('\n💡 This error usually means the environment variable is empty or malformed.');
    }
    
    process.exit(1);
  });