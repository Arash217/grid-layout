import React, { CSSProperties, ReactElement, useMemo } from 'react'

export type Props = {
  children: ReactElement | ReactElement[]
  columnWidth: number
  rowHeight: number
  width: number
  height: number
}

export const FlexibleItem = React.forwardRef((props: Props, ref) => {
  const { columnWidth, rowHeight, width, height, children } = props

  const child = useMemo(() => React.Children.only(children), [children])

  const style: CSSProperties = {
    width: `${columnWidth * width}px`,
    height: `${rowHeight * height}px`,
  }

  return React.cloneElement(child, {
    ref,
    style
  })
})