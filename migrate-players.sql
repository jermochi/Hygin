-- ============================================
-- Migration: Redesign Players Table
-- ============================================
-- Run this in Supabase SQL Editor to:
-- 1. Drop the old players table (clears all entries)
-- 2. Recreate with new schema
-- 3. Also clears the leaderboard
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow anonymous insert on players" ON players;
DROP POLICY IF EXISTS "Allow anonymous select on players" ON players;
DROP POLICY IF EXISTS "Allow anonymous update on players" ON players;

-- Drop the old players table
DROP TABLE IF EXISTS players;

-- Clear leaderboard entries
DELETE FROM final_leaderboard;

-- Recreate players table with new schema
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  grade TEXT NOT NULL CHECK (grade IN ('Grade 3', 'Grade 4', 'Grade 5', 'Grade 6')),
  section TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
  game1_score INTEGER DEFAULT 0,
  game2_score INTEGER DEFAULT 0,
  game3_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Re-enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Allow anonymous insert on players" 
ON players FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow anonymous select on players" 
ON players FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow anonymous update on players" 
ON players FOR UPDATE 
TO anon 
USING (true);

-- Done! Verify the new table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'players'
ORDER BY ordinal_position;
