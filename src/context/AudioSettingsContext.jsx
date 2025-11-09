import { createContext } from 'react'

// Provide a small default shape so consumers can destructure safely
export const AudioSettingsContext = createContext({
  isMuted: false,
  toggleMute: () => {},
  setIsMuted: () => {},
  registerAudio: () => {},
  unregisterAudio: () => {}
})

