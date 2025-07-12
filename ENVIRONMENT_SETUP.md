# Environment Variables Setup

## Railway Backend Configuration
Since Railway CLI requires interactive input, set these variables through the Railway dashboard:

1. Go to: https://railway.app/dashboard
2. Select your `codesigh-crowdsource` project
3. Go to Variables tab and add:

```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
OPENAI_API_KEY=your_openai_api_key
AWS_S3_BUCKET=codesight-research-videos
AWS_S3_REGION=us-east-1
NODE_ENV=production
PORT=8080
```

## Vercel Frontend Configuration
Set these through Vercel dashboard:

1. Go to: https://vercel.com/codesight/frontend
2. Go to Settings > Environment Variables and add:

```
REACT_APP_BACKEND_URL=https://your-railway-url.railway.app
```

## AWS S3 Configuration ✅ COMPLETED
- Bucket created: `codesight-research-videos`
- CORS configured for frontend access
- Region: `us-east-1`

## Next Steps
1. Set environment variables in Railway dashboard
2. Set environment variables in Vercel dashboard  
3. Get Railway backend URL and update Vercel with REACT_APP_BACKEND_URL
4. Test end-to-end functionality