# 🚀 Deployment Guide - Step by Step

## Phase 1: Login to Services

**You need to run these commands manually:**

```bash
# Navigate to project
cd /Users/peteramadon/programming/reactNative/projects/codesight/codesight-crowdsource-collector

# Login to Railway (opens browser)
railway login

# Login to Vercel (opens browser)  
vercel login
```

## Phase 2: Deploy Backend (Railway)

```bash
cd backend

# Initialize Railway project
railway init

# Add PostgreSQL database
railway add postgresql

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Deploy to Railway
railway up
```

## Phase 3: Set Environment Variables

**In Railway Dashboard:**
1. Go to your project → Variables
2. Add these variables:

```env
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret  
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
OPENAI_API_KEY=sk-your_openai_key
OPENAI_ORG_ID=org-your_org_id
JWT_SECRET=your_32_character_random_string
NODE_ENV=production
```

## Phase 4: Run Database Migration

```bash
# Connect to Railway database
railway connect postgresql

# Run migration
railway run npx prisma migrate deploy
```

## Phase 5: Deploy Frontend (Vercel)

```bash
cd ../frontend

# Install dependencies
npm install

# Deploy to Vercel
vercel --prod
```

## Phase 6: Configure Frontend Environment

**In Vercel Dashboard:**
1. Go to your project → Settings → Environment Variables
2. Add:

```env
REACT_APP_API_URL=https://your-backend.railway.app
REACT_APP_ENVIRONMENT=production
```

## Phase 7: AWS S3 Setup

1. Create S3 bucket
2. Configure CORS policy
3. Set bucket permissions
4. Get access keys

## Phase 8: Test Everything

1. Visit your Vercel URL
2. Complete a test session
3. Check Railway logs
4. Verify S3 uploads

---

## 🆘 Need Help?

**If you get stuck:**
1. Check the logs: `railway logs`
2. Check Vercel logs in dashboard
3. Verify environment variables
4. Test API endpoints manually

**Ready to start? Run these login commands first! 🚀**