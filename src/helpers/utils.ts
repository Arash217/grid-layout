import { DraggableData, DraggableEvent } from 'react-draggable'

export type ReactDraggableCallbackData = {
  node: HTMLElement
  x?: number
  y?: number
  deltaX: number
  deltaY: number
  lastX?: number
  lastY?: number
}

export type PartialPosition = { left: number; top: number }
export type DroppingPosition = { left: number; top: number; e: Event }

export type Size = { width: number; height: number }
export type GridDragEvent = {
  e: Event
  node: HTMLElement
  newPosition: PartialPosition
}
export type GridResizeEvent = { e: Event; node: HTMLElement; size: Size }

export type DragOverEvent = MouseEvent & {
  nativeEvent: {
    layerX: number
    layerY: number
  } & Event
}

export type UUID = ReturnType<typeof crypto.randomUUID>
export type LayoutItemID = UUID | string

export type LayoutItem = {
  w: number
  h: number
  x: number
  y: number
  i: LayoutItemID
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  static?: boolean
  isDraggable?: boolean
  isResizable?: boolean
  resizeHandles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>
  isBounded?: boolean
  moved?: boolean
}

export type DroppingItem = LayoutItem & {
  offsetX: number
  offsetY: number
}

export type Layout = readonly LayoutItem[]

export type Position = {
  left: number
  top: number
  width: number
  height: number
}

export type EventCallback = (
  e: Event,
  layout: Layout,
  oldItem?: LayoutItem | null,
  newItem?: LayoutItem | null,
  placeholder?: LayoutItem | null,
  node?: HTMLElement
) => void

export type DroppableEventCallback = (
  e: DraggableEvent,
  data: DraggableData
) => void

export type DroppableEvent = CustomEvent<DraggableData & {
  clientX: number
  clientY: number
}>

export type CompactType = 'horizontal' | 'vertical' | null

export type MouseXY = {
  x: number | null
  y: number | null
}

export function getLayoutItem(layout: Layout, id: LayoutItemID) {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (layout[i].i === id) return layout[i]
  }
}

export function sortLayoutItemsByRowCol(layout: Layout): Layout {
  return layout.slice(0).sort(function (a, b) {
    if (a.y > b.y || (a.y === b.y && a.x > b.x)) {
      return 1
    } else if (a.y === b.y && a.x === b.x) {
      return 0
    }
    return -1
  })
}

export function sortLayoutItemsByColRow(layout: Layout): Layout {
  return layout.slice(0).sort(function (a, b) {
    if (a.x > b.x || (a.x === b.x && a.y > b.y)) {
      return 1
    }
    return -1
  })
}

export function sortLayoutItems(
  layout: Layout,
  compactType: CompactType
): Layout {
  if (compactType === 'horizontal') return sortLayoutItemsByColRow(layout)
  if (compactType === 'vertical') return sortLayoutItemsByRowCol(layout)
  else return layout
}

export function getStatics(layout: Layout): Array<LayoutItem> {
  return layout.filter((l) => l.static)
}

const heightWidth = { x: 'w', y: 'h' }

function resolveCompactionCollision(
  layout: Layout,
  item: LayoutItem,
  moveToCoord: number,
  axis: 'x' | 'y'
) {
  const sizeProp = heightWidth[axis]
  item[axis] += 1
  const itemIndex = layout
    .map((layoutItem) => {
      return layoutItem.i
    })
    .indexOf(item.i)

  // Go through each item we collide with.
  for (let i = itemIndex + 1; i < layout.length; i++) {
    const otherItem = layout[i]
    // Ignore static items
    if (otherItem.static) continue

    // Optimization: we can break early if we know we're past this el
    // We can do this b/c it's a sorted layout
    if (otherItem.y > item.y + item.h) break

    if (collides(item, otherItem)) {
      resolveCompactionCollision(
        layout,
        otherItem,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        moveToCoord + item[sizeProp],
        axis
      )
    }
  }

  item[axis] = moveToCoord
}

export function compactItem(
  compareWith: Layout,
  l: LayoutItem,
  compactType: CompactType,
  cols: number,
  fullLayout: Layout,
  allowOverlap: boolean | undefined
): LayoutItem {
  const compactV = compactType === 'vertical'
  const compactH = compactType === 'horizontal'
  if (compactV) {
    // Bottom 'y' possible is the bottom of the layout.
    // This allows you to do nice stuff like specify {y: Infinity}
    // This is here because the layout must be sorted in order to get the correct bottom `y`.
    l.y = Math.min(bottom(compareWith), l.y)
    // Move the element up as far as it can go without colliding.
    while (l.y > 0 && !getFirstCollision(compareWith, l)) {
      l.y--
    }
  } else if (compactH) {
    // Move the element left as far as it can go without colliding.
    while (l.x > 0 && !getFirstCollision(compareWith, l)) {
      l.x--
    }
  }

  // Move it down, and keep moving it down if it's colliding.
  let collides
  // Checking the compactType null value to avoid breaking the layout when overlapping is allowed.
  while (
    (collides = getFirstCollision(compareWith, l)) &&
    !(compactType === null && allowOverlap)
  ) {
    if (compactH) {
      resolveCompactionCollision(fullLayout, l, collides.x + collides.w, 'x')
    } else {
      resolveCompactionCollision(fullLayout, l, collides.y + collides.h, 'y')
    }
    // Since we can't grow without bounds horizontally, if we've overflown, let's move it down and try again.
    if (compactH && l.x + l.w > cols) {
      l.x = cols - l.w
      l.y++
      // ALso move element as left as we can
      while (l.x > 0 && !getFirstCollision(compareWith, l)) {
        l.x--
      }
    }
  }

  // Ensure that there are no negative positions
  l.y = Math.max(l.y, 0)
  l.x = Math.max(l.x, 0)

  return l
}

export function compact(
  layout: Layout,
  compactType: CompactType,
  cols: number,
  allowOverlap: boolean | undefined
): Layout {
  // Statics go in the compareWith array right away so items flow around them.
  const compareWith = getStatics(layout)
  // We go through the items by row and column.
  const sorted = sortLayoutItems(layout, compactType)
  // Holding for new items.
  const out = Array(layout.length)

  for (let i = 0, len = sorted.length; i < len; i++) {
    let l = cloneLayoutItem(sorted[i])

    // Don't move static elements
    if (!l.static) {
      l = compactItem(compareWith, l, compactType, cols, sorted, allowOverlap)

      // Add to comparison array. We only collide with items before this one.
      // Statics are already in this array.
      compareWith.push(l)
    }

    // Add to output array to make sure they still come out in the right order.
    out[layout.indexOf(sorted[i])] = l

    // Clear moved flag, if it exists.
    l.moved = false
  }

  return out
}

export function collides(l1: LayoutItem, l2: LayoutItem): boolean {
  if (l1.i === l2.i) return false // same element
  if (l1.x + l1.w <= l2.x) return false // l1 is left of l2
  if (l1.x >= l2.x + l2.w) return false // l1 is right of l2
  if (l1.y + l1.h <= l2.y) return false // l1 is above l2
  if (l1.y >= l2.y + l2.h) return false // l1 is below l2
  return true // boxes overlap
}

export function mouseInGrid(mouseXY: MouseXY, grid: HTMLDivElement) {
  const gridRect = grid.getBoundingClientRect()

  if (
    mouseXY.x &&
    mouseXY.y &&
    mouseXY.x > gridRect.left &&
    mouseXY.x < gridRect.right &&
    mouseXY.y > gridRect.top &&
    mouseXY.y < gridRect.bottom
  ) {
    return true
  }

  return false
}

export function getAllCollisions(
  layout: Layout,
  layoutItem: LayoutItem
): Array<LayoutItem> {
  return layout.filter((l) => collides(l, layoutItem))
}

export function cloneLayout(layout: Layout): Layout {
  const newLayout = Array(layout.length)
  for (let i = 0, len = layout.length; i < len; i++) {
    newLayout[i] = cloneLayoutItem(layout[i])
  }
  return newLayout
}

export function moveElement(
  layout: Layout,
  l: LayoutItem,
  x: number | undefined,
  y: number | undefined,
  isUserAction: boolean | undefined,
  preventCollision: boolean | undefined,
  compactType: CompactType,
  cols: number,
  allowOverlap: boolean | undefined
): Layout {
  if (l.static && l.isDraggable !== true) return layout

  if (l.y === y && l.x === x) return layout

  const oldX = l.x
  const oldY = l.y

  if (typeof x === 'number') l.x = x
  if (typeof y === 'number') l.y = y
  l.moved = true

  let sorted = sortLayoutItems(layout, compactType)
  const movingUp =
    compactType === 'vertical' && typeof y === 'number'
      ? oldY >= y
      : compactType === 'horizontal' && typeof x === 'number'
      ? oldX >= x
      : false

  if (movingUp) sorted = sorted.slice(0).reverse()
  const collisions = getAllCollisions(sorted, l)
  const hasCollisions = collisions.length > 0

  if (hasCollisions && allowOverlap) {
    return cloneLayout(layout)
  } else if (hasCollisions && preventCollision) {
    l.x = oldX
    l.y = oldY
    l.moved = false
    return layout // did not change so don't clone
  }

  // Move each item that collides away from this element.
  for (let i = 0, len = collisions.length; i < len; i++) {
    const collision = collisions[i]

    // Short circuit so we can't infinite loop
    if (collision.moved) continue

    // Don't move static items - we have to move *this* element away
    if (collision.static) {
      layout = moveElementAwayFromCollision(
        layout,
        collision,
        l,
        isUserAction,
        compactType,
        cols
      )
    } else {
      layout = moveElementAwayFromCollision(
        layout,
        l,
        collision,
        isUserAction,
        compactType,
        cols
      )
    }
  }

  return layout
}

export function getFirstCollision(layout: Layout, layoutItem: LayoutItem) {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (collides(layout[i], layoutItem)) return layout[i]
  }
}

export function moveElementAwayFromCollision(
  layout: Layout,
  collidesWith: LayoutItem,
  itemToMove: LayoutItem,
  isUserAction: boolean | undefined,
  compactType: CompactType,
  cols: number
): Layout {
  const compactH = compactType === 'horizontal'
  // Compact vertically if not set to horizontal
  const compactV = compactType !== 'horizontal'
  const preventCollision = collidesWith.static // we're already colliding (not for static items)

  // If there is enough space above the collision to put this element, move it there.
  // We only do this on the main collision as this can get funky in cascades and cause
  // unwanted swapping behavior.
  if (isUserAction) {
    // Reset isUserAction flag because we're not in the main collision anymore.
    isUserAction = false

    // Make a mock item so we don't modify the item here, only modify in moveElement.
    const fakeItem: LayoutItem = {
      x: compactH ? Math.max(collidesWith.x - itemToMove.w, 0) : itemToMove.x,
      y: compactV ? Math.max(collidesWith.y - itemToMove.h, 0) : itemToMove.y,
      w: itemToMove.w,
      h: itemToMove.h,
      i: '-1',
    }

    // No collision? If so, we can go up there; otherwise, we'll end up moving down as normal
    if (!getFirstCollision(layout, fakeItem)) {
      return moveElement(
        layout,
        itemToMove,
        compactH ? fakeItem.x : undefined,
        compactV ? fakeItem.y : undefined,
        isUserAction,
        preventCollision,
        compactType,
        cols,
        undefined
      )
    }
  }

  return moveElement(
    layout,
    itemToMove,
    compactH ? itemToMove.x + 1 : undefined,
    compactV ? itemToMove.y + 1 : undefined,
    isUserAction,
    preventCollision,
    compactType,
    cols,
    undefined
  )
}

export function perc(num: number): string {
  return num * 100 + '%'
}

export function getTranslatePosition(left: number, top: number) {
  return `translate3d(${left}px, ${top}px, 0)`
}

export function setTransform({ top, left, width, height }: Position) {
  const translate = getTranslatePosition(left, top)

  return {
    transform: translate,
    width: `${width}px`,
    height: `${height}px`,
    position: 'absolute',
  }
}

export function setTopLeft({ top, left, width, height }: Position) {
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
    position: 'absolute',
  }
}

export function bottom(layout: Layout): number {
  let max = 0,
    bottomY

  for (let i = 0, len = layout.length; i < len; i++) {
    bottomY = layout[i].y + layout[i].h
    if (bottomY > max) max = bottomY
  }

  return max
}

export function modifyLayout(layout: Layout, layoutItem: LayoutItem): Layout {
  const newLayout = Array(layout.length)

  for (let i = 0, len = layout.length; i < len; i++) {
    if (layoutItem.i === layout[i].i) {
      newLayout[i] = layoutItem
    } else {
      newLayout[i] = layout[i]
    }
  }

  return newLayout
}

export function withLayoutItem(
  layout: Layout,
  itemKey: LayoutItemID,
  cb: (layoutItem: LayoutItem) => LayoutItem
): [Layout, LayoutItem | null] {
  let item = getLayoutItem(layout, itemKey)
  if (!item) return [layout, null]

  item = cb(cloneLayoutItem(item))
  layout = modifyLayout(layout, item)

  return [layout, item]
}

export function cloneLayoutItem(layoutItem: LayoutItem): LayoutItem {
  return {
    w: layoutItem.w,
    h: layoutItem.h,
    x: layoutItem.x,
    y: layoutItem.y,
    i: layoutItem.i,
    minW: layoutItem.minW,
    maxW: layoutItem.maxW,
    minH: layoutItem.minH,
    maxH: layoutItem.maxH,
    moved: Boolean(layoutItem.moved),
    static: Boolean(layoutItem.static),
    // These can be null/undefined
    isDraggable: layoutItem.isDraggable,
    isResizable: layoutItem.isResizable,
    resizeHandles: layoutItem.resizeHandles,
    isBounded: layoutItem.isBounded,
  }
}

export function getCompactType(props: {
  verticalCompact: boolean
  compactType: CompactType
}): CompactType {
  const { verticalCompact, compactType } = props || {}
  return verticalCompact === false ? null : compactType
}

export const noop = () => {}

export const LIB_PREFIX = 'gl'

export function getClientPosition(e: DraggableEvent) {
  let x
  let y

  if (
    e.type == 'touchstart' ||
    e.type == 'touchmove' ||
    e.type == 'touchend' ||
    e.type == 'touchcancel'
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const evt: TouchEvent = typeof e.originalEvent === 'undefined' ? e : e.originalEvent
    const touch = evt.touches[0] || evt.changedTouches[0]
    x = touch.pageX
    y = touch.pageY
  } else if (
    e.type == 'mousedown' ||
    e.type == 'mouseup' ||
    e.type == 'mousemove' ||
    e.type == 'mouseover' ||
    e.type == 'mouseout' ||
    e.type == 'mouseenter' ||
    e.type == 'mouseleave'
  ) {
    const evt = e as MouseEvent
    x = evt.clientX
    y = evt.clientY
  }

  return {
    x,
    y,
  }
}
