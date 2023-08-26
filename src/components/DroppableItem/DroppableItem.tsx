import React, { ReactElement, useMemo, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable'
import {
  DroppableEventCallback,
  getClientPosition,
  getTranslatePosition,
} from '../../helpers/utils'

import clsx from 'clsx'
import * as styles from './DroppableItem.css'
import { getOffset } from '../../helpers/calculateUtils'

export type Props = {
  children: ReactElement | ReactElement[]
  className?: string
  container: HTMLElement
  transformScale?: number
  onDropStart?: DroppableEventCallback
  onDropDragOver?: DroppableEventCallback
  onDrop?: DroppableEventCallback
}

function DroppableItem(props: Props) {
  const { className, children, transformScale = 1 } = props

  const child = useMemo(() => React.Children.only(children), [children])
  const droppableItemRef = React.useRef(null)
  const droppingItemRef = useRef(null)
  const [droppableItem, setDroppableItem] = useState<ReactElement | null>(null)
  const droppableItemOffset = useRef<{ left: number; top: number } | null>(null)

  const mergedClassName = useMemo(
    () => clsx(styles.droppableItem, child.props.className, className),
    [child.props.className, className]
  )

  const droppingItemMergedClassName = useMemo(
    () => clsx(mergedClassName, styles.droppingItem),
    [mergedClassName]
  )

  function onStart(e: DraggableEvent, data: DraggableData) {
    const { left: offsetLeft, top: offsetTop } = getOffset(e, data.node)
    const { clientX, clientY } = getClientPosition(e)

    droppableItemOffset.current = {
      left: offsetLeft,
      top: offsetTop,
    }

    const left = clientX! - offsetLeft
    const top = clientY! - offsetTop

    const position = getTranslatePosition(left, top)

    setDroppableItem(
      <div
        ref={droppingItemRef}
        className={droppingItemMergedClassName}
        style={{
          transform: `${position} scale(${transformScale})`,
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
      ref: droppingItemRef,
      style: {
        ...droppableItem!.props.style,
        transform: `${position} scale(${transformScale})`,
      },
    })

    setDroppableItem(newChild)

    /* 
      There isn't a generic event for both mouse and touch events, 
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
      There isn't a generic event for both mouse and touch events, 
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
        nodeRef={droppableItemRef}
        scale={transformScale}
      >
        <div ref={droppableItemRef} className={mergedClassName}>
          {child}
        </div>
      </DraggableCore>
      {droppableItem && ReactDOM.createPortal(droppableItem, props.container)}
    </>
  )
}

export { DroppableItem }
