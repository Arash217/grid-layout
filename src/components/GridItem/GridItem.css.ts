import { style } from '@vanilla-extract/css'

export const staticStyle = style({
  cursor: 'auto',
  userSelect: 'none',
})

export const draggable = style({
  cursor: 'move',
})

export const resizing = style({
  opacity: 0.7,
})

export const dragging = style({
  zIndex: 1,
})

export const dropping = style({
  visibility: 'hidden',
})
