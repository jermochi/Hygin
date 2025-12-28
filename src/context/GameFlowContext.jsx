import { createContext, useContext, useState, useEffect } from 'react'

const GameFlowContext = createContext(null)

const GAME_ORDER = [
    { path: '/hairwashing', name: 'Hair Washing', index: 0 },
    { path: '/toothbrushing', name: 'Tooth Brushing', index: 1 },
    { path: '/handwashing', name: 'Handwashing', index: 2 }
]

export const GameFlowProvider = ({ children }) => {
    const [currentGameIndex, setCurrentGameIndex] = useState(() => {
        const saved = localStorage.getItem('gameFlowIndex')
        return saved !== null ? parseInt(saved, 10) : -1 // -1 means not started
    })

    const [isFlowActive, setIsFlowActive] = useState(() => {
        return currentGameIndex >= 0 && currentGameIndex < GAME_ORDER.length
    })

    // Persist to localStorage
    useEffect(() => {
        if (currentGameIndex >= 0) {
            localStorage.setItem('gameFlowIndex', currentGameIndex.toString())
        } else {
            localStorage.removeItem('gameFlowIndex')
        }
    }, [currentGameIndex])

    const startGameFlow = () => {
        setCurrentGameIndex(0)
        setIsFlowActive(true)
    }

    const completeCurrentGame = () => {
        setCurrentGameIndex(prev => prev + 1)
        if (currentGameIndex + 1 >= GAME_ORDER.length) {
            setIsFlowActive(false)
        }
    }

    const resetFlow = () => {
        setCurrentGameIndex(-1)
        setIsFlowActive(false)
        localStorage.removeItem('gameFlowIndex')
    }

    const canAccessGame = (gameIndex) => {
        // Can access if not started yet (for free play fallback)
        // OR if it's the current game in the flow
        // OR if the flow is complete (all games done)
        if (currentGameIndex === -1) return true // Not in flow mode
        return gameIndex <= currentGameIndex
    }

    const getCurrentGamePath = () => {
        if (currentGameIndex < 0 || currentGameIndex >= GAME_ORDER.length) {
            return null
        }
        return GAME_ORDER[currentGameIndex].path
    }

    const value = {
        currentGameIndex,
        isFlowActive,
        startGameFlow,
        completeCurrentGame,
        resetFlow,
        canAccessGame,
        getCurrentGamePath,
        GAME_ORDER
    }

    return (
        <GameFlowContext.Provider value={value}>
            {children}
        </GameFlowContext.Provider>
    )
}

export const useGameFlow = () => {
    const context = useContext(GameFlowContext)
    if (!context) {
        throw new Error('useGameFlow must be used within GameFlowProvider')
    }
    return context
}
