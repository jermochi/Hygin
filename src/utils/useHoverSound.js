import { useEffect, useRef } from 'react';
import hoverSoundFx from '../assets/sounds/hover-soundfx.wav';

export const useHoverSound = () => {
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize the audio
    audioRef.current = new Audio(hoverSoundFx);
    
    // Function to play the sound
    const playSound = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0; // Reset to start
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
      }
    };

    // Add global hover listener
    const handleHover = (e) => {
      // List of elements that should trigger hover sound
      const hoverableElements = [
        'button',
        'a',
        '.thumbnail',
        '.choice-box',
        '.toothpaste-img',
        '.water-glass',
        '.logo-link',
        '.medal-item.earned'
      ];

      // Check if the hovered element or its parent matches our criteria
      const isHoverable = hoverableElements.some(selector => 
        e.target.matches(selector) || e.target.closest(selector)
      );

      if (isHoverable) {
        playSound();
      }
    };

    // Add the event listener
    document.addEventListener('mouseover', handleHover);

    return () => {
      document.removeEventListener('mouseover', handleHover);
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);
};