import React, { ReactElement, useCallback, useMemo, useState } from 'react'
import { GridItem } from '../GridItem'
import {
  CompactType,
  EventCallback,
  GridDragEvent,
  Layout,
  LayoutItem,
  cloneLayoutItem,
  compact,
  compactType as compactTypeFn,
  getLayoutItem,
  moveElement,
  noop,
} from '../../helpers/utils'

import { deepEqual } from 'fast-equals'
import { styled } from '@linaria/react'
import clsx from 'clsx'

const layoutClassName = 'react-grid-layout'

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
  isBounded?: boolean
  transformScale?: number
  allowOverlap?: boolean
  preventCollision?: boolean
  verticalCompact?: boolean
  compactType?: CompactType

  onLayoutChange: (layout: Layout) => void
  onDragStart?: EventCallback
  onDrag?: EventCallback
  onDragStop?: EventCallback
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
  } = props

  const [layout, setLayout] = useState(initialLayout)
  const [oldDragItem, setOldDragItem] = useState<LayoutItem | null>(null)
  const [oldLayout, setOldLayout] = useState<Layout | null>(null)
  const [activeDrag, setActiveDrag] = useState<LayoutItem | null>(null)

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
      i: string,
      x: number,
      y: number,
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
      i: string,
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
      i: string,
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

  function placeholder() {
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
        isBounded={false}
        useCSSTransforms={useCSSTransforms}
        transformScale={transformScale}
      >
        <div />
      </GridItem>
    )
  }

  const processGridItem = useCallback(
    function (child: ReactElement) {
      if (!child || !child.key) return

      const l = getLayoutItem(layout, String(child.key))
      if (!l) return null

      return (
        <GridItem
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
          isDraggable={isDraggable}
          isBounded={isBounded}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragStop={onDragStop}
        >
          {child}
        </GridItem>
      )
    },
    [
      cols,
      containerPadding,
      height,
      isBounded,
      isDraggable,
      layout,
      margin,
      onDrag,
      onDragStart,
      onDragStop,
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

  return (
    <div className={mergedClassName} style={mergedStyle}>
      {placeholder()}
      {gridItems}
    </div>
  )
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
