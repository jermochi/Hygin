// Shared utility to map scores (0-100) to tiers
// Excellent: 75-100, Good: 50-74, Poor: 0-49

export function getTierLabel(score) {
  const s = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0
  if (s >= 75) return 'Excellent'
  if (s >= 50) return 'Good'
  return 'Poor'
}

export function getTierClass(score) {
  const label = getTierLabel(score)
  if (label === 'Excellent') return 'tier-excellent'
  if (label === 'Good') return 'tier-good'
  return 'tier-poor'
}

export function getTierColorHex(score) {
  const label = getTierLabel(score)
  if (label === 'Excellent') return '#27ae60' // Green
  if (label === 'Good') return '#f1c40f'     // Yellow
  return '#e74c3c'                           // Red
}
