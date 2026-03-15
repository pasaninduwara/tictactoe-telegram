# Deployment Guide - Tic-Tac-Toe Telegram Mini App

This guide covers deploying your Tic-Tac-Toe Telegram Mini App to Vercel's free tier.

## Prerequisites

- Completed [SETUP.md](SETUP.md) with:
  - Telegram bot created and configured
  - Supabase project set up with database schema
  - All environment variables ready

---

## Step 1: Prepare for Deployment

### Push to GitHub

1. Create a new repository on GitHub

2. Initialize git in your project:
   ```bash
   cd tic-tac-toe-telegram
   git init
   git add .
   git commit -m "Initial commit - Tic-Tac-Toe Telegram Mini App"
   ```

3. Push to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

⚠️ **IMPORTANT**: Never commit `.env` file! Ensure it's in `.gitignore`

### Create .gitignore

If not already present, create `.gitignore`:

```gitignore
node_modules/
.env
.vercel
*.log
.DS_Store
```

---

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign up/log in with GitHub

2. Click **Add New...** → **Project**

3. Import your repository:
   - Find your `tic-tac-toe-telegram` repo
   - Click **Import**

4. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: Leave empty (not needed)
   - **Output Directory**: `public`
   - **Install Command**: `npm install`

5. Add Environment Variables:
   - Expand **Environment Variables** section
   - Add each variable from your `.env` file:
     ```
     TELEGRAM_BOT_TOKEN
     SUPABASE_URL
     SUPABASE_ANON_KEY
     SUPABASE_SERVICE_KEY
     REQUIRED_CHANNEL_ID (optional)
     ```

6. Click **Deploy**

7. Wait 1-2 minutes for deployment to complete

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   cd tic-tac-toe-telegram
   vercel
   ```

4. Follow the prompts and set environment variables in the dashboard afterward

---

## Step 3: Configure Telegram Mini App

### Set Web App URL

1. Go to @BotFather on Telegram

2. Set your Mini App URL:
   ```
   /setmenubutton
   ```
   - Select your bot
   - Set button text: `Play Game`
   - Set URL: `https://your-project.vercel.app`

### Set Mini App Settings (Optional but Recommended)

```
/setmenubutton
```
Then configure:
- Button text: "Play Game"
- URL: Your Vercel deployment URL

### Configure Web App Info

For better user experience, also set:

```
/setdescription
```
Your game description

---

## Step 4: Test Your Deployment

### Test Checklist

1. **Bot Menu Button**
   - Open your bot in Telegram
   - Tap the Menu Button
   - Mini App should load

2. **Authentication**
   - Check console logs for validation errors
   - User should be auto-authenticated from Telegram

3. **Channel Subscription** (if enabled)
   - Non-subscribers should see subscription prompt
   - Subscribers should proceed to menu

4. **Game Features**
   - Create lobby
   - Copy invite link
   - Join lobby from another account
   - Play a full game
   - Check scores

5. **Leaderboard**
   - View leaderboard
   - Check different time periods

6. **Profile**
   - View your stats
   - Check game history

---

## Step 5: Custom Domain (Optional)

### Add Custom Domain

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Domains**
3. Add your domain
4. Configure DNS records as instructed

### Update Telegram Bot

Update the Mini App URL in @BotFather to use your custom domain.

---

## Troubleshooting

### Common Deployment Errors

#### "Function Timeout"

Vercel free tier has a 10-second timeout for serverless functions. If you see timeouts:

1. Check database query efficiency
2. Add appropriate indexes in Supabase
3. Reduce polling intervals

**Solution**: Our code is optimized for serverless with quick queries.

#### "Cannot find module"

Check that all dependencies are in `package.json` and the install command is correct.

#### "Environment variable not defined"

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Ensure all required variables are set
3. Redeploy after adding variables

#### CORS Errors

Our `api/index.js` includes CORS configuration. If you still see issues:

1. Check the `vercel.json` routes configuration
2. Ensure API routes are prefixed with `/api/`

### Debug Mode

Enable debug logging in Vercel:

1. Add to environment variables:
   ```
   DEBUG=true
   NODE_ENV=development
   ```

2. Check function logs in Vercel Dashboard → Deployments → Click deployment → Functions

### Database Connection Issues

If you see database connection errors:

1. **Check Supabase is running**: Go to your Supabase dashboard
2. **Verify credentials**: Re-check all SUPABASE_* environment variables
3. **Check connection limits**: Free tier has connection limits. Our app uses connection pooling via the Supabase client.

---

## Monitoring & Logs

### View Logs

1. Go to Vercel Dashboard
2. Select your project
3. Click on any deployment
4. View **Functions** tab for API logs

### Set Up Alerts

For production, consider setting up:
- Vercel notifications for deployment failures
- Supabase alerts for database issues

---

## Updating Your Deployment

### Automatic Deployments

Vercel automatically deploys when you push to your main branch.

### Manual Redeploy

1. Go to Vercel Dashboard → Your Project
2. Click **Deployments**
3. Click **...** on the latest deployment
4. Select **Redeploy**

### Update Environment Variables

1. Go to Settings → Environment Variables
2. Update the value
3. Redeploy for changes to take effect

---

## Free Tier Limits

### Vercel Free Tier

- 100GB bandwidth/month
- 100GB serverless function execution
- 6000 minutes of execution time
- Unlimited deployments

For a game of this scale, these limits are typically sufficient for thousands of users.

### Supabase Free Tier

- 500MB database
- 1GB file storage
- 50,000 monthly active users
- 500MB realtime messages

Monitor your usage in the Supabase dashboard.

---

## Security Checklist

- [ ] `.env` file is not committed to git
- [ ] `SUPABASE_SERVICE_KEY` is only used in API routes (never frontend)
- [ ] Telegram bot token is kept secret
- [ ] Row Level Security (RLS) policies are enabled in Supabase
- [ ] HTTPS is enforced (automatic on Vercel)

---

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Supabase Troubleshooting](https://supabase.com/docs/guides/troubleshooting)
- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)