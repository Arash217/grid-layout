import React, {
  ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import clsx from 'clsx'

import { DraggableCore } from 'react-draggable'

import {
  calcGridColWidth,
  calcGridItemPosition,
  calcGridItemWHPx,
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
} from '../../helpers/utils'

type GridItemCallback<Data extends GridDragEvent | GridResizeEvent> = (
  i: string,
  w: number,
  h: number,
  data: Data
) => void

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

  className?: string
  style?: Record<string, string>

  i: string

  x: number
  y: number
  w: number
  h: number

  minW?: number
  maxW?: number
  minH?: number
  maxH?: number

  static?: boolean
  isDraggable: boolean
  isBounded: boolean

  onDragStart?: GridItemCallback<GridDragEvent>
  onDrag?: GridItemCallback<GridDragEvent>
}

export function GridItem(props: Props) {
  const {
    children,
    className,
    style,
    x,
    y,
    w,
    h,
    cols,
    rows,
    containerPadding,
    containerWidth,
    containerHeight,
    margin,
    usePercentages,
    useCSSTransforms,
    isDraggable,
    transformScale,
  } = props

  const [resizing] = useState<{ width: number; height: number } | null>(null)
  const [dragging, setDragging] = useState<{
    top: number
    left: number
  } | null>(null)
  const elementRef = useRef<HTMLDivElement | null>(null)

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const child = useMemo(() => React.Children.only(children), [children]) as any

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

  function onDragStart(e: Event, { node }: ReactDraggableCallbackData): void {
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
  }

  function onDrag(
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
          offsetParent.clientHeight - calcGridItemWHPx(h, rowHeight, margin[1])
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
  }

  function mixinDraggable(
    child: ReactElement,
    isDraggable: boolean
  ): ReactElement {
    return (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      <DraggableCore
        disabled={!isDraggable}
        onStart={onDragStart}
        onDrag={onDrag}
        // onStop={onDragStop}
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
  }

  let newChild = useMemo(
    () =>
      React.cloneElement(child, {
        ref: elementRef,
        className: clsx('react-grid-item', child.props.className, className, {
          static: props.static,
          resizing: Boolean(resizing),
          // "react-draggable": isDraggable,
          'react-draggable-dragging': Boolean(dragging),
          // dropping: Boolean(droppingPosition),
          // cssTransforms: useCSSTransforms
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
      pos,
      props.static,
      resizing,
      style,
    ]
  )

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  newChild = mixinDraggable(newChild, isDraggable)

  return newChild
}
