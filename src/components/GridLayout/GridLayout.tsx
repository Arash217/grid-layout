import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { GridItem } from '../GridItem'
import {
  CompactType,
  EventCallback,
  GridDragEvent,
  GridResizeEvent,
  Layout,
  LayoutItem,
  cloneLayoutItem,
  compact,
  getCompactType,
  getLayoutItem,
  moveElement,
  noop,
  withLayoutItem,
  getAllCollisions,
  DragOverEvent,
  DroppingPosition,
  DroppingItem,
  LayoutItemID,
  mouseInGrid,
} from '../../helpers/utils'

import { deepEqual } from 'fast-equals'

import { ResizeHandle, ResizeHandleAxis } from '../GridItem/GridItem'
import { PositionParams, calcXY } from '../../helpers/calculateUtils'

import clsx from 'clsx'
import { gridLayoutStyles } from './GridLayout.css'

export type Props = {
  children: ReactElement | ReactElement[]
  className?: string
  style?: Record<string, string>
  layout: Layout
  cols: number
  rows: number
  width: number
  height: number
  margin?: [number, number]
  containerPadding?: [number, number]
  maxRows?: number
  useCSSTransforms?: boolean
  autoSize?: boolean
  showGridLines?: boolean
  isDraggable?: boolean
  isResizable?: boolean
  isDroppable?: boolean
  isBounded?: boolean
  transformScale?: number
  allowOverlap?: boolean
  preventCollision?: boolean
  verticalCompact?: boolean
  compactType?: CompactType
  resizeHandles?: ResizeHandleAxis[]
  resizeHandle?: ResizeHandle
  droppingItem?: DroppingItem

  onLayoutChange?: (layout: Layout) => void
  onDragStart?: EventCallback
  onDrag?: EventCallback
  onDragStop?: EventCallback

  onResize?: EventCallback
  onResizeStart?: EventCallback
  onResizeStop?: EventCallback

  onDrop?: (
    layout: Layout,
    item: Omit<LayoutItem, 'i'> | undefined,
    e: Event
  ) => void
  onDropDragOver?: (
    e: DragOverEvent
  ) => { w?: number; h?: number } | false | null | undefined
}

function GridLayout(props: Props) {
  const {
    children,
    className = '',
    style = {},
    layout: initialLayout,
    cols,
    rows,
    width,
    height,
    margin = [0, 0],
    containerPadding = [0, 0],
    useCSSTransforms = true,
    showGridLines = false,
    isDraggable = false,
    isResizable = false,
    isBounded = false,
    transformScale = 1,
    allowOverlap = false,
    preventCollision = true,
    verticalCompact = true,
    compactType = 'vertical',
    onLayoutChange = noop,
    onDragStart: onItemDragStart = noop,
    onDrag: onItemDrag = noop,
    onDragStop: onItemDragStop = noop,
    onResizeStart: onItemResizeStart = noop,
    onResize: onItemResize = noop,
    onDragStop: onItemResizeStop = noop,
    onDrop: onItemDrop = noop,
    resizeHandles = ['se'],
    resizeHandle,
    droppingItem,
  } = props

  let { isDroppable = false } = props

  const [layout, setLayout] = useState(initialLayout)
  const [oldDragItem, setOldDragItem] = useState<LayoutItem | null>(null)
  const [oldResizeItem, setOldResizeItem] = useState<LayoutItem | null>(null)
  const [oldLayout, setOldLayout] = useState<Layout | null>(null)
  const [activeDrag, setActiveDrag] = useState<LayoutItem | null>(null)
  const [droppingDOMNode, setDroppingDOMNode] = useState<ReactElement | null>(
    null
  )
  const [droppingPosition, setDroppingPosition] = useState<
    DroppingPosition | undefined
  >()

  const gridLayoutRef = useRef<HTMLDivElement | null>(null)

  isDroppable = isDroppable && Boolean(droppingItem)
  const isDraggableAndDroppable = isDroppable && isDraggable

  useEffect(() => {
    setLayout(initialLayout)
  }, [initialLayout])


  const onDragStart = useCallback(
    (i: LayoutItemID, _x: number, _y: number, { e, node }: GridDragEvent) => {
      const l = getLayoutItem(layout, i)
      if (!l) return

      setOldDragItem(cloneLayoutItem(l))
      setOldLayout(layout)

      // TODO:: check whether this type is correct
      return onItemDragStart(e as Event, layout, l, l, null, node)
    },
    [layout, onItemDragStart]
  )

  const onDrag = useCallback(
    (i: LayoutItemID, x: number, y: number, { e, node }: GridDragEvent) => {
      const l = getLayoutItem(layout, i)
      if (!l) return

      // Create placeholder (display only)
      const placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        placeholder: true,
        i: i,
      }

      // Move the element to the dragged location.
      const isUserAction = true
      const newLayout = moveElement(
        layout,
        l,
        x,
        y,
        isUserAction,
        preventCollision,
        getCompactType({
          verticalCompact,
          compactType,
        }),
        cols,
        allowOverlap
      )

      // TODO:: check whether this type is correct
      onItemDrag(e as Event, newLayout, oldDragItem, l, placeholder, node)

      setLayout(
        allowOverlap
          ? newLayout
          : compact(
              newLayout,
              getCompactType({
                verticalCompact,
                compactType,
              }),
              cols,
              undefined
            )
      )

      setActiveDrag(placeholder)
    },
    [
      allowOverlap,
      cols,
      compactType,
      layout,
      oldDragItem,
      onItemDrag,
      preventCollision,
      verticalCompact,
    ]
  )

  const onLayoutMaybeChanged = useCallback(
    (newLayout: Layout, oldLayout: Layout | null) => {
      if (!oldLayout) oldLayout = layout

      if (!deepEqual(oldLayout, newLayout)) {
        onLayoutChange(newLayout)
      }
    },
    [layout, onLayoutChange]
  )

  const onDragStop = useCallback(
    (i: LayoutItemID, x: number, y: number, { e, node }: GridDragEvent) => {
      if (!activeDrag) return

      const l = getLayoutItem(layout, i)
      if (!l) return

      const isUserAction = true
      let newLayout = moveElement(
        layout,
        l,
        x,
        y,
        isUserAction,
        preventCollision,
        getCompactType({
          verticalCompact,
          compactType,
        }),
        cols,
        allowOverlap
      )

      newLayout = allowOverlap
        ? layout
        : compact(
            layout,
            getCompactType({
              verticalCompact,
              compactType,
            }),
            cols,
            undefined
          )

      // TODO:: check whether this type is correct
      onItemDragStop(e as Event, newLayout, oldDragItem, l, null, node)

      setActiveDrag(null)
      setLayout(newLayout)
      setOldDragItem(null)
      setOldLayout(null)

      onLayoutMaybeChanged(newLayout, oldLayout)
    },
    [
      activeDrag,
      allowOverlap,
      cols,
      compactType,
      layout,
      oldDragItem,
      oldLayout,
      onItemDragStop,
      onLayoutMaybeChanged,
      preventCollision,
      verticalCompact,
    ]
  )

  const onResizeStart = useCallback(
    (i: LayoutItemID, _w: number, _h: number, { e, node }: GridResizeEvent) => {
      const l = getLayoutItem(layout, i)
      if (!l) return

      setOldResizeItem(cloneLayoutItem(l))
      setOldLayout(layout)

      onItemResizeStart(e, layout, l, l, null, node)
    },
    [layout, onItemResizeStart]
  )

  const onResize = useCallback(
    (i: LayoutItemID, w: number, h: number, { e, node }: GridResizeEvent) => {
      const [newLayout, l] = withLayoutItem(layout, i, (l) => {
        // Something like quad tree should be used
        // to find collisions faster
        const oldW = l.w
        const oldH = l.h
        let hasCollisions

        if (preventCollision && !allowOverlap) {
          const collisions = getAllCollisions(layout, { ...l, w, h }).filter(
            (layoutItem) => layoutItem.i !== l.i
          )
          hasCollisions = collisions.length > 0

          if (hasCollisions) {
            l.w = oldW
            l.h = oldH
          }
        }

        if (!hasCollisions) {
          // Set new width and height.
          l.w = w
          l.h = h
        }

        return l
      })

      // Create placeholder element (display only)
      const placeholder = {
        w: l!.w,
        h: l!.h,
        x: l!.x,
        y: l!.y,
        static: true,
        i: i,
      }

      onItemResize(e, newLayout, oldResizeItem, l, placeholder, node)

      setLayout(
        allowOverlap
          ? newLayout
          : compact(
              newLayout,
              getCompactType({ verticalCompact, compactType }),
              cols,
              undefined
            )
      )

      setActiveDrag(placeholder)
    },
    [
      allowOverlap,
      cols,
      compactType,
      layout,
      oldResizeItem,
      onItemResize,
      preventCollision,
      verticalCompact,
    ]
  )

  const onResizeStop = useCallback(
    (i: LayoutItemID, _w: number, _h: number, { e, node }: GridResizeEvent) => {
      const l = getLayoutItem(layout, i)

      const newLayout = allowOverlap
        ? layout
        : compact(
            layout,
            getCompactType({ compactType, verticalCompact }),
            cols,
            undefined
          )

      onItemResizeStop(e, newLayout, oldResizeItem, l, null, node)

      setActiveDrag(null)
      setLayout(newLayout)
      setOldResizeItem(null)
      setOldLayout(null)

      onLayoutMaybeChanged(newLayout, oldLayout)
    },
    [
      allowOverlap,
      cols,
      compactType,
      layout,
      oldLayout,
      oldResizeItem,
      onItemResizeStop,
      onLayoutMaybeChanged,
      verticalCompact,
    ]
  )

  const removeDroppingPlaceholder = useCallback(() => {
    const newLayout = compact(
      layout.filter((l) => l.i !== droppingItem!.i),
      getCompactType({
        compactType,
        verticalCompact,
      }),
      cols,
      allowOverlap
    )

    setLayout(newLayout)
    setDroppingDOMNode(null)
    setActiveDrag(null)
    setDroppingPosition(undefined)
  }, [allowOverlap, cols, compactType, droppingItem, layout, verticalCompact])

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (!isDraggableAndDroppable) return

      e.preventDefault() // Prevent any browser native action
      e.stopPropagation()

      const mouseXY = {
        x: e.clientX,
        y: e.clientY,
      }

      const gridLayout = gridLayoutRef.current!
      const gridRect = gridLayout.getBoundingClientRect()
      const isMouseInGrid = mouseInGrid(mouseXY, gridLayout)

      const top = mouseXY.y - droppingItem!.offsetTop - gridRect.top
      const left = mouseXY.x - droppingItem!.offsetLeft - gridRect.left

      const newDroppingPosition = {
        top,
        left,
        e,
        offsetLeft: droppingItem!.offsetLeft,
        offsetTop: droppingItem!.offsetTop,
      }

      if (isMouseInGrid && !droppingDOMNode) {
        const positionParams: PositionParams = {
          cols,
          margin,
          rows,
          containerHeight: height,
          containerWidth: width,
          containerPadding: containerPadding || margin,
        }

        const calculatedPosition = calcXY(
          positionParams,
          newDroppingPosition.top,
          newDroppingPosition.left,
          droppingItem!.w,
          droppingItem!.h
        )

        const finalDroppingItem = {
          ...droppingItem!,
          ...calculatedPosition,
        }

        const collisions = getAllCollisions(layout, finalDroppingItem)
        const hasCollisions = collisions.length > 0

        if (!hasCollisions) {
          setDroppingDOMNode(<div key={finalDroppingItem.i} />)
          setDroppingPosition(newDroppingPosition)
          setLayout([
            ...layout,
            {
              ...finalDroppingItem,
              x: calculatedPosition.x,
              y: calculatedPosition.y,
              static: false,
              isDraggable: true,
            },
          ])
        }
      } else if (droppingPosition) {
        if (isMouseInGrid) {
          setDroppingPosition(newDroppingPosition)
        } else {
          removeDroppingPlaceholder()
          const newLayout = layout.filter((item) => item.i !== droppingItem!.i)
          setLayout(newLayout)
        }
      }
    },
    [
      cols,
      containerPadding,
      droppingDOMNode,
      droppingItem,
      droppingPosition,
      height,
      isDraggableAndDroppable,
      layout,
      margin,
      removeDroppingPlaceholder,
      rows,
      width,
    ]
  )

  const onDrop = useCallback(
    (e: DragEvent) => {
      if (!isDraggableAndDroppable) return

      e.preventDefault()
      e.stopPropagation()

      const mouseXY = {
        x: e.clientX,
        y: e.clientY,
      }

      const isMouseInGrid = mouseInGrid(mouseXY, gridLayoutRef.current!)

      if (isMouseInGrid) {
        const gridRect = gridLayoutRef.current!.getBoundingClientRect()

        const newDroppingPosition = {
          top: mouseXY.y - droppingItem!.offsetTop - gridRect.top,
          left: mouseXY.x - droppingItem!.offsetLeft - gridRect.left,
          e,
        }

        const positionParams: PositionParams = {
          cols,
          margin,
          rows,
          containerHeight: height,
          containerWidth: width,
          containerPadding: containerPadding || margin,
        }

        const calculatedPosition = calcXY(
          positionParams,
          newDroppingPosition.top,
          newDroppingPosition.left,
          droppingItem!.w,
          droppingItem!.h
        )

        const finalDroppingItem = {
          ...droppingItem!,
          ...calculatedPosition,
        }

        const collisions = getAllCollisions(layout, finalDroppingItem)
        const hasCollisions = collisions.length > 0

        if (!hasCollisions || droppingPosition !== undefined) {
          const item = layout.find((l) => l.i === droppingItem!.i)!

          const drop = {
            ...item,
            i: undefined,
          }

          onItemDrop(layout, drop, e)
        }
      }
      removeDroppingPlaceholder()
    },
    [
      cols,
      containerPadding,
      droppingItem,
      droppingPosition,
      height,
      isDraggableAndDroppable,
      layout,
      margin,
      onItemDrop,
      removeDroppingPlaceholder,
      rows,
      width,
    ]
  )

  useEffect(() => {
    document.addEventListener('dragover', onDragOver)
    return () =>
      document.removeEventListener('dragover', onDragOver)
  }, [onDragOver])

  useEffect(() => {
    document.addEventListener('drop', onDrop)
    return () => document.removeEventListener('drop', onDrop)
  }, [onDrop])

  const placeholder = useCallback(() => {
    if (!activeDrag) return null

    return (
      <GridItem
        style={{
          background: 'green',
          opacity: '0.3',
          transitionProperty: 'transform, width, height',
          transitionDuration: '100ms',
        }}
        w={activeDrag.w}
        h={activeDrag.h}
        x={activeDrag.x}
        y={activeDrag.y}
        i={activeDrag.i}
        className="react-grid-placeholder"
        containerWidth={width}
        containerHeight={height}
        cols={cols}
        rows={rows}
        margin={margin}
        containerPadding={containerPadding || margin}
        isDraggable={false}
        isResizable={false}
        isBounded={false}
        useCSSTransforms={useCSSTransforms}
        transformScale={transformScale}
        gridLayoutRef={gridLayoutRef}
      >
        <div />
      </GridItem>
    )
  }, [
    activeDrag,
    cols,
    containerPadding,
    height,
    margin,
    rows,
    transformScale,
    useCSSTransforms,
    width,
  ])

  const processGridItem = useCallback(
    (child: ReactElement, isDroppingItem?: boolean) => {
      if (!child || !child.key) return

      const l = getLayoutItem(layout, String(child.key))
      if (!l) return null

      const draggable =
        typeof l.isDraggable === 'boolean'
          ? l.isDraggable
          : !l.static && isDraggable

      const resizable =
        typeof l.isResizable === 'boolean'
          ? l.isResizable
          : !l.static && isResizable

      const resizeHandlesOptions = l.resizeHandles || resizeHandles

      const bounded = draggable && isBounded && l.isBounded !== false

      return (
        <GridItem
          style={{
            background: isDroppingItem ? 'red' : '',
          }}
          containerWidth={width}
          containerHeight={height}
          margin={margin}
          cols={cols}
          rows={rows}
          containerPadding={containerPadding}
          useCSSTransforms={useCSSTransforms}
          transformScale={transformScale}
          w={l.w}
          h={l.h}
          x={l.x}
          y={l.y}
          i={l.i}
          minH={l.minH}
          minW={l.minW}
          maxH={l.maxH}
          maxW={l.maxW}
          static={l.static}
          isDraggable={draggable}
          isResizable={resizable}
          isBounded={bounded}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragStop={onDragStop}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeStop={onResizeStop}
          droppingPosition={isDroppingItem ? droppingPosition : undefined}
          resizeHandles={resizeHandlesOptions}
          resizeHandle={resizeHandle}
          gridLayoutRef={gridLayoutRef}
        >
          {child}
        </GridItem>
      )
    },
    [
      cols,
      containerPadding,
      droppingPosition,
      height,
      isBounded,
      isDraggable,
      isResizable,
      layout,
      margin,
      onDrag,
      onDragStart,
      onDragStop,
      onResize,
      onResizeStart,
      onResizeStop,
      resizeHandle,
      resizeHandles,
      rows,
      transformScale,
      useCSSTransforms,
      width,
    ]
  )

  const gridItems = useMemo(
    () => React.Children.map(children, (child) => processGridItem(child)),
    [children, processGridItem]
  )

  const drop = useMemo(
    () =>
      isDroppable && droppingDOMNode && processGridItem(droppingDOMNode, true),
    [droppingDOMNode, isDroppable, processGridItem]
  )

  const mergedStyle: React.CSSProperties = useMemo(() => {
    return {
      minWidth: width,
      maxWidth: width,
      minHeight: height,
      maxHeight: height,
      '--cols': cols,
      '--rows': rows,
      ...style,
    }
  }, [width, height, cols, rows, style])

  const mergedClassName = useMemo(
    () => clsx({[gridLayoutStyles]: showGridLines }, className),
    [className, showGridLines]
  )

  const gridLayout = useMemo(
    () => (
      <div ref={gridLayoutRef} className={mergedClassName} style={mergedStyle}>
        {drop}
        {placeholder()}
        {gridItems}
      </div>
    ),
    [drop, gridItems, mergedClassName, mergedStyle, placeholder]
  )

  return gridLayout
}

export { GridLayout }
