#!/bin/bash

echo "🚀 Starting deployment of CodeSight Crowdsource Collector..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed. Run: npm install -g @railway/cli"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed. Run: npm install -g vercel"
    exit 1
fi

print_success "Prerequisites check passed!"

# Step 1: Deploy Backend to Railway
print_status "Deploying backend to Railway..."
cd backend

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    print_warning "Not logged in to Railway. Please run: railway login"
    exit 1
fi

# Initialize Railway project if not exists
if [ ! -f ".railway.env" ]; then
    print_status "Initializing Railway project..."
    railway init
fi

# Install dependencies
print_status "Installing backend dependencies..."
npm install

# Build the project
print_status "Building backend..."
npm run build

# Deploy to Railway
print_status "Deploying to Railway..."
railway up

if [ $? -eq 0 ]; then
    print_success "Backend deployed successfully!"
else
    print_error "Backend deployment failed!"
    exit 1
fi

# Get Railway URL
RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url')
print_success "Backend URL: $RAILWAY_URL"

cd ..

# Step 2: Deploy Frontend to Vercel
print_status "Deploying frontend to Vercel..."
cd frontend

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

# Install dependencies
print_status "Installing frontend dependencies..."
npm install

# Create environment file with Railway URL
cat > .env.production << EOF
REACT_APP_API_URL=$RAILWAY_URL
REACT_APP_ENVIRONMENT=production
EOF

# Build the project
print_status "Building frontend..."
npm run build

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    print_success "Frontend deployed successfully!"
else
    print_error "Frontend deployment failed!"
    exit 1
fi

cd ..

print_success "🎉 Deployment complete!"
print_status "Next steps:"
echo "1. Set up your environment variables in Railway dashboard"
echo "2. Configure AWS S3 bucket"
echo "3. Run database migrations"
echo "4. Test the complete flow"
echo "5. Publish your Fiverr gigs"

print_success "Your platform is ready to collect research data!"