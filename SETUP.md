# Setup Guide - Tic-Tac-Toe Telegram Mini App

This guide walks you through setting up all required services for the Tic-Tac-Toe Telegram Mini App. All services have free tiers with no credit card required.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create Telegram Bot](#create-telegram-bot)
3. [Setup Supabase Database](#setup-supabase-database)
4. [Configure Environment Variables](#configure-environment-variables)
5. [Local Development](#local-development)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A Telegram account
- A GitHub account (for Vercel deployment)
- Node.js 18+ installed (for local development)

---

## Create Telegram Bot

### Step 1: Create Bot with BotFather

1. Open Telegram and search for **@BotFather**
2. Send the command `/newbot`
3. Follow the prompts:
   - **Bot name**: Choose a display name (e.g., "TicTacToe Game")
   - **Bot username**: Choose a unique username ending in `bot` (e.g., `my_tictactoe_bot`)

4. BotFather will respond with your **API Token**. Save this securely!

```
Done! Congratulations on your new bot...
Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

Keep your token secure...
```

### Step 2: Configure Bot Commands

Send these commands to @BotFather to set up bot commands:

```
/setcommands
```

Then paste:
```
start - Start the game
play - Play a new game
leaderboard - View leaderboard
profile - View your profile
help - Get help
```

### Step 3: Set Bot Description

```
/setdescription
```

```
Play Tic-Tac-Toe with friends! A 6x6 grid game where you score points by creating lines of 3. Challenge players worldwide and climb the leaderboard!
```

### Step 4: Create Required Channel (Optional but Recommended)

If you want to require users to subscribe to a channel before playing:

1. Create a new Telegram channel or use an existing one
2. Add your bot as an administrator to the channel:
   - Go to Channel Info → Administrators → Add Admin
   - Search for your bot username
   - Grant permission to "Post Messages" (minimum required)

3. Note your channel ID:
   - Public channel: Use `@channel_username` (e.g., `@mygamechannel`)
   - Private channel: Use the numeric ID (starts with `-100`)

To get a private channel ID:
1. Forward any message from your channel to @userinfobot
2. It will reply with the channel ID (add `-100` prefix if not present)

---

## Setup Supabase Database

### Step 1: Create Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email if required

### Step 2: Create Organization and Project

1. Create an organization (free tier allows 1 organization)
2. Click "New Project"
3. Fill in:
   - **Name**: `tictactoe-game` (or your preferred name)
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose closest to your users
   - **Plan**: Free tier is sufficient

4. Wait 2-3 minutes for project setup

### Step 3: Get API Keys

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...` (public, safe for frontend)
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...` (secret, backend only!)

⚠️ **IMPORTANT**: Never expose the service_role key in frontend code!

### Step 4: Setup Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste and click **Run**

This creates:
- `users` table
- `user_stats` table  
- `lobbies` table
- `games` table
- `game_moves` table
- Functions for leaderboard and stats
- Row Level Security policies

### Step 5: Enable Realtime (Important!)

1. Go to **Database** → **Replication**
2. Find `games` and `lobbies` tables
3. Enable replication for both tables
4. This allows real-time game state updates

---

## Configure Environment Variables

### Local Development

Create a `.env` file in the project root:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Optional: Channel Subscription Gate
REQUIRED_CHANNEL_ID=@your_channel_username
# For private channels: REQUIRED_CHANNEL_ID=-1001234567890
```

### Vercel Deployment

Set these in Vercel Dashboard:
1. Go to your project → **Settings** → **Environment Variables**
2. Add each variable from your `.env` file

---

## Local Development

### Install Dependencies

```bash
cd tic-tac-toe-telegram
npm install
```

### Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Test with Telegram

1. Use a tool like [ngrok](https://ngrok.com) to expose your local server:
   ```bash
   ngrok http 3000
   ```

2. Update your bot's Mini App URL in BotFather:
   ```
   /setmenubutton
   ```
   Select your bot, then set the URL to your ngrok URL

3. Open your bot in Telegram and tap the Menu Button

---

## Troubleshooting

### "Invalid initData" Error

- Ensure your bot token is correct
- Check that the Mini App URL matches exactly (including https://)
- Verify the request is coming from Telegram

### Database Connection Errors

- Verify all Supabase environment variables are set correctly
- Check that the schema was executed successfully
- Ensure IP restrictions are not blocking Vercel (Supabase free tier allows all IPs by default)

### Channel Subscription Check Failing

- Ensure your bot is an admin in the channel
- Verify the channel ID format:
  - Public: `@username`
  - Private: `-1001234567890`
- Test by manually checking: `https://api.telegram.org/bot<YOUR_TOKEN>/getChatMember?chat_id=@channel&user_id=123456789`

### Realtime Not Working

- Ensure replication is enabled for `games` and `lobbies` tables
- Check Supabase dashboard → Database → Replication

### Vercel Deployment Issues

- Check Vercel function logs for errors
- Ensure all environment variables are set
- Verify `vercel.json` is in the root directory

---

## Need Help?

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)