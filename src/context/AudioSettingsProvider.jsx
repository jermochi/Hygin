import { useState, useEffect, useRef } from 'react'
import { AudioSettingsContext } from './AudioSettingsContext'

export const AudioSettingsProvider = ({ children }) => {
  const [isMuted, setIsMuted] = useState(false)
  const audioElementsRef = useRef(new Set())

  // Register an audio element to be controlled by the mute state
  const registerAudio = (audioElement) => {
    if (audioElement) {
      audioElementsRef.current.add(audioElement)
      audioElement.muted = isMuted
    }
  }

  // Unregister an audio element
  const unregisterAudio = (audioElement) => {
    if (audioElement) {
      audioElementsRef.current.delete(audioElement)
    }
  }

  // Toggle mute state
  const toggleMute = () => {
    setIsMuted(prev => !prev)
  }

  // Update all registered audio elements when mute state changes
  useEffect(() => {
    audioElementsRef.current.forEach(audio => {
      if (audio) {
        audio.muted = isMuted
      }
    })
  }, [isMuted])

  return (
    <AudioSettingsContext.Provider
      value={{
        isMuted,
        toggleMute,
        setIsMuted,
        registerAudio,
        unregisterAudio
      }}
    >
      {children}
    </AudioSettingsContext.Provider>
  )
}
