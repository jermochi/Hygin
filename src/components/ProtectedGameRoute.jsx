import { Navigate } from 'react-router-dom'
import { useGameFlow } from '../context/GameFlowContext'

const ProtectedGameRoute = ({ gameIndex, children }) => {
    const { canAccessGame, getCurrentGamePath, isFlowActive } = useGameFlow()

    // If flow is not active, allow free access
    if (!isFlowActive) {
        return children
    }

    // Check if player can access this game
    if (!canAccessGame(gameIndex)) {
        // Redirect to the current game they should be on
        const correctPath = getCurrentGamePath()
        return <Navigate to={correctPath || '/'} replace />
    }

    return children
}

export default ProtectedGameRoute
