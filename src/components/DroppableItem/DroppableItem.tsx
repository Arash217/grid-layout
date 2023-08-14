import React, { ReactElement, useMemo, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable'
import {
  DroppableEventCallback,
  getClientPosition,
  getTranslatePosition,
} from '../../helpers/utils'
import { getOffset, getRelativePosition } from '../../helpers/calculateUtils'

import clsx from 'clsx'
import { styled } from '@linaria/react'

export type Props = {
  children: ReactElement | ReactElement[]
  className?: string
  container: HTMLElement
  onDropStart?: DroppableEventCallback
  onDropDragOver?: DroppableEventCallback
  onDrop?: DroppableEventCallback
}

function DroppableItem(props: Props) {
  const { className, children } = props

  const child = useMemo(() => React.Children.only(children), [children])
  const itemRef = React.useRef(null)
  const droppableItemRef = useRef(null)
  const [droppableItem, setDroppableItem] = useState<ReactElement | null>(null)
  const droppableItemOffset = useRef<{ x: number; y: number } | null>(null)

  const mergedClassName = useMemo(
    () => clsx(child.props.className, className),
    [child.props.className, className]
  )

  function onStart(e: DraggableEvent, data: DraggableData) {
    const { x, y } = getOffset(e, data)

    droppableItemOffset.current = {
      x,
      y,
    }

    const { left, top } = getRelativePosition(data.node)
    const position = getTranslatePosition(left, top)

    setDroppableItem(
      <div
        ref={droppableItemRef}
        className={mergedClassName}
        style={{
          opacity: 0.7,
          position: 'absolute',
          top: 0,
          left: 0,
          transform: position,
        }}
      >
        {child}
      </div>
    )

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

    const { x: clientX, y: clientY } = getClientPosition(e)

    setDroppableItem(newChild)

    const event = new CustomEvent('droppable-dragover', {
      detail: { ...data, clientX: clientX!, clientY: clientY! },
    })
    document.dispatchEvent(event)

    props.onDropDragOver?.(e, data)
  }

  function onStop(e: DraggableEvent, data: DraggableData) {
    setDroppableItem(null)

    const { x: clientX, y: clientY } = getClientPosition(e)

    const event = new CustomEvent('droppable-drop', {
      detail: { ...data, clientX: clientX!, clientY: clientY! },
    })
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
        <div ref={itemRef} className={mergedClassName}>
          {child}
        </div>
      </DraggableCore>
      {droppableItem && ReactDOM.createPortal(droppableItem, props.container)}
    </>
  )
}

const StyledDroppableItem = styled(DroppableItem)`
  cursor: grab;
`

export { StyledDroppableItem as DroppableItem }
