import { DraggableData, DraggableEvent } from 'react-draggable'
import { Position, getClientPosition } from './utils'

export type PositionParams = {
  margin: [number, number]
  containerPadding: [number, number]
  containerWidth: number
  containerHeight: number
  cols: number
  rows: number
}

export function calcGridColWidth(positionParams: PositionParams): number {
  const { margin, containerPadding, containerWidth, cols } = positionParams

  return (
    (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols
  )
}

export function calcGridRowHeight(positionParams: PositionParams): number {
  const { margin, containerPadding, containerHeight, rows } = positionParams

  return (
    (containerHeight - margin[0] * (rows - 1) - containerPadding[0] * 2) / rows
  )
}

export function calcGridItemWHPx(
  gridUnits: number,
  colOrRowSize: number,
  marginPx: number
): number {
  // 0 * Infinity === NaN, which causes problems with resize contraints
  if (!Number.isFinite(gridUnits)) return gridUnits

  return Math.round(
    colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx
  )
}

export function calcGridItemPosition(
  positionParams: PositionParams,
  x: number,
  y: number,
  w: number,
  h: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state?: any
): Position {
  const { margin, containerPadding } = positionParams
  const colWidth = calcGridColWidth(positionParams)
  const rowHeight = calcGridRowHeight(positionParams)

  const out: Position = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  }

  // If resizing, use the exact width and height as returned from resizing callbacks.
  if (state && state.resizing) {
    out.width = Math.round(state.resizing.width)
    out.height = Math.round(state.resizing.height)
  }
  // Otherwise, calculate from grid units.
  else {
    out.width = calcGridItemWHPx(w, colWidth, margin[0])
    out.height = calcGridItemWHPx(h, rowHeight, margin[1])
  }

  // If dragging, use the exact width and height as returned from dragging callbacks.
  if (state && state.dragging) {
    out.top = Math.round(state.dragging.top)
    out.left = Math.round(state.dragging.left)
  }
  // Otherwise, calculate from grid units.
  else {
    out.top = Math.round((rowHeight + margin[1]) * y + containerPadding[1])
    out.left = Math.round((colWidth + margin[0]) * x + containerPadding[0])
  }

  return out
}

export function calcXY(
  positionParams: PositionParams,
  top: number,
  left: number,
  w: number,
  h: number
): { x: number; y: number } {
  const { margin, cols, rows } = positionParams
  const colWidth = calcGridColWidth(positionParams)
  const rowHeight = calcGridRowHeight(positionParams)

  let x = Math.round((left - margin[0]) / (colWidth + margin[0]))
  let y = Math.round((top - margin[1]) / (rowHeight + margin[1]))

  x = clamp(x, 0, cols - w)
  y = clamp(y, 0, rows - h)
  
  return { x, y }
}

export function calcWH(
  positionParams: PositionParams,
  width: number,
  height: number,
  x: number,
  y: number
): { w: number, h: number } {
  const { margin, rows, cols } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const rowHeight = calcGridRowHeight(positionParams)

  let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
  let h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

  // Capping
  w = clamp(w, 0, cols - x);
  h = clamp(h, 0, rows - y);
  return { w, h };
}

export function clamp(
  num: number,
  lowerBound: number,
  upperBound: number
): number {
  return Math.max(Math.min(num, upperBound), lowerBound)
}

export function getRelativePosition(el: HTMLElement) {
  const rect = el.getBoundingClientRect()

  const left = rect.left + window.scrollX
  const top = rect.top + window.scrollY

  return {
    left,
    top
  }
}

export function getOffset(e: DraggableEvent, data: DraggableData) {
  const clientPosition = getClientPosition(e)
  const rect = data.node.getBoundingClientRect()

  const left = clientPosition.clientX! - rect.left
  const top = clientPosition.clientY! - rect.top

  return {
    left,
    top
  }
}