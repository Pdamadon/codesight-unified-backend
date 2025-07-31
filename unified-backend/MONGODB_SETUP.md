# MongoDB Atlas Setup Instructions

## Current Status
✅ **Code Implementation Complete**
- World Model database schema implemented
- MongoDB service class with full CRUD operations
- Category and product sibling discovery
- Training data ingestion pipeline
- Setup and testing scripts

⚠️ **Connection Issue**
- DNS resolution failing for: `cluster0.ksyy5.mongodb.net`
- Need to verify MongoDB Atlas cluster configuration

## Steps to Complete Setup

### 1. Verify MongoDB Atlas Cluster
1. Log into MongoDB Atlas dashboard
2. Ensure cluster `Cluster0` exists and is running
3. Verify the connection string is correct
4. Check if the cluster is in the correct region

### 2. Network Access Configuration
1. In MongoDB Atlas dashboard, go to Network Access
2. Add your current IP address to the IP Whitelist
3. Or add `0.0.0.0/0` for testing (not recommended for production)

### 3. Database User Setup
1. Go to Database Access in MongoDB Atlas
2. Ensure user `peteramadon` exists with correct password
3. Verify user has read/write permissions to the database

### 4. Test Connection
Once Atlas is properly configured, test with:

```bash
# Set the environment variable
export MONGODB_CONNECTION_STRING="mongodb+srv://peteramadon:Y7fCnAGdRQwGLmGr@cluster0.ksyy5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Run the setup script
npm run build
node dist/services/world-model/setup-world-model.js
```

### 5. Expected Output
When connection works, you should see:
```
🚀 Starting World Model Setup...
🔗 Testing MongoDB Atlas connection...
✅ Connected to MongoDB Atlas successfully
📊 Creating database indexes...
✅ Indexes created successfully
🧪 Testing basic operations...
✅ Basic operations test completed successfully
📊 World Model Stats:
   Domains: 1 (test domain created)
   Categories: 1
   Products: 2
   Ready for training data ingestion!
```

## Alternative: Local MongoDB for Testing

If Atlas connection continues to fail, you can test locally:

```bash
# Install and start local MongoDB
brew install mongodb/brew/mongodb-community
brew services start mongodb/brew/mongodb-community

# Use local connection string
export MONGODB_CONNECTION_STRING="mongodb://localhost:27017"
export MONGODB_DATABASE_NAME="world_model_test"

# Run setup
node dist/services/world-model/setup-world-model.js
```

## Code Architecture Summary

The world model system is now complete with:

### Database Schema (`schema.ts`)
- **WorldModelDomain**: Site-level configuration and patterns
- **WorldModelCategory**: Category hierarchies with sibling discovery
- **WorldModelProduct**: Products with variant clusters and discovery contexts

### Service Layer (`service.ts`)
- Full CRUD operations for domains, categories, products
- Sibling discovery and deduplication logic  
- Context-aware ingestion with multiple discovery contexts
- RAG query methods for selector pattern retrieval

### Data Ingestion (`training-data-ingester.ts`)
- Parses existing training data to populate world model
- Extracts spatial context and sibling relationships
- Identifies categories and products from interaction data
- Handles variant cluster discovery from product interactions

### Setup & Testing (`setup-world-model.ts`)
- Automated database setup and index creation
- Connection testing and validation
- Basic CRUD operation testing
- Ready for production deployment once connection is established

The system is architecturally sound and ready for use once the MongoDB Atlas connection issue is resolved.