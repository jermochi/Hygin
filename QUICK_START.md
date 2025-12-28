# Hygienix Score Management System - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Set Up Supabase Database

1. **Open your Supabase project dashboard**
   - Go to [https://supabase.com](https://supabase.com)
   - Navigate to your project

2. **Run the setup script**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"
   - Open the file `database-setup.sql` in this project
   - Copy ALL the SQL code and paste it into the editor
   - Click "RUN" button (or press Ctrl+Enter)

3. **Verify setup**
   - The verification queries at the end will show:
     - ✅ 2 tables created: `players`, `final_leaderboard`
     - ✅ 2 indexes created
     - ✅ 5 RLS policies created

### Step 2: Configure Environment Variables

Create or update your `.env` file in the project root:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these values:**
- In Supabase dashboard → Settings → API
- Copy "Project URL" for `REACT_APP_SUPABASE_URL`
- Copy "anon/public" key for `REACT_APP_SUPABASE_ANON_KEY`

### Step 3: Install Dependencies & Start App

```bash
npm install
npm run dev
```

---

## 🎮 Testing the Complete Flow

### Test 1: Onboarding (First Time User)

1. Visit `http://localhost:5173` (or your dev server URL)
2. You should be redirected to `/onboarding`
3. Fill out the form:
   - Name: "Test Player"
   - Grade: Select "Grade 4"
   - Age: Enter "10"
4. Click "Start Playing!"
5. ✅ You should be redirected to the landing page
6. ✅ Header should show "Welcome, Test Player! 👋"

**Verify in Supabase:**
- Go to Supabase → Table Editor → `players`
- You should see your test player with all three game scores at 0

### Test 2: Playing Games & Score Saving

#### Hand Washing Game
1. Click "Hand Washing" on landing page
2. Complete the game steps
3. Note your final score (e.g., 85)
4. ✅ Score should be displayed in the summary screen

**Verify in Supabase:**
- Check `players` table → `game1_score` should be 85

#### Tooth Brushing Game
1. Return to landing page
2. Click "Tooth Brushing"
3. Complete the game
4. Note your final score (e.g., 92)

**Verify in Supabase:**
- Check `players` table → `game2_score` should be 92

#### Hair Washing Game
1. Return to landing page
2. Click "Hair Washing"
3. Complete all steps
4. Note your final score (e.g., 78)

**Verify in Supabase:**
- Check `players` table → `game3_score` should be 78

### Test 3: High Score Logic

1. Play the same game again (e.g., Hand Washing)
2. Get a LOWER score than before (e.g., 70)
3. ✅ Score should NOT update in database (still 85)

4. Play again and get a HIGHER score (e.g., 95)
5. ✅ Score SHOULD update in database (now 95)

**Verify in Supabase:**
- `game1_score` should be 95 (the higher score)

### Test 4: Session Persistence

1. While on landing page, refresh the browser (F5)
2. ✅ Should stay on landing page (not redirected to onboarding)
3. ✅ Player name still displayed in header
4. ✅ Game scores preserved

### Test 5: Finish Session & Leaderboard

1. On landing page, click "🏆 Finish Session" button
2. Confirm the dialog
3. ✅ Should be redirected to leaderboard page
4. ✅ Your total score should appear (e.g., 85 + 92 + 78 = 255)
5. ✅ Your name should be in the list

**Verify in Supabase:**
- Check `final_leaderboard` table
- Should have entry: name="Test Player", total_score=255

### Test 6: New Session

1. From leaderboard, click "Start New Session"
2. ✅ Should be redirected to onboarding
3. Enter a different name (e.g., "Player 2")
4. Complete onboarding
5. ✅ New player session started
6. Previous session data still in leaderboard

---

## 🐛 Troubleshooting

### Issue: "No active session found" error in console

**Solution:**
- Clear localStorage: Open DevTools → Application → Local Storage → Clear
- Start fresh from onboarding

### Issue: Scores not saving to database

**Solution:**
- Check browser console for errors
- Verify Supabase credentials in `.env`
- Check Supabase logs for API errors
- Ensure RLS policies are enabled

### Issue: Redirected to onboarding after refresh

**Solution:**
- Check if `currentPlayerId` exists in localStorage
- Verify the player ID exists in the `players` table
- If player was deleted from DB, localStorage will be cleared automatically

### Issue: Leaderboard empty

**Solution:**
- Complete at least one full session (all 3 games + finish session)
- Check `final_leaderboard` table in Supabase
- Verify the leaderboard component is fetching data correctly

---

## 📊 Database Structure

### `players` Table
```
id (UUID)           - Auto-generated unique ID
name (TEXT)         - Player's name
grade (TEXT)        - Grade 3-6
age (INTEGER)       - Player's age
game1_score (INT)   - Hand Washing high score
game2_score (INT)   - Tooth Brushing high score
game3_score (INT)   - Hair Washing high score
created_at (TS)     - When player was created
```

### `final_leaderboard` Table
```
id (UUID)           - Auto-generated unique ID
name (TEXT)         - Player's name
total_score (INT)   - Sum of all game scores
created_at (TS)     - When session was completed
```

---

## 🎯 Key Features Implemented

✅ **Session Management**
- localStorage-based session tracking
- Survives page refreshes
- No login required

✅ **Smart Score Updates**
- Only saves if new score > current score
- Prevents score regression
- Individual tracking per game

✅ **Leaderboard System**
- Top 10 scores displayed
- Medal indicators for top 3
- Sorted by total score

✅ **Protected Routes**
- Cannot access games without session
- Automatic redirect to onboarding
- Session validation on mount

✅ **User Experience**
- Beautiful gradient UI
- Loading states
- Confirmation dialogs
- Responsive design

---

## 📝 Next Steps (Optional Enhancements)

1. **Analytics Dashboard**
   - Track average scores per game
   - Player demographics breakdown
   - Popular games statistics

2. **Leaderboard Filters**
   - Filter by date range
   - Filter by grade level
   - Show individual game leaderboards

3. **Player Profiles**
   - View past sessions
   - Show improvement over time
   - Achievement badges

4. **Export Features**
   - Export leaderboard to CSV
   - Print certificates for high scores
   - Share scores on social media

---

## 🆘 Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Verify all environment variables are set correctly
4. Ensure the database setup script ran successfully
5. Try the troubleshooting steps above
