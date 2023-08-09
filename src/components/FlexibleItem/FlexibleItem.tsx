import { CSSProperties, ReactElement } from "react"

export type Props = {
  children: ReactElement | ReactElement[]
  columnWidth: number
  rowHeight: number
  width: number
  height: number
}

export function FlexibleItem(props: Props) {
  const { columnWidth, rowHeight, width, height, children } = props

  const style: CSSProperties = {
    width: columnWidth * width + 'px',
    height: rowHeight * height + 'px',
  };

  return (
    <div style={style}>
      {children}
    </div>
  );
}
