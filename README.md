# 🌐 CodeSight Crowdsource Collector

**Scale AI training data collection using Fiverr workers - exactly how successful AI companies do it!**

## 🎯 Why This Works

- **Scale**: 1,500+ examples in weeks instead of months
- **Diversity**: Different shopping styles, ages, tech skills
- **Cost**: $5-20/session vs $100+/hour of your time
- **Efficiency**: You build AI, others do the clicking
- **Quality**: Real human behavior variation

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Fiverr Gig    │───▶│  Recording Site  │───▶│  Data Pipeline  │
│   Workers        │    │  (React App)     │    │  (AI Analysis)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
   📝 Shop naturally      🎥 Screen record       🧠 Vision analysis
   🗣️ Narrate thinking    🎤 Audio capture       🎯 Extract patterns
   ⏱️ Complete goals      📊 Quality metrics     📈 Training data
```

## 🚀 Quick Start

### 1. Deploy Recording Website
```bash
cd frontend
npm install
npm run build
# Deploy to Vercel/Netlify (included config)
```

### 2. Set Up Backend
```bash
cd backend
npm install
npm run dev
# Configure AWS S3 for video storage
```

### 3. Post Fiverr Gigs
- Use provided templates in `/docs/fiverr-gigs/`
- Start with 5-10 test workers
- Scale up based on quality

### 4. Process Data
```bash
npm run process-recordings
# Automatically analyze with vision AI
# Generate training examples
```

## 💰 Cost Analysis

| Approach | Cost | Time | Examples |
|----------|------|------|----------|
| **DIY** | $20,000 value | 3-4 months | 500 |
| **Crowdsource** | $2,000 actual | 2-3 weeks | 1,500+ |
| **Savings** | **10x cheaper** | **10x faster** | **3x more** |

## 🎮 Worker Experience

### Simple 5-Step Process:
1. **Visit** recording website
2. **Read** shopping goal (e.g., "Find blue jeans size 32 under $80")
3. **Shop** naturally while recording
4. **Narrate** thinking ("I'm clicking Men's because...")
5. **Submit** and get paid

### Quality Guidelines:
- ✅ Clear screen recording
- ✅ Audio narration present
- ✅ Natural shopping behavior
- ✅ Goal completion attempt
- 🌟 Bonus for exceptional quality

## 📊 Data Collection Scale

### Tier 1: Basic ($20 - 5 scenarios)
```json
{
  "scenarios": [
    "Find black dress shoes under $100",
    "Find laptop for college under $800",
    "Find birthday gift for mom under $50"
  ],
  "duration": "1 hour",
  "workers": "Entry level"
}
```

### Tier 2: Complex ($35 - 10 scenarios)
```json
{
  "scenarios": [
    "Find blue jeans size 32 from local store in Seattle under $80",
    "Find work dress professional but not boring petite size under $100"
  ],
  "duration": "2 hours",
  "workers": "Experienced + narration"
}
```

### Tier 3: Specialized ($50 - 15 scenarios)
```json
{
  "scenarios": [
    "Find anniversary gift for wife who likes jewelry budget $200-300",
    "Find running shoes for flat feet women under $150 local pickup"
  ],
  "duration": "3 hours",
  "workers": "Expert + detailed narration"
}
```

## 🔧 Tech Stack

### Frontend (React)
- **Recording**: Browser-based screen capture
- **Audio**: Microphone narration
- **UI**: Simple, worker-friendly interface
- **Validation**: Real-time quality checks

### Backend (Node.js)
- **Storage**: AWS S3 for videos
- **Database**: Session metadata
- **Processing**: Queue for AI analysis
- **API**: Worker management

### AI Processing
- **Vision Analysis**: OpenAI Vision API
- **Audio Transcription**: Whisper API
- **Pattern Recognition**: Custom ML models
- **Training Data**: Automated generation

## 📈 Success Metrics

### Target Numbers (Month 1):
- **50 workers** recruited
- **1,500 sessions** completed
- **95% quality** acceptance rate
- **2-week** average turnaround
- **$2,000** total investment

### Expected Results:
- **15,000+ navigation steps** recorded
- **300+ hours** of shopping behavior
- **50+ unique** shopping patterns
- **25+ sites** covered organically
- **3x diversity** vs solo collection

## 🎯 Quality Control

### Automated Validation:
- ✅ Video length (min 5 minutes)
- ✅ Audio quality (clear speech)
- ✅ Goal attempt (task tracking)
- ✅ Natural behavior (timing analysis)

### Manual Review (2 min/submission):
- ✅ Video plays correctly
- ✅ Narration present
- ✅ Realistic shopping behavior
- ✅ Worth payment amount

### Worker Rating System:
- ⭐⭐⭐⭐⭐ Exceptional (bonus eligible)
- ⭐⭐⭐⭐ Good (repeat work)
- ⭐⭐⭐ Acceptable (standard pay)
- ⭐⭐ Needs improvement (revision)
- ⭐ Rejected (no payment)

## 🚀 Deployment Guide

### 1. Environment Setup
```bash
# Frontend environment
REACT_APP_API_URL=https://your-api.com
REACT_APP_RECORDING_ENABLED=true

# Backend environment  
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
OPENAI_API_KEY=your_openai_key
DATABASE_URL=your_db_url
```

### 2. Deploy Frontend
```bash
cd frontend
npm run build
# Deploy to Vercel (config included)
```

### 3. Deploy Backend
```bash
cd backend
npm run build
# Deploy to Railway/Heroku (config included)
```

### 4. Configure Storage
- Set up AWS S3 bucket
- Configure CORS for uploads
- Set up CDN for video delivery

## 📋 Fiverr Gig Templates

### Gig Title:
"I will help train AI shopping assistant by recording my online shopping behavior"

### Description:
🛒 **HELP TRAIN THE FUTURE OF AI SHOPPING!**

I'm building an AI that helps people shop online and need real human shopping data.

**WHAT YOU'LL DO:**
✅ Visit my simple website
✅ Get shopping goals (like "find blue jeans size 32 under $80")
✅ Shop naturally while screen recording
✅ Narrate your thinking out loud
✅ Complete 5-10 shopping scenarios

**PERFECT FOR:**
- Students looking for flexible work
- Stay-at-home parents
- Anyone comfortable with online shopping
- People who like talking through their thoughts

**REQUIREMENTS:**
✅ Fluent English speaker
✅ Comfortable online shopping
✅ Reliable internet connection
✅ Can follow simple instructions

### Packages:
- **Basic ($20)**: 5 scenarios, 1 hour
- **Standard ($35)**: 10 scenarios + narration, 2 hours  
- **Premium ($50)**: 15 scenarios + detailed narration, 3 hours

## 🎯 ROI Analysis

### Traditional Approach:
- **Your time**: 200+ hours @ $100/hour = $20,000 value
- **Examples**: ~500 (limited by your availability)
- **Diversity**: Single perspective
- **Timeline**: 3-4 months

### Crowdsource Approach:
- **Cost**: $2,000 (50 workers × $40 average)
- **Examples**: 1,500+ (parallel collection)
- **Diversity**: 50+ different shopping styles
- **Timeline**: 2-3 weeks

### **Result: 10x ROI + 10x Speed + 3x Diversity**

## 🔄 Processing Pipeline

### 1. Raw Data Collection
```
Worker completes session → Video uploaded to S3 → Metadata stored
```

### 2. Automated Processing
```
Video → OpenAI Vision analysis → Navigation steps extracted
Audio → Whisper transcription → Intent analysis → Shopping patterns
```

### 3. Training Data Generation
```
Processed data → CodeSight format → Quality validation → Training ready
```

### 4. Model Training
```
Training data → Fine-tuning → Model validation → Deployment
```

## 📞 Support & Scaling

### Worker Support:
- **FAQ page** with common questions
- **Video tutorials** for first-time workers
- **Discord/Slack** for real-time help
- **Feedback system** for improvements

### Scaling Strategy:
1. **Week 1-2**: Test with 5-10 workers, refine process
2. **Week 3-4**: Scale to 25 workers, optimize quality control
3. **Month 2**: 50+ workers, full automation
4. **Month 3+**: 100+ workers, multiple sites/scenarios

This system will give you **professional-grade training data at scale** - exactly how companies like Scale AI, Surge AI, and others collect massive datasets! 🚀