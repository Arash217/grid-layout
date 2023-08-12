import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import clsx from 'clsx'

import { DraggableCore } from 'react-draggable'
import 'react-resizable/css/styles.css'
import { Resizable } from 'react-resizable'
import { styled } from '@linaria/react'

import {
  calcGridColWidth,
  calcGridItemPosition,
  calcGridItemWHPx,
  calcWH,
  calcXY,
  clamp,
} from '../../helpers/calculateUtils'
import {
  PartialPosition,
  Position,
  ReactDraggableCallbackData,
  perc,
  setTopLeft,
  setTransform,
  GridDragEvent,
  GridResizeEvent,
  DroppingPosition,
  LayoutItemID,
  LIB_PREFIX,
} from '../../helpers/utils'

const COMPONENT_PREFIX = `${LIB_PREFIX}-grid-item`
const COMPONENT_CSS_PREFIX = `${COMPONENT_PREFIX}-`

type GridItemCallback<Data extends GridDragEvent | GridResizeEvent> = (
  i: LayoutItemID,
  w: number,
  h: number,
  data: Data
) => void

export type ReactRef<T extends HTMLElement> = {
  readonly current: T | null
}

export type ResizeHandleAxis = 's' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'

export type ResizeHandle =
  | ReactElement
  | ((
      resizeHandleAxis: ResizeHandleAxis,
      ref: ReactRef<HTMLElement>
    ) => ReactElement)

export type Props = {
  children: ReactElement | ReactElement[]
  cols: number
  rows: number
  containerWidth: number
  containerHeight: number
  margin: [number, number]
  containerPadding: [number, number]

  useCSSTransforms?: boolean
  usePercentages?: boolean
  transformScale: number
  droppingPosition?: DroppingPosition

  className?: string
  style?: Record<string, string>

  i: LayoutItemID

  x: number
  y: number
  w: number
  h: number

  minW?: number
  maxW?: number
  minH?: number
  maxH?: number

  resizeHandles?: ResizeHandleAxis[]
  resizeHandle?: ResizeHandle

  static?: boolean
  isDraggable: boolean
  isResizable: boolean
  isBounded: boolean

  onDragStart?: GridItemCallback<GridDragEvent>
  onDrag?: GridItemCallback<GridDragEvent>
  onDragStop?: GridItemCallback<GridDragEvent>

  onResize?: GridItemCallback<GridResizeEvent>
  onResizeStart?: GridItemCallback<GridResizeEvent>
  onResizeStop?: GridItemCallback<GridResizeEvent>
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
function usePrevious(value) {
  const ref = useRef(value)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

function GridItem(props: Props) {
  const {
    children,
    className,
    style,
    i,
    x,
    y,
    w,
    h,
    minH = 1,
    minW = 1,
    maxH = Infinity,
    maxW = Infinity,
    cols,
    rows,
    containerPadding,
    containerWidth,
    containerHeight,
    margin,
    usePercentages,
    useCSSTransforms,
    isDraggable,
    isResizable,
    droppingPosition,
    transformScale,
    resizeHandles,
    resizeHandle,
  } = props

  const [resizing, setResizing] = useState<{
    width: number
    height: number
  } | null>(null)
  const [dragging, setDragging] = useState<{
    top: number
    left: number
  } | null>(null)
  const elementRef = useRef<HTMLDivElement | null>(null)
  const prevProps = usePrevious(props)

  const pos = useMemo(
    () =>
      calcGridItemPosition(
        {
          cols,
          rows,
          containerPadding,
          containerWidth,
          containerHeight,
          margin,
        },
        x,
        y,
        w,
        h,
        {
          resizing,
          dragging,
        }
      ),
    [
      cols,
      containerHeight,
      containerPadding,
      containerWidth,
      dragging,
      h,
      margin,
      resizing,
      rows,
      w,
      x,
      y,
    ]
  )

  const child = useMemo(() => React.Children.only(children), [children])

  const createStyle = useCallback(
    function (pos: Position): { [key: string]: string } {
      let style
      // CSS Transforms support (default)
      if (useCSSTransforms) {
        style = setTransform(pos)
      } else {
        // top,left (slow)
        style = setTopLeft(pos)

        // This is used for server rendering.
        if (usePercentages) {
          style.left = perc(pos.left / containerWidth)
          style.width = perc(pos.width / containerWidth)
        }
      }

      return style
    },
    [containerWidth, useCSSTransforms, usePercentages]
  )

  const onDragStart = useCallback(
    function (e: Event, { node }: ReactDraggableCallbackData): void {
      const { onDragStart, transformScale } = props
      if (!onDragStart) return

      const newPosition: PartialPosition = { top: 0, left: 0 }

      // TODO: this wont work on nested parents
      const { offsetParent } = node
      if (!offsetParent) return

      const parentRect = offsetParent.getBoundingClientRect()
      const clientRect = node.getBoundingClientRect()

      const cLeft = clientRect.left / transformScale
      const pLeft = parentRect.left / transformScale
      const cTop = clientRect.top / transformScale
      const pTop = parentRect.top / transformScale

      newPosition.left = cLeft - pLeft + offsetParent.scrollLeft
      newPosition.top = cTop - pTop + offsetParent.scrollTop

      setDragging({ ...newPosition })

      // Call callback with this data
      const { x, y } = calcXY(
        {
          cols,
          rows,
          containerPadding,
          containerWidth,
          containerHeight,
          margin,
        },
        newPosition.top,
        newPosition.left,
        props.w,
        props.h
      )

      return onDragStart(props.i, x, y, {
        e,
        node,
        newPosition,
      })
    },
    [
      cols,
      containerHeight,
      containerPadding,
      containerWidth,
      margin,
      props,
      rows,
    ]
  )

  const onDrag = useCallback(
    function (
      e: Event,
      { node, deltaX, deltaY }: ReactDraggableCallbackData
    ): void {
      const { onDrag } = props
      if (!onDrag) return

      if (!dragging) {
        throw new Error('onDrag called before onDragStart.')
      }

      let top = dragging.top + deltaY
      let left = dragging.left + deltaX

      const { isBounded, i, w, h, containerWidth } = props
      const positionParams = {
        cols,
        rows,
        containerPadding,
        containerWidth,
        containerHeight,
        margin,
      }

      // Boundary calculations; keeps items within the grid
      if (isBounded) {
        const { offsetParent } = node

        if (offsetParent) {
          const { margin } = props
          const rowHeight = containerHeight / rows

          const bottomBoundary =
            offsetParent.clientHeight -
            calcGridItemWHPx(h, rowHeight, margin[1])
          top = clamp(top, 0, bottomBoundary)

          const colWidth = calcGridColWidth(positionParams)
          const rightBoundary =
            containerWidth - calcGridItemWHPx(w, colWidth, margin[0])
          left = clamp(left, 0, rightBoundary)
        }
      }

      const newPosition: PartialPosition = { top, left }
      setDragging({ ...newPosition })

      // Call callback with this data
      const { x, y } = calcXY(positionParams, top, left, w, h)
      return onDrag(i, x, y, {
        e,
        node,
        newPosition,
      })
    },
    [cols, containerHeight, containerPadding, dragging, margin, props, rows]
  )

  const onDragStop = useCallback(
    function (e: Event, { node }: ReactDraggableCallbackData) {
      const { onDragStop } = props
      if (!onDragStop) return

      if (!dragging) {
        throw new Error('onDragEnd called before onDragStart.')
      }

      const { w, h, i } = props
      const { left, top } = dragging
      const newPosition: PartialPosition = { top, left }
      setDragging(null)

      const { x, y } = calcXY(
        {
          cols,
          rows,
          containerPadding,
          containerWidth,
          containerHeight,
          margin,
        },
        top,
        left,
        w,
        h
      )

      return onDragStop(i, x, y, {
        e,
        node,
        newPosition,
      })
    },
    [
      cols,
      containerHeight,
      containerPadding,
      containerWidth,
      dragging,
      margin,
      props,
      rows,
    ]
  )

  const onResizeHandler = useCallback(
    function (
      e: Event,
      { node, size }: { node: HTMLElement; size: Position },
      handlerName: string
    ): void {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const handler = props[handlerName]
      if (!handler) return

      // Get new XY
      let { w, h } = calcWH(
        {
          cols,
          rows,
          containerPadding,
          containerWidth,
          containerHeight,
          margin,
        },
        size.width,
        size.height,
        x,
        y
      )

      const newMinW = Math.max(minW, 1)
      const newMaxW = Math.min(maxW, cols - x)

      // Min/max capping
      w = clamp(w, newMinW, newMaxW)
      h = clamp(h, minH, maxH)

      setResizing(handlerName === 'onResizeStop' ? null : size)

      handler(i, w, h, { e, node, size })
    },
    [
      cols,
      containerHeight,
      containerPadding,
      containerWidth,
      i,
      margin,
      maxH,
      maxW,
      minH,
      minW,
      props,
      rows,
      x,
      y,
    ]
  )

  const onResizeStart = useCallback(
    function (
      e: Event,
      callbackData: { node: HTMLElement; size: Position }
    ): void {
      e.stopPropagation()
      onResizeHandler(e, callbackData, 'onResizeStart')
    },
    [onResizeHandler]
  )

  const onResize = useCallback(
    function (e: Event, callbackData: { node: HTMLElement; size: Position }) {
      onResizeHandler(e, callbackData, 'onResize')
    },
    [onResizeHandler]
  )

  const onResizeStop = useCallback(
    function (e: Event, callbackData: { node: HTMLElement; size: Position }) {
      onResizeHandler(e, callbackData, 'onResizeStop')
    },
    [onResizeHandler]
  )

  const moveDroppingItem = useCallback(
    function () {
      if (!droppingPosition) return
      const node = elementRef.current
      // Can't find DOM node (are we unmounted?)
      if (!node) return

      const prevDroppingPosition = prevProps.droppingPosition || {
        left: 0,
        top: 0,
      }

      const shouldDrag =
        (dragging && droppingPosition.left !== prevDroppingPosition.left) ||
        droppingPosition.top !== prevDroppingPosition.top

      if (!dragging) {
        onDragStart(droppingPosition.e, {
          node,
          deltaX: droppingPosition.left,
          deltaY: droppingPosition.top,
        })
      } else if (shouldDrag) {
        const deltaX = droppingPosition.left - dragging.left
        const deltaY = droppingPosition.top - dragging.top

        onDrag(droppingPosition.e, {
          node,
          deltaX,
          deltaY,
        })
      }
    },
    [
      dragging,
      droppingPosition,
      onDrag,
      onDragStart,
      prevProps.droppingPosition,
    ]
  )

  useEffect(() => {
    moveDroppingItem()
  }, [moveDroppingItem])

  const mixinDraggable = useCallback(
    function (child: ReactElement, isDraggable: boolean): ReactElement {
      return (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        <DraggableCore
          disabled={!isDraggable}
          onStart={onDragStart}
          onDrag={onDrag}
          onStop={onDragStop}
          // handle={props.handle}
          // cancel={
          //   '.react-resizable-handle' +
          //   (this.props.cancel ? ',' + this.props.cancel : '')
          // }
          scale={transformScale}
          nodeRef={elementRef}
        >
          {child}
        </DraggableCore>
      )
    },
    [onDrag, onDragStart, onDragStop, transformScale]
  )

  const mixinResizable = useCallback(
    function (child: ReactElement, position: Position, isResizable: boolean) {
      const positionParams = {
        cols,
        rows,
        containerPadding,
        containerWidth,
        containerHeight,
        margin,
      }

      // This is the max possible width - doesn't go to infinity because of the width of the window
      const maxWidth = calcGridItemPosition(
        positionParams,
        0,
        0,
        cols - x,
        0
      ).width

      // Calculate min/max constraints using our min & maxes
      const mins = calcGridItemPosition(positionParams, 0, 0, minW, minH)
      const maxes = calcGridItemPosition(positionParams, 0, 0, maxW, maxH)

      const minConstraints: [number, number] = [mins.width, mins.height]
      const maxConstraints: [number, number] = [
        Math.min(maxes.width, maxWidth),
        Math.min(maxes.height, Infinity),
      ]

      return (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        <Resizable
          draggableOpts={{
            disabled: !isResizable,
          }}
          className={isResizable ? undefined : 'react-resizable-hide'}
          width={position.width}
          height={position.height}
          minConstraints={minConstraints}
          maxConstraints={maxConstraints}
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeStop={onResizeStop}
          transformScale={transformScale}
          resizeHandles={resizeHandles}
          handle={resizeHandle}
        >
          {child}
        </Resizable>
      )
    },
    [
      cols,
      containerHeight,
      containerPadding,
      containerWidth,
      margin,
      maxH,
      maxW,
      minH,
      minW,
      onResize,
      onResizeStart,
      onResizeStop,
      resizeHandle,
      resizeHandles,
      rows,
      transformScale,
      x,
    ]
  )

  let newChild = useMemo(
    () =>
      React.cloneElement(child, {
        ref: elementRef,
        className: clsx(COMPONENT_PREFIX, child.props.className, className, {
          [`${COMPONENT_CSS_PREFIX}static`]: props.static,
          [`${COMPONENT_CSS_PREFIX}resizing`]: Boolean(resizing),
          [`${COMPONENT_CSS_PREFIX}draggable`]: isDraggable,
          [`${COMPONENT_CSS_PREFIX}dragging`]: Boolean(dragging),
          [`${COMPONENT_CSS_PREFIX}dropping`]: Boolean(droppingPosition),
          [`${COMPONENT_CSS_PREFIX}css-transforms`]: useCSSTransforms,
        }),
        // We can set the width and height on the child, but unfortunately we can't set the position.
        style: {
          ...style,
          ...child.props.style,
          ...createStyle(pos),
        },
      }),
    [
      child,
      className,
      createStyle,
      dragging,
      droppingPosition,
      isDraggable,
      pos,
      props.static,
      resizing,
      style,
      useCSSTransforms,
    ]
  )

  newChild = useMemo(
    () => mixinResizable(newChild, pos, isResizable),
    [isResizable, mixinResizable, newChild, pos]
  )

  newChild = useMemo(
    () => mixinDraggable(newChild, isDraggable),
    [isDraggable, mixinDraggable, newChild]
  )

  return newChild
}

const StyledGridItem = styled(GridItem)`
  &.gl-grid-item-static {
    cursor: auto;
  }

  &.gl-grid-item-draggable {
    cursor: move;
  }

  &.gl-grid-item-resizing {
    opacity: 0.7;
  }

  &.gl-grid-item-dragging {
    z-index: 1;
  }

  &.gl-grid-item-dropping {
    visibility: hidden;
  }
`

export { StyledGridItem as GridItem }
