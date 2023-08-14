import { useCallback, useMemo, useRef, useState } from 'react'
import { GridLayout } from './components/GridLayout'
import { FlexibleItem } from './components/FlexibleItem'
import { DroppableItem } from './components/DroppableItem'
import { DataType, testLayout } from './data'

import { css } from '@linaria/core'
import { DroppingItem, Layout } from './helpers/utils'
import { getOffset } from './helpers/calculateUtils'

css`
  :global() {
    .available-widgets {
      display: flex;
      margin-bottom: 10px;
    }
    .droppable-element {
      background: pink;
    }
  }
`

function App() {
  const [state, setState] = useState({
    className: 'layout',
    onLayoutChange: function () {},
    cols: 48,
    rows: 32,
    width: window.screen.width * 0.5,
    height: window.screen.height * 0.5,
    showGridLines: true,
    isDraggable: true,
    isResizable: true,
    compactType: null,
    isDroppable: true,
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

  const generateDom = useCallback(() => {
    return layout.map((item) => {
      return (
        <div
          key={item.i}
          style={{
            background: 'red',
          }}
        >
          <span className="text">{item.i}</span>
        </div>
      )
    })
  }, [layout])

  const generateAvailableWidgets = useCallback(() => {
    return testLayout.map((item) => (
      <DroppableItem
        key={item.i}
        container={document.body}
        onDropStart={(e, data) => {
          const { x, y } = getOffset(e, data)

          const droppingItem = {
            ...item,
            i: crypto.randomUUID(),
            offsetX: x,
            offsetY: y,
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
          <div className="droppable-element">Droppable Element (Drag me!)</div>
        </FlexibleItem>
      </DroppableItem>
    ))
  }, [columnWidth, rowHeight])

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
      </div>
      <div className="available-widgets">{availableWidgets}</div>
      <GridLayout
        isBounded={isBounded}
        layout={layout}
        droppingItem={droppingItem}
        onDrop={handleDrop}
        {...state}
      >
        {generatedDOM}
      </GridLayout>
    </div>
  )
}

export default App
