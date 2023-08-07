import { useCallback, useMemo, useState } from 'react'
import { GridLayout } from './components/GridLayout'

const testLayout = [
  {
    x: 0,
    y: 0,
    w: 8,
    h: 3,
    minW: 8,
    minH: 3,
    i: crypto.randomUUID(),
  },
  {
    x: 8,
    y: 0,
    w: 12,
    h: 6,
    minW: 8,
    minH: 6,
    i: crypto.randomUUID(),
  },
  {
    x: 20,
    y: 0,
    w: 8,
    h: 6,
    minW: 8,
    minH: 6,
    i: crypto.randomUUID(),
    minAspectRatio: 0.5,
    maxAspectRatio: 2,
  },
]

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
    compactType: null,
    isBounded: true,
  })

  const generateDom = useCallback(function () {
    return testLayout.map((item) => {
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
  }, [])

  const generatedDOM = useMemo(() => generateDom(), [generateDom])

  return (
    <>
  <div className="app__inputs-container">
    <input type="number" v-model="width" />
    <input type="number" v-model="height" />

    <input
      type="checkbox"
      id="isBounded"
      name="isBounded"
    />
    <label htmlFor="isBounded">isBounded</label>

    <input
      type="checkbox"
      id="showGridLines"
      name="showGridLines"
      defaultChecked={state.showGridLines}
      onChange={() => setState(state => ({
        ...state,
        showGridLines: !state.showGridLines
      }))}
    />
    <label htmlFor="showGridLines">showGridLines</label>

    {/* <button click="zoom(0.25)">Zoom in</button>
    <button click="zoom(-0.25)">Zoom out</button>
    <button click="resetView('instant')">Reset view</button> */}
  </div>
      <GridLayout layout={testLayout} {...state}>
        {generatedDOM}
      </GridLayout>
    </>
  )
}

export default App
