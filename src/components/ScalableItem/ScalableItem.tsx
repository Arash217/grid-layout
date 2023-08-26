import { CSSProperties, ReactElement, useMemo } from 'react'

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

  const mergedClassName = useMemo(
    () => clsx(child.props.className, styles.scalableItem),
    [child.props.className]
  )

  return (
    <div className={styles.container} style={{ ...style }}>
      <div
        className={mergedClassName}
        style={{
          transform: `scale(${itemScale})`,
          width: `calc(100cqw / ${itemScale})`,
          height: `calc(100cqh / ${itemScale})`,
        }}
      >
        {child}
      </div>
    </div>
  )
}
