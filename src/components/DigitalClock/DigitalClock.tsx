import { CSSProperties, useEffect, useState } from 'react'

import * as cssStyles from './DigitalClock.css'

export function DigitalClock() {
  const [time, setTime] = useState(getTime)

  const styles: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    containerType: 'inline-size',
  }

  const mergedStyles = {
    ...styles,
  }

  function getTime() {
    const current = new Date()
    let time = ''

    const hours = current.getHours()

    if (hours < 10) {
      time += '0' + hours
    } else {
      time += hours
    }

    time += ':'

    const minutes = current.getMinutes()

    if (minutes < 10) {
      time += '0' + minutes
    } else {
      time += minutes
    }

    time += ':'

    const seconds = current.getSeconds()

    if (seconds < 10) {
      time += '0' + seconds
    } else {
      time += seconds
    }

    return time
  }

  useEffect(() => {
    setInterval(() => {
      const time = getTime()
      setTime(time)
    }, 1000)
  }, [])

  return (
    <div style={mergedStyles}>
      <span>{time}</span>
      <div className={cssStyles.digitalClock}></div>
    </div>
  )
}
