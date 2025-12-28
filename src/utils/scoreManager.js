import { supabase } from '../supabaseClient'

/**
 * Checks if there's an active player session
 * @returns {boolean}
 */
export const hasActiveSession = () => {
    const playerId = localStorage.getItem('currentPlayerId')
    return !!playerId
}

/**
 * Gets the current player's full record from the database
 * @returns {Promise<object|null>} - Player object or null
 */
export const getCurrentPlayer = async () => {
    const playerId = localStorage.getItem('currentPlayerId')
    if (!playerId) return null

    try {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', playerId)
            .single()

        if (error) {
            console.error('Error fetching current player:', error)
            // If player not found, clear invalid session
            if (error.code === 'PGRST116') {
                localStorage.removeItem('currentPlayerId')
            }
            return null
        }

        return data
    } catch (err) {
        console.error('Unexpected error fetching player:', err)
        return null
    }
}

/**
 * Creates a new player and starts a session
 * @param {object} playerData - { name, grade, age }
 * @returns {Promise<string|null>} - Player ID or null if failed
 */
export const createPlayer = async ({ name, grade, age }) => {
    try {
        const { data, error } = await supabase
            .from('players')
            .insert([
                {
                    name,
                    grade,
                    age: parseInt(age),
                    game1_score: 0,
                    game2_score: 0,
                    game3_score: 0
                }
            ])
            .select()
            .single()

        if (error) {
            console.error('Error creating player:', error)
            return null
        }

        // Save player ID to localStorage
        localStorage.setItem('currentPlayerId', data.id)
        return data.id
    } catch (err) {
        console.error('Unexpected error creating player:', err)
        return null
    }
}

/**
 * Updates the score for a specific game if the new score is higher
 * @param {number} gameNumber - 1 (Hand Washing), 2 (Tooth Brushing), or 3 (Hair Washing)
 * @param {number} score - The new score to potentially save
 * @returns {Promise<boolean>} - True if score was updated, false otherwise
 */
export const updateScore = async (gameNumber, score) => {
    const playerId = localStorage.getItem('currentPlayerId')
    if (!playerId) {
        console.error('No active session found')
        return false
    }

    // Validate game number
    if (![1, 2, 3].includes(gameNumber)) {
        console.error('Invalid game number. Must be 1, 2, or 3')
        return false
    }

    const scoreColumn = `game${gameNumber}_score`

    try {
        // Fetch current score
        const { data: currentPlayer, error: fetchError } = await supabase
            .from('players')
            .select(scoreColumn)
            .eq('id', playerId)
            .single()

        if (fetchError) {
            console.error('Error fetching current score:', fetchError)
            return false
        }

        const currentScore = currentPlayer[scoreColumn] || 0

        // Only update if new score is higher
        if (score > currentScore) {
            const { error: updateError } = await supabase
                .from('players')
                .update({ [scoreColumn]: score })
                .eq('id', playerId)

            if (updateError) {
                console.error('Error updating score:', updateError)
                return false
            }

            console.log(`Updated ${scoreColumn} from ${currentScore} to ${score}`)
            return true
        } else {
            console.log(`Score ${score} is not higher than current score ${currentScore}. No update.`)
            return false
        }
    } catch (err) {
        console.error('Unexpected error updating score:', err)
        return false
    }
}

/**
 * Tallies all scores, saves to leaderboard, and resets session
 * @returns {Promise<object|null>} - Leaderboard entry object or null
 */
export const completeGameSession = async () => {
    const playerId = localStorage.getItem('currentPlayerId')
    if (!playerId) {
        console.error('No active session found')
        return null
    }

    try {
        // Fetch player data
        const { data: player, error: fetchError } = await supabase
            .from('players')
            .select('name, game1_score, game2_score, game3_score')
            .eq('id', playerId)
            .single()

        if (fetchError) {
            console.error('Error fetching player data:', fetchError)
            return null
        }

        // Calculate total score
        const totalScore = (player.game1_score || 0) + (player.game2_score || 0) + (player.game3_score || 0)

        // Insert into leaderboard
        const { data: leaderboardEntry, error: insertError } = await supabase
            .from('final_leaderboard')
            .insert([
                {
                    name: player.name,
                    total_score: totalScore
                }
            ])
            .select()
            .single()

        if (insertError) {
            console.error('Error inserting into leaderboard:', insertError)
            return null
        }

        // Clear session after successful leaderboard entry
        localStorage.removeItem('currentPlayerId')

        return leaderboardEntry
    } catch (err) {
        console.error('Unexpected error completing game session:', err)
        return null
    }
}

/**
 * Gets the top scores from the leaderboard
 * @param {number} limit - Number of top scores to fetch (default: 10)
 * @returns {Promise<array>} - Array of leaderboard entries
 */
export const getLeaderboard = async (limit = 10) => {
    try {
        const { data, error } = await supabase
            .from('final_leaderboard')
            .select('name, total_score, created_at')
            .order('total_score', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Error fetching leaderboard:', error)
            return []
        }

        return data || []
    } catch (err) {
        console.error('Unexpected error fetching leaderboard:', err)
        return []
    }
}
