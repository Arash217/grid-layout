import { useEffect } from 'react'
import './AnalogClock.css'

export function AnalogClock() {
  useEffect(() => {
    const svg = document.querySelector('svg')
    const currentTime = new Date()

    svg!.style.setProperty(
      '--start-seconds',
      currentTime.getSeconds().toString()
    )
    svg!.style.setProperty(
      '--start-minutes',
      currentTime.getMinutes().toString()
    )
    svg!.style.setProperty(
      '--start-hours',
      (currentTime.getHours() % 12).toString()
    )
  }, [])

  return (
    <div className='parent'>
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="19" />
        <g className="marks">
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
          <line x1="15" y1="0" x2="16" y2="0" />
        </g>
        <text x="0" y="0" className="tiaText">
          #TIA
        </text>
        <line x1="0" y1="0" x2="9" y2="0" className="hour" />
        <line x1="0" y1="0" x2="13" y2="0" className="minute" />
        <line x1="0" y1="0" x2="16" y2="0" className="seconds" />
        <circle cx="20" cy="20" r="0.7" className="pin" />
      </svg>
    </div>
  )
}
