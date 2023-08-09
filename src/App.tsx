import { useCallback, useMemo, useRef, useState } from 'react'
import { GridLayout } from './components/GridLayout'
import { FlexibleItem } from './components/FlexibleItem'
import { testLayout } from './data'

import { css } from '@linaria/core'
import { Layout, LayoutItem } from './helpers/utils'

// css`
//   :global() {
//     html, body, #root {
//       width: 100%;
//       height: 100%;
//     }
//   }
// `

css`
  :global() {
    .available-widgets {
      display: flex;
      margin-bottom: 10px;
    }
    .droppable-element {
      background: pink;
      height: 100%;
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
    isBounded: false,
    isDroppable: true,
  })

  const [layout, setLayout] = useState(testLayout)
  const [droppingItem, setDroppingItem] = useState<LayoutItem | undefined>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleDrop(layout: Layout) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    setLayout([...layout])
    setDroppingItem(undefined)
  }

  const containerRef = useRef<HTMLDivElement>(null)

  const columnWidth = state.width / state.cols
  const rowHeight = state.height / state.rows

  // useEffect(() => {
  //   const element = containerRef.current

  //   if (!element) return;

  //   const observer = new ResizeObserver((entries) => {
  //     const content = entries[0]
  //     const { width, height } = content.contentRect

  //     setState((state) => ({
  //       ...state,
  //       width: width * 0.5,
  //       height: height * 0.5
  //     }))
  //   });

  //   observer.observe(element);
  //   return () => {
  //     // Cleanup the observer by unobserving all elements
  //     observer.disconnect();
  //   };
  // }, [])

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
      <FlexibleItem
        key={item.i}
        columnWidth={columnWidth}
        rowHeight={rowHeight}
        width={item.w}
        height={item.h}
      >
        <div
          className="droppable-element"
          draggable={true}
          unselectable="on"
          // this is a hack for firefox
          // Firefox requires some kind of initialization
          // which we can do by adding this attribute
          // @see https://bugzilla.mozilla.org/show_bug.cgi?id=568313
          onDragStart={(e) => { 
            e.dataTransfer.setData('text/plain', '')

            const droppingItem = {
              ...item,
              i: crypto.randomUUID()
            }

            setDroppingItem(droppingItem)
          }}
        >
          Droppable Element (Drag me!)
        </div>
      </FlexibleItem>
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

        <input type="checkbox" id="isBounded" name="isBounded" />
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

        <div className="available-widgets">{availableWidgets}</div>
        {/* <button click="zoom(0.25)">Zoom in</button>
        <button click="zoom(-0.25)">Zoom out</button>
        <button click="resetView('instant')">Reset view</button> */}
      </div>
      <GridLayout layout={layout} droppingItem={droppingItem} onDrop={handleDrop} {...state}>
        {generatedDOM}
      </GridLayout>
    </div>
  )
}

export default App
