import { style } from '@vanilla-extract/css'

export const droppableItem = style({
  cursor: 'grab',
})

export const droppingItem = style({
  display: 'flex',
  opacity: 0.7,
  position: 'absolute',
  top: 0,
  left: 0,
  transformOrigin: '0 0',
})