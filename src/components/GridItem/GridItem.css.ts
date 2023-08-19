import { style } from '@vanilla-extract/css'

export const gridItemStaticStyles = style({
  cursor: 'auto',
  userSelect: 'none',
})

export const gridItemDraggableStyles = style({
  cursor: 'move',
})

export const gridItemResizingStyles = style({
  opacity: 0.7,
})

export const gridItemDraggingStyles = style({
  zIndex: 1,
})

export const gridItemDroppingStyles = style({
  visibility: 'hidden',
})
