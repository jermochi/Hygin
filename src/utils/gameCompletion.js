// Utility for tracking game completions and medal awards

const STORAGE_KEY = 'hygin_game_completions'

// Game identifiers
export const GAME_IDS = {
  TOOTHBRUSHING: 'toothbrushing',
  HANDWASHING: 'handwashing',
  HAIRWASHING: 'hairwashing'
}

/**
 * Get all completed games from localStorage
 * @returns {string[]} Array of completed game IDs
 */
export const getCompletedGames = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed.completedGames) ? parsed.completedGames : []
  } catch (error) {
    console.error('Error reading game completions:', error)
    return []
  }
}

/**
 * Mark a game as completed
 * @param {string} gameId - The game ID to mark as completed
 */
export const markGameCompleted = (gameId) => {
  try {
    const completedGames = getCompletedGames()
    
    // Only add if not already completed (no duplicates)
    if (!completedGames.includes(gameId)) {
      completedGames.push(gameId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedGames }))
    }
  } catch (error) {
    console.error('Error saving game completion:', error)
  }
}

/**
 * Check if a specific game is completed
 * @param {string} gameId - The game ID to check
 * @returns {boolean}
 */
export const isGameCompleted = (gameId) => {
  return getCompletedGames().includes(gameId)
}

/**
 * Get medal status
 * @returns {{bronze: boolean, silver: boolean, gold: boolean}} Medal status object
 */
export const getMedalStatus = () => {
  const completedGames = getCompletedGames()
  const uniqueGames = [...new Set(completedGames)] // Remove duplicates
  
  return {
    bronze: uniqueGames.length >= 1,
    silver: uniqueGames.length >= 2,
    gold: uniqueGames.length >= 3
  }
}

/**
 * Clear all game completions (useful for testing/reset)
 */
export const clearCompletions = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing completions:', error)
  }
}

