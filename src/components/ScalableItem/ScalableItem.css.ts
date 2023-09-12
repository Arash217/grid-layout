import { style, globalStyle } from '@vanilla-extract/css'

export const container = style({
  width: '100%',
  height: '100%',
})

export const scalableItem = style({
  transformOrigin: '0 0',
})

globalStyle(`${ scalableItem } > *`, {
  height: '100%',
  width: '100%'
})

