import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GridLayout } from './components/GridLayout'
import { FlexibleItem } from './components/FlexibleItem'
import { DroppableItem } from './components/DroppableItem'
import { ScalableItem } from './components/ScalableItem'
import { DataType, testLayout } from './data'

import { DroppingItem, Layout } from './helpers/utils'
import { getOffset } from './helpers/calculateUtils'
import { AnalogClock } from './components/AnalogClock'

function App() {
  const initialWidth = window.screen.width * 0.5
  const initialHeight = window.screen.height * 0.5

  const [state, setState] = useState({
    className: 'layout',
    onLayoutChange: function () {},
    cols: 48,
    rows: 32,
    width: initialWidth,
    height: initialHeight,
    showGridLines: true,
    isDraggable: true,
    isResizable: true,
    compactType: null,
    isDroppable: true,
    itemScale: 1,
  })

  const [layout, setLayout] = useState(testLayout)
  const [droppingItem, setDroppingItem] = useState<DroppingItem | undefined>()
  const [isBounded, setIsBounded] = useState(false)

  function handleDrop(layout: Layout) {
    setLayout([...(layout as DataType)])
    setDroppingItem(undefined)
  }

  const containerRef = useRef<HTMLDivElement>(null)

  const columnWidth = state.width / state.cols
  const rowHeight = state.height / state.rows

  useLayoutEffect(() => {
    setState((state) => ({
      ...state,
      width: initialWidth * state.itemScale,
      height: initialHeight * state.itemScale,
    }))
  }, [initialHeight, initialWidth, state.itemScale])

  const generateDom = useCallback(() => {
    return layout.map((item) => {
      return (
        <div
          key={item.i}
          style={{
            background: 'red',
          }}
        >
          <ScalableItem itemScale={state.itemScale}>
            <AnalogClock />
          </ScalableItem>
        </div>
      )
    })
  }, [layout, state.itemScale])

  const generateAvailableWidgets = useCallback(() => {
    return testLayout.map((item) => (
      <DroppableItem
        key={item.i}
        container={document.body}
        onDropStart={(e, data) => {
          const { left, top } = getOffset(e, data.node)

          const droppingItem = {
            ...item,
            i: crypto.randomUUID(),
            offsetLeft: left,
            offsetTop: top,
          }

          setDroppingItem(droppingItem)
        }}
      >
        <FlexibleItem
          columnWidth={columnWidth}
          rowHeight={rowHeight}
          width={item.w}
          height={item.h}
        >
          <ScalableItem itemScale={state.itemScale}>
            <div
              style={{
                backgroundColor: 'pink',
              }}
            >
              <div>Droppable Element (Drag me!)</div>
            </div>
          </ScalableItem>
        </FlexibleItem>
      </DroppableItem>
    ))
  }, [columnWidth, rowHeight, state.itemScale])

  const availableWidgets = useMemo(
    () => generateAvailableWidgets(),
    [generateAvailableWidgets]
  )
  const generatedDOM = useMemo(() => generateDom(), [generateDom])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <div className="app__inputs-container">
        <input type="number" v-model="width" />
        <input type="number" v-model="height" />

        <input
          type="checkbox"
          id="isBounded"
          name="isBounded"
          onChange={() => setIsBounded((isBounded) => !isBounded)}
        />
        <label htmlFor="isBounded">isBounded</label>

        <input
          type="checkbox"
          id="showGridLines"
          name="showGridLines"
          defaultChecked={state.showGridLines}
          onChange={() =>
            setState((state) => ({
              ...state,
              showGridLines: !state.showGridLines,
            }))
          }
        />
        <label htmlFor="showGridLines">showGridLines</label>

        <button
          onClick={() =>
            setState((state) => ({
              ...state,
              itemScale: state.itemScale + 0.25,
            }))
          }
        >
          Zoom in
        </button>
        <button
          onClick={() =>
            setState((state) => ({
              ...state,
              itemScale: state.itemScale - 0.25,
            }))
          }
        >
          Zoom out
        </button>
      </div>
      <div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          {availableWidgets}
        </div>
        <GridLayout
          isBounded={isBounded}
          layout={layout}
          droppingItem={droppingItem}
          onDrop={handleDrop}
          {...state}
          itemScale={1}
        >
          {generatedDOM}
        </GridLayout>
      </div>
    </div>
  )
}

export default App
