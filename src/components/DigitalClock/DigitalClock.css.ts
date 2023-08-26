import { style, keyframes } from '@vanilla-extract/css'

const highlight = keyframes({
    '0%': {
      transform: 'scale(1)',
      border: '0.5cqw solid blue'
    },

    '100%': {
      transform: 'scale(1.5)',
      border: '0.5cqw solid transparent'
    }
  
})

export const digitalClock = style({
  position: 'absolute',
  width: '100%',
  height: '100%',
  animation: `${highlight} 1.5s infinite linear`
})
