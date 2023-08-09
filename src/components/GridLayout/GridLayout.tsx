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
  compactType as compactTypeFn,
  getLayoutItem,
  moveElement,
  noop,
  withLayoutItem,
  getAllCollisions,
  DragOverEvent,
  DroppingPosition,
  DroppingItem,
  LayoutItemID,
} from '../../helpers/utils'

import { deepEqual } from 'fast-equals'
import { styled } from '@linaria/react'
import clsx from 'clsx'
import { ResizeHandle, ResizeHandleAxis } from '../GridItem/GridItem'
import { PositionParams, calcXY } from '../../helpers/calculateUtils'

const layoutClassName = 'react-grid-layout'
let isFirefox = false
// Try...catch will protect from navigator not existing (e.g. node) or a bad implementation of navigator
try {
  isFirefox = /firefox/i.test(navigator.userAgent)
} catch (e) {
  /* Ignore */
}

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
    onDropDragOver = noop,
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
  const dragEnterCounter = useRef(0)

  isDroppable = isDroppable && Boolean(droppingItem)
  const isDraggableAndDroppable = isDroppable && isDraggable

  useEffect(() => {
    setLayout(initialLayout)
  }, [initialLayout])

  const mergedClassName = useMemo(
    () => clsx(layoutClassName, className, { 'grid-lines': showGridLines }),
    [className, showGridLines]
  )

  const mergedStyle: React.CSSProperties = useMemo(() => {
    return {
      minWidth: width,
      maxWidth: width,
      minHeight: height,
      maxHeight: height,
      ...style,
    }
  }, [width, height, style])

  const onDragStart = useCallback(
    function (
      i: LayoutItemID,
      _x: number,
      _y: number,
      { e, node }: GridDragEvent
    ): void {
      const l = getLayoutItem(layout, i)
      if (!l) return

      setOldDragItem(cloneLayoutItem(l))
      setOldLayout(layout)

      return onItemDragStart(e, layout, l, l, null, node)
    },
    [layout, onItemDragStart]
  )

  const onDrag = useCallback(
    function (
      i: LayoutItemID,
      x: number,
      y: number,
      { e, node }: GridDragEvent
    ): void {
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
        compactTypeFn({
          verticalCompact,
          compactType,
        }),
        cols,
        allowOverlap
      )

      onItemDrag(e, newLayout, oldDragItem, l, placeholder, node)

      setLayout(
        allowOverlap
          ? newLayout
          : compact(
              newLayout,
              compactTypeFn({
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
    function (newLayout: Layout, oldLayout: Layout | null) {
      if (!oldLayout) oldLayout = layout

      if (!deepEqual(oldLayout, newLayout)) {
        onLayoutChange(newLayout)
      }
    },
    [layout, onLayoutChange]
  )

  const onDragStop = useCallback(
    function (
      i: LayoutItemID,
      x: number,
      y: number,
      { e, node }: GridDragEvent
    ): void {
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
        compactTypeFn({
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
            compactTypeFn({
              verticalCompact,
              compactType,
            }),
            cols,
            undefined
          )

      onItemDragStop(e, newLayout, oldDragItem, l, null, node)

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
    function (
      i: LayoutItemID,
      _w: number,
      _h: number,
      { e, node }: GridResizeEvent
    ): void {
      const l = getLayoutItem(layout, i)
      if (!l) return

      setOldResizeItem(cloneLayoutItem(l))
      setOldLayout(layout)

      onItemResizeStart(e, layout, l, l, null, node)
    },
    [layout, onItemResizeStart]
  )

  const onResize = useCallback(
    function (
      i: LayoutItemID,
      w: number,
      h: number,
      { e, node }: GridResizeEvent
    ): void {
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
              compactTypeFn({ verticalCompact, compactType }),
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
    function (
      i: LayoutItemID,
      _w: number,
      _h: number,
      { e, node }: GridResizeEvent
    ): void {
      const l = getLayoutItem(layout, i)

      const newLayout = allowOverlap
        ? layout
        : compact(
            layout,
            compactTypeFn({ compactType, verticalCompact }),
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

  const removeDroppingPlaceholder = useCallback((): void => {
    const newLayout = compact(
      layout.filter((l) => l.i !== droppingItem!.i),
      compactTypeFn({
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

  const onDragEnter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any): void => {
      if (!isDraggableAndDroppable) return

      e.preventDefault()
      e.stopPropagation()

      dragEnterCounter.current++
    },
    [isDraggableAndDroppable]
  )

  const onDragOver = useCallback(
    function (e: DragOverEvent): void | false {
      if (!isDraggableAndDroppable) return

      e.preventDefault() // Prevent any browser native action
      e.stopPropagation()

      // we should ignore events from layout's children in Firefox
      // to avoid unpredictable jumping of a dropping placeholder
      // FIXME remove this hack
      if (
        isFirefox &&
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        !e.nativeEvent.target?.classList.contains(layoutClassName)
      ) {
        return false
      }

      const onDragOverResult = onDropDragOver?.(e)

      if (onDragOverResult === false) {
        if (droppingDOMNode) {
          removeDroppingPlaceholder()
        }
        return false
      }

      const finalDroppingItem = { ...droppingItem!, ...onDragOverResult }

      // This is relative to the DOM element that this event fired for.
      const { layerX, layerY } = e.nativeEvent

      const newDroppingPosition = {
        top: layerY / transformScale - finalDroppingItem.offsetY,
        left: layerX / transformScale - finalDroppingItem.offsetX,
        e,
      }

      if (!droppingDOMNode) {
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
          finalDroppingItem.w,
          finalDroppingItem.h
        )

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
      } else if (droppingPosition) {
        const { left, top } = droppingPosition
        const shouldUpdatePosition = left !== layerX || top !== layerY

        if (shouldUpdatePosition) {
          setDroppingPosition(newDroppingPosition)
        }
      }
    },
    [cols, containerPadding, droppingDOMNode, droppingItem, droppingPosition, height, isDraggableAndDroppable, layout, margin, onDropDragOver, removeDroppingPlaceholder, rows, transformScale, width]
  )

  const onDragLeave = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function (e: any) {
      if (!isDraggableAndDroppable) return

      e.preventDefault() // Prevent any browser native action
      e.stopPropagation()
      dragEnterCounter.current--

      if (dragEnterCounter.current === 0) {
        removeDroppingPlaceholder()
      }
    },
    [isDraggableAndDroppable, removeDroppingPlaceholder]
  )

  const onDrop = useCallback(
    function (e: Event) {
      if (!isDraggableAndDroppable) return

      e.preventDefault() // Prevent any browser native action
      e.stopPropagation()

      const item = layout.find((l) => l.i === droppingItem!.i)!
      dragEnterCounter.current = 0
      removeDroppingPlaceholder()

      const drop = {
        ...item,
        i: undefined,
      }

      onItemDrop(layout, drop, e)
    },
    [
      droppingItem,
      isDraggableAndDroppable,
      layout,
      onItemDrop,
      removeDroppingPlaceholder,
    ]
  )

  const placeholder = useCallback(
    function () {
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
        >
          <div />
        </GridItem>
      )
    },
    [
      activeDrag,
      cols,
      containerPadding,
      height,
      margin,
      rows,
      transformScale,
      useCSSTransforms,
      width,
    ]
  )

  const processGridItem = useCallback(
    function (child: ReactElement, isDroppingItem?: boolean) {
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

  const gridLayout = useMemo(
    () => (
      <div
        ref={gridLayoutRef}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        onDrop={isDroppable ? onDrop : noop}
        onDragEnter={isDroppable ? onDragEnter : noop}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        onDragOver={isDroppable ? onDragOver : noop}
        onDragLeave={isDroppable ? onDragLeave : noop}
        className={mergedClassName}
        style={mergedStyle}
      >
        {drop}
        {placeholder()}
        {gridItems}
      </div>
    ),
    [
      drop,
      gridItems,
      isDroppable,
      mergedClassName,
      mergedStyle,
      onDragEnter,
      onDragLeave,
      onDragOver,
      onDrop,
      placeholder,
    ]
  )

  return gridLayout
}

const StyledGridLayout = styled(GridLayout)`
  &.grid-lines {
    position: relative;
    &::before {
      content: '';
      background-size: ${({ cols, rows }) =>
        `calc(100% / ${cols}) calc(100% / ${rows})`};
      background-image: url(data:image/svg+xml;base64,PCEtLSBSZXBsYWNlIHRoZSBjb250ZW50cyBvZiB0aGlzIGVkaXRvciB3aXRoIHlvdXIgU1ZHIGNvZGUgLS0+Cgo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZC1jZWxsIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gNDAgMCBMIDAgMCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNkMGQwZDAiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkLWNlbGwpIi8+PC9zdmc+);
      height: 100%;
      width: 100%;
      position: absolute;
      left: 0;
      top: 0;
      box-shadow: 0px 0px 2px 1px #d1d1d1;
    }
  }
`

export { StyledGridLayout as GridLayout }
