import React, {
  MutableRefObject,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable'
import 'react-resizable/css/styles.css'
import { Resizable } from 'react-resizable'

import clsx from 'clsx'

import {
  calcGridColWidth,
  calcGridItemPosition,
  calcGridItemWHPx,
  calcGridRowHeight,
  calcWH,
  calcXY,
  clamp,
  getOffset,
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
  getClientPosition,
} from '../../helpers/utils'
import { usePrevious } from '../../hooks/use-previous'

import * as styles from './GridItem.css'

type GridItemCallback<T extends GridDragEvent | GridResizeEvent> = (
  i: LayoutItemID,
  w: number,
  h: number,
  data: T
) => void

export type ReactRef<T extends HTMLElement> = {
  readonly current: T | null
}

export type ResizeHandleAxis = 's' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'

export type DraggableNode = Pick<DraggableData, 'node'>

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
  itemScale: number
  droppingPosition?: DroppingPosition
  gridLayoutRef: MutableRefObject<HTMLDivElement | null>

  className?: string
  style?: Record<string, string>
  handle?: string
  cancel?: string

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

function GridItem(props: Props) {
  const {
    children,
    className,
    style,
    cancel = '',
    handle = '',
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
    itemScale,
    resizeHandles,
    resizeHandle,
    gridLayoutRef,
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
  const offset = useRef<{
    left: number
    top: number
  } | null>(null)

  const createStyle = useCallback(
    function (pos: Position, scale: number): { [key: string]: string } {
      let style
      // CSS Transforms support (default)
      if (useCSSTransforms) {
        style = setTransform(pos, scale)
      } else {
        // top,left (slow)
        style = setTopLeft(pos, scale)

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
    (
      e: DraggableEvent,
      data: DraggableNode,
      droppingPosition?: DroppingPosition
    ) => {
      const { onDragStart } = props
      if (!onDragStart) return

      const node = data.node

      let offsetTop: number
      let offsetLeft: number

      if (droppingPosition) {
        offsetTop = droppingPosition.offsetTop
        offsetLeft = droppingPosition.offsetLeft
      } else {
        const { top, left } = getOffset(e, node)
        offsetTop = top
        offsetLeft = left
      }

      const { clientY, clientX } = getClientPosition(e)
      const gridRect = gridLayoutRef.current!.getBoundingClientRect()

      const top = (clientY! - offsetTop - gridRect.top) / transformScale
      const left = (clientX! - offsetLeft - gridRect.left) / transformScale

      const newPosition = {
        left,
        top,
      }

      offset.current = {
        left: offsetLeft,
        top: offsetTop,
      }

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
      gridLayoutRef,
      margin,
      props,
      rows,
      transformScale,
    ]
  )

  const onDrag = useCallback(
    (e: DraggableEvent, { node }: DraggableNode) => {
      const { onDrag } = props
      if (!onDrag) return

      if (!dragging) {
        throw new Error('onDrag called before onDragStart.')
      }

      const { clientX, clientY } = getClientPosition(e)
      const gridRect = gridLayoutRef.current!.getBoundingClientRect()

      let top = (clientY! - offset.current!.top - gridRect.top) / transformScale

      let left =
        (clientX! - offset.current!.left - gridRect.left) / transformScale

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
          const rowHeight = calcGridRowHeight(positionParams)
          const colWidth = calcGridColWidth(positionParams)

          const bottomBoundary =
            offsetParent.clientHeight -
            calcGridItemWHPx(h, rowHeight, margin[1])
          top = clamp(top, 0, bottomBoundary)

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
    [
      cols,
      containerHeight,
      containerPadding,
      dragging,
      gridLayoutRef,
      margin,
      props,
      rows,
      transformScale,
    ]
  )

  const onDragStop = useCallback(
    (e: DraggableEvent, { node }: ReactDraggableCallbackData) => {
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
    (
      e: Event,
      { node, size }: { node: HTMLElement; size: Position },
      handlerName: string
    ) => {
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
    (e: Event, callbackData: { node: HTMLElement; size: Position }) => {
      onResizeHandler(e, callbackData, 'onResizeStart')
    },
    [onResizeHandler]
  )

  const onResize = useCallback(
    (e: Event, callbackData: { node: HTMLElement; size: Position }) => {
      onResizeHandler(e, callbackData, 'onResize')
    },
    [onResizeHandler]
  )

  const onResizeStop = useCallback(
    (e: Event, callbackData: { node: HTMLElement; size: Position }) => {
      onResizeHandler(e, callbackData, 'onResizeStop')
    },
    [onResizeHandler]
  )

  const moveDroppingItem = useCallback(() => {
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
      onDragStart(
        droppingPosition.e,
        {
          node,
        },
        droppingPosition
      )
    } else if (shouldDrag) {
      onDrag(droppingPosition.e, {
        node,
      })
    }
  }, [
    dragging,
    droppingPosition,
    onDrag,
    onDragStart,
    prevProps.droppingPosition,
  ])

  useEffect(() => {
    moveDroppingItem()
  }, [moveDroppingItem])

  const mixinDraggable = useCallback(
    (child: ReactElement) => {
      return (
        <DraggableCore
          onStart={onDragStart}
          onDrag={onDrag}
          onStop={onDragStop}
          handle={handle}
          cancel={'.react-resizable-handle' + (cancel ? ',' + cancel : '')}
          scale={transformScale}
          nodeRef={elementRef}
        >
          {child}
        </DraggableCore>
      )
    },
    [cancel, handle, onDrag, onDragStart, onDragStop, transformScale]
  )

  const mixinResizable = useCallback(
    (child: ReactElement, position: Position) => {
      const positionParams = {
        cols,
        rows,
        containerPadding,
        containerWidth,
        containerHeight,
        margin,
      }

      // This is the max possible width - doesn't go to infinity because of the width of the window
      const { width: maxWidth, height: maxHeight } = calcGridItemPosition(
        positionParams,
        0,
        0,
        cols - x,
        rows - y
      )

      // Calculate min/max constraints using our min & maxes
      const mins = calcGridItemPosition(positionParams, 0, 0, minW, minH)
      const maxes = calcGridItemPosition(positionParams, 0, 0, maxW, maxH)

      const minConstraints: [number, number] = [mins.width, mins.height]
      const maxConstraints: [number, number] = [
        Math.min(maxes.width, maxWidth),
        Math.min(maxes.height, maxHeight),
      ]

      return (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        <Resizable
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
      y,
    ]
  )

  let newChild = useMemo(
    () =>
      React.cloneElement(child, {
        ref: elementRef,
        className: clsx(
          {
            [styles.staticStyle]: props.static,
            [styles.draggable]: isDraggable,
            [styles.resizing]: Boolean(resizing),
            [styles.dragging]: Boolean(dragging),
            [styles.dropping]: Boolean(droppingPosition),
          },
          child.props.className,
          className
        ),
        // We can set the width and height on the child, but unfortunately we can't set the position.
        style: {
          ...style,
          ...child.props.style,
          ...createStyle(pos, itemScale),
        },
      }),
    [
      child,
      className,
      createStyle,
      dragging,
      droppingPosition,
      isDraggable,
      itemScale,
      pos,
      props.static,
      resizing,
      style,
    ]
  )

  newChild = useMemo(
    () => (isResizable ? mixinResizable(newChild, pos) : newChild),
    [isResizable, mixinResizable, newChild, pos]
  )

  newChild = useMemo(
    () => (isDraggable ? mixinDraggable(newChild) : newChild),
    [isDraggable, mixinDraggable, newChild]
  )

  return newChild
}

export { GridItem }
