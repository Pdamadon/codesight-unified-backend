# 🔑 Complete API Setup Guide

This guide will walk you through creating accounts and getting API keys for all required services.

---

## 1. OpenAI API Setup 🤖

### Create Account & Get API Key:
1. **Sign up** at [platform.openai.com](https://platform.openai.com)
2. **Add payment method**: Go to Billing → Payment methods
3. **Create API key**:
   - Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Name it: "CodeSight Research Platform"
   - **COPY THE KEY IMMEDIATELY** (you won't see it again!)

### Get Organization ID:
1. Go to [platform.openai.com/account/organization](https://platform.openai.com/account/organization)
2. Copy your Organization ID (starts with `org-`)

### Keys Needed:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
OPENAI_ORG_ID=org-xxxxxxxxxxxxxxxxxxxxx
```

### Pricing:
- Whisper API (transcription): ~$0.006/minute
- GPT-4 Vision: ~$0.01 per image

---

## 2. AWS S3 Setup 🗄️

### Create AWS Account:
1. **Sign up** at [aws.amazon.com](https://aws.amazon.com)
2. **Add payment method** (required even for free tier)

### Create S3 Bucket:
1. Go to [S3 Console](https://s3.console.aws.amazon.com/)
2. Click **"Create bucket"**
3. **Bucket settings**:
   - Bucket name: `codesight-research-recordings` (must be globally unique)
   - Region: `US East (N. Virginia) us-east-1`
   - Object Ownership: ACLs disabled
   - Block Public Access: **Uncheck** "Block all public access"
   - Bucket Versioning: Disable
   - Click **Create bucket**

### Configure CORS:
1. Go to your bucket → **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit** and paste:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

### Create IAM User & Get Keys:
1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Users** → **Add users**
3. User name: `codesight-s3-user`
4. Select **"Access key - Programmatic access"**
5. Click **Next**
6. Select **"Attach existing policies directly"**
7. Search and select: `AmazonS3FullAccess`
8. Click through to **Create user**
9. **SAVE YOUR KEYS**:

```env
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET=codesight-research-recordings
AWS_REGION=us-east-1
```

### Pricing:
- Storage: $0.023/GB per month
- Data transfer: $0.09/GB (after 1GB free)

---

## 3. Railway Setup 🚂

### Create Account:
1. **Sign up** at [railway.app](https://railway.app)
2. Choose **Hobby Plan** ($5/month) for production use

### No API Keys Needed!
Railway uses CLI authentication. Just run:
```bash
railway login
```

---

## 4. Vercel Setup ▲

### Create Account:
1. **Sign up** at [vercel.com](https://vercel.com)
2. Free tier is sufficient (100GB bandwidth/month)

### No API Keys Needed!
Vercel uses CLI authentication. Just run:
```bash
vercel login
```

---

## 5. Generate JWT Secret 🔐

### Create a Secure Random String:
Run this command to generate a secure JWT secret:

```bash
openssl rand -base64 32
```

Or use this online generator: [randomkeygen.com](https://randomkeygen.com/)

Example:
```env
JWT_SECRET=Kj3mN9pQ2rS5tV8wX1yZ4aB7cD0eF3gH
```

---

## 🎯 Where to Put Your Keys

### Backend Environment Variables (Railway):

After deploying to Railway, add these in the Railway dashboard:

```env
# Database (automatically set by Railway)
DATABASE_URL=postgresql://...

# AWS S3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET=codesight-research-recordings
AWS_REGION=us-east-1

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
OPENAI_ORG_ID=org-xxxxxxxxxxxxxxxxxxxxx

# Security
JWT_SECRET=your_32_character_random_string

# Frontend URL (after Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app

# Environment
NODE_ENV=production
```

### Frontend Environment Variables (Vercel):

After deploying to Vercel, add these in the Vercel dashboard:

```env
# Backend API URL (from Railway deployment)
REACT_APP_API_URL=https://your-backend.railway.app

# Environment
REACT_APP_ENVIRONMENT=production
```

---

## 📋 Quick Checklist

### API Keys to Collect:
- [ ] OpenAI API Key (`sk-proj-...`)
- [ ] OpenAI Organization ID (`org-...`)
- [ ] AWS Access Key ID (`AKIA...`)
- [ ] AWS Secret Access Key
- [ ] AWS S3 Bucket Name
- [ ] JWT Secret (32+ characters)

### Accounts to Create:
- [ ] OpenAI (with billing enabled)
- [ ] AWS (with payment method)
- [ ] Railway (Hobby plan recommended)
- [ ] Vercel (free tier is fine)

---

## 🚨 Security Tips

1. **Never commit API keys** to Git
2. **Use environment variables** only
3. **Rotate keys regularly**
4. **Set spending limits** on OpenAI and AWS
5. **Monitor usage** weekly

---

## 💰 Expected Costs

### Monthly Estimates (50 participants):
- **Railway**: $5 (Hobby plan)
- **Vercel**: $0 (free tier)
- **AWS S3**: ~$2 (10GB storage + bandwidth)
- **OpenAI**: ~$15 (transcription + analysis)
- **Total**: ~$22/month

### Per Participant:
- Storage: ~$0.02
- Processing: ~$0.30
- Total: ~$0.32 per participant

---

## 🆘 Troubleshooting

### OpenAI Issues:
- "Invalid API key": Check for extra spaces or missing characters
- "Insufficient quota": Add payment method and increase limits

### AWS Issues:
- "Access Denied": Check IAM permissions
- "Bucket not found": Verify bucket name and region

### CORS Issues:
- Make sure CORS is configured on S3 bucket
- Check allowed origins include your Vercel domain

---

## ✅ Ready to Deploy?

Once you have all your API keys:

1. Keep this guide open
2. Return to the deployment process
3. We'll add these keys during deployment

**Need help with any service? Let me know which one!** 🚀