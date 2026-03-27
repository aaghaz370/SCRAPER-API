# TMDB Extras Migration Guide

## Overview
This migration populates OTT platforms (watch providers) and videos (trailers, clips, BTS) for all existing movies and series.

## Prerequisites
1. Backend server must be deployed on Render
2. MongoDB connection must be active
3. TMDB API key must be configured

## How to Run

### Option 1: Via Render Shell (Recommended)
1. Go to Render Dashboard
2. Select your backend service
3. Click "Shell" tab
4. Run:
```bash
node src/scripts/migrate-tmdb-extras.js
```

### Option 2: Locally with Production DB
1. Add `.env` file in backend root with:
```
MONGO_URI=your_mongodb_connection_string
TMDB_API_KEY=your_tmdb_api_key
```

2. Run:
```bash
cd CINEMAHUB_BACKEND
node src/scripts/migrate-tmdb-extras.js
```

## What It Does
- Fetches watch providers (Netflix, Prime, etc.) from TMDB
- Fetches videos (trailers, teasers, clips, BTS, bloopers) from TMDB
- Updates ALL existing movies and series in database
- Rate limited to 300ms between requests (TMDB safe)
- Logs progress for each movie/series

## Expected Output
```
🚀 TMDB Extras Migration Starting...

🎬 Starting Movie Migration...
Found 150 movies

Processing: Inception (TMDB: 27205)
✅ Updated: Inception

Processing: The Dark Knight (TMDB: 155)
✅ Updated: The Dark Knight

...

🎬 Movie Migration Complete!
✅ Updated: 145
❌ Failed: 5

📺 Starting Series Migration...
Found 80 series

...

✅ Migration Complete!
```

## After Migration
- All movies/series will have `watchProviders` and `videos` fields populated
- Frontend can now display OTT platforms and trailers
- New movies/series added later will NOT auto-populate - need to add auto-fetch logic

## Troubleshooting

### "MongooseError: uri parameter required"
- `.env` file missing or `MONGO_URI` not set
- Solution: Add proper `.env` file

### "TMDB API Error"
- Invalid or missing TMDB_API_KEY
- Solution: Check API key in environment variables

### "Rate limit exceeded"
- Too many requests to TMDB
- Solution: Script already has 300ms delay, wait and retry

## Time Estimate
- ~150 movies = ~45 seconds (with 300ms delay)
- ~80 series = ~24 seconds
- Total: ~1-2 minutes for typical database

## Notes
- Safe to run multiple times (will update existing data)
- No data loss - only adds new fields
- Existing watch/download links unaffected
