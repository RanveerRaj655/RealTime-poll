# PollSync - Real-Time Instant Polling Application

A modern, real-time polling application built with Next.js and Supabase. Create polls, share them instantly, and watch votes update in real-time with built-in fairness mechanisms.

🚀 **[Live Demo](https://real-time-poll-theta.vercel.app)** - Try it now!

## 🎯 What It Does

PollSync is a full-featured polling platform that allows users to:
- **Create polls** with custom questions and multiple options (2-10 options)
- **Share polls** with others via shareable links
- **Vote in real-time** with instant result updates
- **View live statistics** with vote counts and percentages
- **Delete polls** when no longer needed
- **Browse recent polls** on the home page (last 10 polls)

## Learn More

All changes are reflected in real-time across all connected clients using Supabase's realtime subscriptions.

## ✨ Features Implemented

### Core Features
- ✅ **Poll Creation** - Users can create polls with a question and 2-10 options
- ✅ **Real-Time Voting** - Votes update instantly across all connected users via Supabase subscriptions
- ✅ **Vote Counting** - Automatic vote count tracking with percentage calculations
- ✅ **Poll Management** - Browse recent polls, view detailed results, delete polls
- ✅ **Share Functionality** - Copy poll links and share via any platform
- ✅ **Responsive Design** - Works seamlessly on desktop and mobile devices
- ✅ **Form Validation** - Question and option validation with user-friendly error messages
- ✅ **Modern UI** - Gradient backgrounds, Tailwind CSS styling, Lucide React icons

### Technical Features
- ✅ **Next.js 16** - Server components and async API routes
- ✅ **TypeScript** - Full type safety for better developer experience
- ✅ **Supabase Integration** - PostgreSQL database + real-time subscriptions
- ✅ **Client-Side State** - Efficient React state management with hooks
- ✅ **Server-Side Voting API** - Secure vote processing with IP tracking

---

## 🛡️ Fairness & Anti-Abuse Mechanisms

### 1. **IP-Based Vote Deduplication (Server-Side)**
**Location:** `app/api/poll/[id]/vote/route.ts`

The most robust fairness mechanism:
1. **IP Extraction** - Captures client IP from headers
2. **SHA-256 Hashing** - Hashes IP (never stored in plaintext)
3. **Duplicate Check** - Verifies IP hasn't voted on this poll
4. **Rejection** - Returns 403 if duplicate detected

**Benefits:** Prevents vote manipulation, secure, one-vote-per-IP

### 2. **Client-Side localStorage Check (UX Prevention)**
**Location:** `app/poll/[id]/page.tsx`

1. **localStorage Entry** - Saves vote choice to browser storage
2. **Vote Status Check** - Checks if already voted on page load
3. **UI Blocking** - Disables voting buttons when already voted
4. **Persistent State** - Prevents accidental re-voting

**Benefits:** Instant feedback, reduces API calls, better UX, reduces server load

**Note:** Server-side IP check provides fallback protection if localStorage is bypassed

---

## 🎯 Edge Cases Handled

1. **Concurrent Vote Submissions** - `voting` state prevents multiple simultaneous submissions
2. **Duplicate Vote Detection** - Server validates IP hash; returns 403 if duplicate
3. **Non-Existent Poll Access** - Error handling with user-friendly redirect
4. **Missing Required Data** - Form validation for question + 2+ options
5. **Network Failures** - Try-catch blocks with error messages
6. **Real-Time Subscription Failures** - Graceful fallback with loadPoll()
7. **Zero/Undefined Vote Counts** - Coercion to number prevents NaN
8. **Stale Data on Multiple Tabs** - Realtime subscriptions keep data fresh
9. **Option Text Truncation** - Tailwind CSS prevents overflow
10. **Empty Poll State** - Friendly empty state message with icon

---

## 📋 Known Limitations & Future Improvements

### Current Limitations

1. **IP-Based Voting Only** (Medium impact) - Single point of failure if behind proxy
2. **No User Authentication** (High impact) - Can't track users across devices
3. **localStorage Bypass** (Low impact) - Server validation provides fallback
4. **No Rate Limiting** (Medium impact) - No request throttling
5. **No Spam Filtering** (High impact) - No content moderation
6. **Limited Poll History** (Low impact) - Only shows 10 recent polls
7. **No Poll Expiration** (Medium impact) - Database grows indefinitely
8. **No Analytics** (Low impact) - Can't see vote timing
9. **Generic Error Messages** (Low impact) - No custom duplicate feedback
10. **Next.js 15 `params` Async** (Low impact) - Verbose API handling

---

### Recommended Improvements (Priority Order)

1. **User Authentication** (High) - Email signup, session tokens, per-user fairness
2. **Rate Limiting** (High) - Request throttling, DDoS protection
3. **Content Moderation** (High) - Profanity filtering, user reports, admin dashboard
4. **Poll Expiration** (Medium) - Expiration times, auto-cleanup, archiving
5. **Search & Filtering** (Medium) - Full-text search, date ranges, trending
6. **Pagination** (Medium) - Load more button, infinite scroll
7. **Advanced Analytics** (Low) - Vote timing, engagement metrics
8. **Mobile App** (Low) - React Native version
9. **Randomized Options** (Low) - Shuffle to prevent position bias
10. **Email Notifications** (Low) - Vote alerts, trending digest

---

## 📁 Project Structure

```
realtime-poll-app/
├── app/
│   ├── page.tsx                    # Home page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── api/poll/[id]/vote/route.ts # Vote API
│   └── poll/[id]/page.tsx          # Poll detail
├── lib/
│   ├── supabaseClient.ts          # DB client
│   └── utils.ts                    # Utilities
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.mjs
├── postcss.config.mjs
├── eslint.config.mjs
└── README.md
```

---

## 🚀 Getting Started

**Want to try it first?** → Visit the [live demo](https://real-time-poll-theta.vercel.app) (no setup required!)

### Setup Locally

### Prerequisites
- Node.js 18+, npm/yarn
- Supabase account

### Installation

1. Clone & install
   ```bash
   git clone <repo>
   cd realtime-poll-app
   npm install
   ```

2. Create `.env.local`
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

3. Create database tables
   ```sql
   CREATE TABLE polls (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     question TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE TABLE options (
     id UUID PRIMARY KEY,
     poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
     text TEXT NOT NULL,
     votes_count INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE TABLE votes (
     id UUID PRIMARY KEY,
     poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
     option_id UUID REFERENCES options(id) ON DELETE CASCADE,
     ip_hash TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE INDEX idx_votes_poll_ip ON votes(poll_id, ip_hash);
   ```

4. Run
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

---

## 📊 Tech Stack

- **Frontend**: React 19, Next.js 16, TypeScript
- **Styling**: Tailwind CSS 4 + PostCSS
- **Database**: Supabase (PostgreSQL)
- **Real-Time**: Supabase Subscriptions
- **UI**: Lucide React icons

---


