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
import * as styles from './DroppableItem.css'

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
  const droppableItemOffset = useRef<{ left: number; top: number } | null>(null)

  const mergedClassName = useMemo(
    () => clsx(styles.droppableItem, child.props.className, className),
    [child.props.className, className]
  )

  function onStart(e: DraggableEvent, data: DraggableData) {
    const { left: offsetLeft, top: offsetTop } = getOffset(e, data.node)

    droppableItemOffset.current = {
      left: offsetLeft,
      top: offsetTop,
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
    const { left: offsetLeft, top: offsetTop } = droppableItemOffset.current!

    const { clientX, clientY } = getClientPosition(e)

    const left = clientX! - offsetLeft + window.scrollX
    const top = clientY! - offsetTop + window.scrollY

    const position = getTranslatePosition(left, top)

    const newChild = React.cloneElement(droppableItem!, {
      ref: droppableItemRef,
      style: {
        ...droppableItem!.props.style,
        transform: position,
      },
    })

    setDroppableItem(newChild)

    /* 
      There isn't a generic event for both mouse and touch event, 
      so we used the DragEvent here. (which is technically still a mouse event)
    */
    const event = new DragEvent('dragover', {
      ...data,
      clientX: clientX!,
      clientY: clientY!,
    })
    document.dispatchEvent(event)

    props.onDropDragOver?.(e, data)
  }

  function onStop(e: DraggableEvent, data: DraggableData) {
    setDroppableItem(null)

    const { clientX, clientY } = getClientPosition(e)

    /* 
      There isn't a generic event for both mouse and touch event, 
      so we used the DragEvent here. (which is technically still a mouse event)
    */
    const event = new DragEvent('drop', {
      ...data,
      clientX: clientX!,
      clientY: clientY!,
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

export { DroppableItem }
