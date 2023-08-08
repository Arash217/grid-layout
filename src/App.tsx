import { useCallback, useMemo, useRef, useState } from 'react'
import { GridLayout } from './components/GridLayout'
import { testLayout } from './data'

// import { css } from '@linaria/core'

// css`
//   :global() {
//     html, body, #root {
//       width: 100%;
//       height: 100%;
//     }
//   }
// `

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
  })

  const containerRef = useRef<HTMLDivElement>(null)

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
    <div ref={containerRef} style={{
      width: '100%',
      height: '100%'
    }}>
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
    </div>
  )
}

export default App
