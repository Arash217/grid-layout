import React, { ReactElement, useMemo, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  DraggableCore,
  DraggableData,
  DraggableEventHandler,
} from 'react-draggable'

export type Props = {
  children: ReactElement | ReactElement[]
  onDragStart?: (e: DraggableEventHandler, data: DraggableData) => void
  onDrag?: (e: DraggableEventHandler, data: DraggableData) => void
}

export function DroppableItem(props: Props) {
  const { children } = props

  const itemRef = React.useRef(null)
  const droppableItemRef = useRef(null)
  const child = useMemo(() => React.Children.only(children), [children])
  const [droppableItem, setDroppableItem] = useState<ReactElement | null>(null)
  const droppableItemOffset = useRef<{ left: number; top: number } | null>(null)

  const newChild = React.cloneElement(child, {
    ref: itemRef,
  })

  function getOffset(el: HTMLElement) {
    const rect = el.getBoundingClientRect()

    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
    }
  }

  function onStart(e: DraggableEventHandler, data: DraggableData) {
    const { left, top } = getOffset(data.node)

    const rect = data.node.getBoundingClientRect()
    const x = data.x - rect.left
    const y = data.y - rect.top

    droppableItemOffset.current = {
      left: x,
      top: y,
    }

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

    props.onDragStart?.(e, data)
  }

  function onDrag(e: DraggableEventHandler, data: DraggableData) {
    const { left, top } = droppableItemOffset.current!

    const newChild = React.cloneElement(child, {
      ref: droppableItemRef,
      style: {
        opacity: 0.5,
        left: data.x - left,
        top: data.y - top,
        position: 'absolute',
        height: data.node.clientHeight,
        width: data.node.clientWidth,
      },
    })

    setDroppableItem(newChild)

    const event = new CustomEvent('droppable-dragover', { detail: data })
    document.dispatchEvent(event)

    // props.onDrag?.(e, data)
  }

  function onStop(e: DraggableEventHandler, data: DraggableData) {
    setDroppableItem(null)

    const event = new CustomEvent('droppable-drop', {  detail: data})
    document.dispatchEvent(event)
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
      {/* {droppableItem && droppableItem} */}
    </>
  )
}
