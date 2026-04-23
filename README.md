# 🥊 CornerAI — Deployment Guide

Complete ready-to-deploy package. Follow these steps exactly.

---

## 📁 What's in this folder

```
cornerai/
├── index.html                    ← App entry point
├── package.json                  ← Dependencies
├── vite.config.js                ← Build config
├── netlify.toml                  ← Netlify config
├── .gitignore                    ← Git ignore rules
├── src/
│   ├── main.jsx                  ← React entry
│   └── App.jsx                   ← THE MAIN APP (chat, paywall, landing)
├── netlify/
│   └── functions/
│       └── chat.js               ← API proxy (keeps key safe)
└── public/
    └── manifest.json             ← PWA manifest (for "Add to Home Screen")
```

---

## 🚀 Setup Steps

### STEP 1: Install Node.js

If you don't have it yet, download from: https://nodejs.org (get LTS version)

Check with: `node --version` (should show v20 or higher)

---

### STEP 2: Test locally first

Open Terminal and navigate to this folder:

```bash
cd ~/Desktop/cornerai
npm install
```

Wait 1-2 min for it to install everything.

Then run:

```bash
npm run dev
```

Opens at http://localhost:5173

⚠️ **The chat won't work locally yet** — that's normal. It needs Netlify's environment to run the function. You can test everything else though (landing page, paywall modal, UI).

---

### STEP 3: Put code on GitHub

You need a GitHub account. Sign up at github.com if you don't have one.

1. Go to github.com → click **"+"** top right → **"New repository"**
2. Name it: `cornerai`
3. Make it **Private** (your code shouldn't be public)
4. Don't add README/gitignore (we have them)
5. Click **"Create repository"**

GitHub will show you commands. Use these in Terminal from your cornerai folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cornerai.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

### STEP 4: Connect to Netlify

1. Log into **Netlify** (app.netlify.com)
2. If you already have a cornerai site → go to **Site settings → Build & deploy → Link repository**
3. If starting fresh → click **"Add new site" → "Import an existing project"**
4. Choose **GitHub** → authorize → select your `cornerai` repo
5. Build settings (Netlify should auto-detect):
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click **"Deploy"**

---

### STEP 5: Add your API key to Netlify

1. Go to **Site settings → Environment variables**
2. Click **"Add a variable"**
3. Fill in:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** your actual API key (the `sk-ant-...` one)
4. **Save**
5. Go to **Deploys → Trigger deploy → Deploy site**

---

### STEP 6: Test it live

1. Go to your Netlify URL (something like `cornerai-xyz.netlify.app`)
2. Click through the landing page
3. Try sending a message to Coach
4. Coach should respond!

✅ If it works → point your custom domain (cornerai.io) to this site
❌ If it doesn't → check **Functions** tab in Netlify for error logs

---

## 🐛 Troubleshooting

**"Couldn't reach Coach"**
- Check Netlify → Functions tab → click `chat` → see logs
- Verify `ANTHROPIC_API_KEY` is set in env variables
- Make sure you redeployed AFTER adding the env variable

**Build fails on Netlify**
- Check Deploy logs in Netlify
- Usually means missing dependency — check package.json

**Chat works but no quizzes appearing**
- Coach should drop quizzes naturally
- Try asking: "How do I read my opponent's punches?"

---

## 🔄 Making changes later

Edit files locally → test with `npm run dev` → push to GitHub:

```bash
git add .
git commit -m "What you changed"
git push
```

Netlify auto-deploys in 1-2 min.

---

## 📱 Turn it into an app icon (iOS/Android)

Once live on cornerai.io:

**iOS:** Safari → Share → "Add to Home Screen"
**Android:** Chrome → Menu → "Install app"

Looks and feels like a real native app. No App Store needed for MVP.

---

## 💰 Before launch checklist

- [ ] Replace API key with production key
- [ ] Set up Stripe for real payments (currently placeholder)
- [ ] Add Google Analytics or Plausible for tracking
- [ ] Add terms of service + privacy policy pages
- [ ] Test on iPhone Safari + Android Chrome
- [ ] Get first 3 gym owners lined up for beta test

---

🥊 **Get to work.**
