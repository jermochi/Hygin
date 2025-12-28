-- ============================================
-- Hygienix Score Management System
-- Supabase Database Setup
-- ============================================

-- This script creates the necessary tables for the
-- Hygienix score management system.
-- 
-- Run this in your Supabase SQL Editor:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to "SQL Editor"
-- 3. Click "New Query"
-- 4. Copy and paste this entire script
-- 5. Click "Run" to execute

-- ============================================
-- Table 1: Players
-- ============================================
-- Stores player information and their high scores
-- for each of the three games

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  age INTEGER NOT NULL,
  game1_score INTEGER DEFAULT 0,  -- Hand Washing
  game2_score INTEGER DEFAULT 0,  -- Tooth Brushing
  game3_score INTEGER DEFAULT 0,  -- Hair Washing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE players IS 'Stores player profiles and their high scores for each game';
COMMENT ON COLUMN players.game1_score IS 'High score for Hand Washing game';
COMMENT ON COLUMN players.game2_score IS 'High score for Tooth Brushing game';
COMMENT ON COLUMN players.game3_score IS 'High score for Hair Washing game';

-- ============================================
-- Table 2: Final Leaderboard
-- ============================================
-- Stores completed game sessions with total scores
-- Each entry represents a finished session

CREATE TABLE IF NOT EXISTS final_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE final_leaderboard IS 'Leaderboard of completed game sessions';
COMMENT ON COLUMN final_leaderboard.total_score IS 'Sum of all three game scores (game1 + game2 + game3)';

-- ============================================
-- Indexes for Performance
-- ============================================
-- Create index on leaderboard total_score for faster queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_total_score 
ON final_leaderboard(total_score DESC);

-- Create index on leaderboard created_at for date filtering
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at 
ON final_leaderboard(created_at DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- Enable RLS for both tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert players (for onboarding)
CREATE POLICY "Allow anonymous insert on players" 
ON players FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow anonymous users to read any player data
CREATE POLICY "Allow anonymous select on players" 
ON players FOR SELECT 
TO anon 
USING (true);

-- Allow anonymous users to update any player data (for score updates)
CREATE POLICY "Allow anonymous update on players" 
ON players FOR UPDATE 
TO anon 
USING (true);

-- Allow anonymous users to insert into leaderboard
CREATE POLICY "Allow anonymous insert on leaderboard" 
ON final_leaderboard FOR INSERT 
TO anon 
WITH CHECK (true);

-- Allow anonymous users to read leaderboard
CREATE POLICY "Allow anonymous select on leaderboard" 
ON final_leaderboard FOR SELECT 
TO anon 
USING (true);

-- ============================================
-- Verification Queries
-- ============================================
-- Run these queries after setup to verify everything works

-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('players', 'final_leaderboard');

-- Check if indexes were created
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('players', 'final_leaderboard');

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('players', 'final_leaderboard');

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================
-- Uncomment the lines below to insert test data

-- INSERT INTO players (name, grade, age, game1_score, game2_score, game3_score) 
-- VALUES 
--   ('Test Player 1', 'Grade 4', 10, 85, 92, 78),
--   ('Test Player 2', 'Grade 5', 11, 95, 88, 91);

-- INSERT INTO final_leaderboard (name, total_score) 
-- VALUES 
--   ('Test Player 1', 255),
--   ('Test Player 2', 274);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Your database is now ready for the Hygienix app.
-- 
-- Next steps:
-- 1. Ensure your .env file has the correct Supabase credentials
-- 2. Start your React app: npm run dev
-- 3. Test the onboarding flow
-- 4. Play the games and verify scores are saved
-- 5. Complete a session and check the leaderboard
