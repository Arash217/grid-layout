import { CSSProperties, ReactElement, useMemo, useRef } from 'react'

import * as styles from './ScalableItem.css'
import React from 'react'
import clsx from 'clsx'

export type Props = {
  children: ReactElement | ReactElement[]
  itemScale: number
  style?: CSSProperties
}

export function ScalableItem(props: Props) {
  const { children, itemScale, style } = props

  const child = useMemo(() => React.Children.only(children), [children])

  const containerRef = useRef<HTMLDivElement | null>(null)
  const scalableItemRef = useRef<HTMLDivElement | null>(null)

  const mergedClassName = useMemo(
    () => clsx(child.props.className, styles.scalableItem),
    [child.props.className]
  )

  return (
    <div className={styles.container} style={{ ...style }} ref={containerRef}>
      <div
        className={mergedClassName}
        ref={scalableItemRef}
        style={{
          transform: `scale(${itemScale})`,
          width: `calc(100% / ${itemScale})`,
          height: `calc(100% / ${itemScale})`,
        }}
      >
        {child}
      </div>
    </div>
  )
}
