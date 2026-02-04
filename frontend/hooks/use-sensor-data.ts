import { useEffect, useRef, useState } from 'react'

type SensorPayload = {
  device_id: string
  timestamp: number
  climate: {
    temperature: number
    humidity: number
    vpd?: number
  }
  soil: {
    moisture: number
  }
  light: {
    ppfd: number
    quality_index?: number
    red_blue_ratio?: number
  }
}

export default function useSensorData() {
  const [data, setData] = useState<SensorPayload | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket('ws://54.174.103.93:8000/ws')
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data)
        setData(parsed)
      } catch {}
    }
    ws.onclose = () => setConnected(false)
    ws.onerror = () => {
      try {
        ws.close()
      } catch {}
    }
    return () => {
      try {
        ws.onopen = null
        ws.onmessage = null
        ws.onclose = null
        ws.onerror = null
        ws.close()
      } catch {}
    }
  }, [])

  return { data, connected }
}
