import React, { ReactElement, useMemo, useState, useRef, CSSProperties } from 'react'
import ReactDOM from 'react-dom'
import {
  DraggableCore,
  DraggableData,
  DraggableEvent,
} from 'react-draggable'
import {
  DroppableEventCallback,
  getTranslatePosition,
} from '../../helpers/utils'
import { getOffset, getRelativePosition } from '../../helpers/calculateUtils'

export type Props = {
  children: ReactElement | ReactElement[]
  container: HTMLElement
  columnWidth: number
  rowHeight: number
  width: number
  height: number
  onDropStart?: DroppableEventCallback
  onDropDragOver?: DroppableEventCallback
  onDrop?: DroppableEventCallback
}

export function DroppableItem(props: Props) {
  const { children, columnWidth, rowHeight, width, height } = props

  const child = useMemo(() => React.Children.only(children), [children])
  const itemRef = React.useRef(null)
  const droppableItemRef = useRef(null)
  const [droppableItem, setDroppableItem] = useState<ReactElement | null>(null)
  const droppableItemOffset = useRef<{ x: number; y: number } | null>(null)

  const style: CSSProperties = {
    width: `${columnWidth * width}px`,
    height: `${rowHeight * height}px`,
  }

  const newChild = React.cloneElement(child, {
    ref: itemRef,
    style
  })

  function onStart(e: DraggableEvent, data: DraggableData) {
    const { x, y } = getOffset(data)

    droppableItemOffset.current = {
      x,
      y,
    }

    const { left, top } = getRelativePosition(data.node)
    const position = getTranslatePosition(left, top)

    const newChild = React.cloneElement(child, {
      ref: droppableItemRef,
      style: {
        ...style,
        opacity: 0.7,
        position: 'absolute',
        top: 0,
        left: 0,
        transform: position,
      },
    })

    setDroppableItem(newChild)

    props.onDropStart?.(e, data)
  }

  function onDrag(e: DraggableEvent, data: DraggableData) {
    const { x, y } = droppableItemOffset.current!

    const left = data.x + window.scrollX - x
    const top = data.y + window.scrollY - y

    const position = getTranslatePosition(left, top)

    const newChild = React.cloneElement(droppableItem!, {
      ref: droppableItemRef,
      style: {
        ...droppableItem!.props.style,
        transform: position,
      },
    })

    setDroppableItem(newChild)

    const event = new CustomEvent('droppable-dragover', { detail: data })
    document.dispatchEvent(event)

    props.onDropDragOver?.(e, data)
  }

  function onStop(e: DraggableEvent, data: DraggableData) {
    setDroppableItem(null)

    const event = new CustomEvent('droppable-drop', { detail: data })
    document.dispatchEvent(event)

    props.onDrop?.(e, data)
  }

  return (
    <>
      <DraggableCore
        onStart={onStart}
        onDrag={onDrag}
        onStop={onStop}
        nodeRef={itemRef}
      >
        {newChild}
      </DraggableCore>
      {droppableItem && ReactDOM.createPortal(droppableItem, props.container)}
    </>
  )
}
