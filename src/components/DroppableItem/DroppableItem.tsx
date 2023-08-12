import React, { ReactElement, useMemo, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  DraggableCore,
  DraggableData,
  DraggableEventHandler,
} from 'react-draggable'
import { DroppableEventCallback } from '../../helpers/utils'
import { getOffset, getRelativePosition } from '../../helpers/calculateUtils'

export type Props = {
  children: ReactElement | ReactElement[]
  onDropStart?: DroppableEventCallback
  onDropDragOver?: DroppableEventCallback
  onDrop?: DroppableEventCallback
}

export function DroppableItem(props: Props) {
  const { children } = props

  const itemRef = React.useRef(null)
  const droppableItemRef = useRef(null)
  const child = useMemo(() => React.Children.only(children), [children])
  const [droppableItem, setDroppableItem] = useState<ReactElement | null>(null)
  const droppableItemOffset = useRef<{ x: number; y: number } | null>(null)

  const newChild = React.cloneElement(child, {
    ref: itemRef,
  })

  function onStart(e: DraggableEventHandler, data: DraggableData) {
   const { x, y } = getOffset(data)

    droppableItemOffset.current = {
      x,
      y,
    }

    const { left, top } = getRelativePosition(data.node)

    const newChild = React.cloneElement(child, {
      ref: droppableItemRef,
      style: {
        opacity: 0.5,
        left,
        top,
        position: 'absolute',
        height: data.node.clientHeight,
        width: data.node.clientWidth,
      },
    })

    setDroppableItem(newChild)

    props.onDropStart?.(e, data)
  }

  function onDrag(e: DraggableEventHandler, data: DraggableData) {
    const { x, y } = droppableItemOffset.current!

    const newChild = React.cloneElement(child, {
      ref: droppableItemRef,
      style: {
        opacity: 0.5,
        left: data.x - x,
        top: data.y - y,
        position: 'absolute',
        height: data.node.clientHeight,
        width: data.node.clientWidth,
      },
    })

    setDroppableItem(newChild)

    const event = new CustomEvent('droppable-dragover', { detail: data })
    document.dispatchEvent(event)

    props.onDropDragOver?.(e, data)
  }

  function onStop(e: DraggableEventHandler, data: DraggableData) {
    setDroppableItem(null)

    const event = new CustomEvent('droppable-drop', {  detail: data})
    document.dispatchEvent(event)

    props.onDrop?.(e, data)
  }

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <DraggableCore
        onStart={onStart}
        onDrag={onDrag}
        onStop={onStop}
        nodeRef={itemRef}
      >
        {newChild}
      </DraggableCore>
      {droppableItem && ReactDOM.createPortal(droppableItem, document.body)}
    </>
  )
}
