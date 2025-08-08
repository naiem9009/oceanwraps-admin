'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseRealTimeDataOptions {
  enabled?: boolean
  onError?: (error: Error) => void
}

export function useRealTimeData<T>(
  url: string, 
  interval: number = 5000, 
  options: UseRealTimeDataOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { enabled = true, onError } = options

  const fetchData = useCallback(async () => {
    if (!enabled) return

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage))
      }
    } finally {
      setLoading(false)
    }
  }, [url, enabled, onError])

  const refetch = useCallback(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    fetchData()

    // Set up interval for real-time updates
    const intervalId = setInterval(fetchData, interval)

    return () => clearInterval(intervalId)
  }, [fetchData, interval, enabled])

  return { data, loading, error, refetch }
}

'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseRealTimeDataOptions {
  enabled?: boolean
  onError?: (error: Error) => void
}

export function useRealTimeData<T>(
  url: string, 
  interval: number = 5000, 
  options: UseRealTimeDataOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { enabled = true, onError } = options

  const fetchData = useCallback(async () => {
    if (!enabled) return

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage))
      }
    } finally {
      setLoading(false)
    }
  }, [url, enabled, onError])

  const refetch = useCallback(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    fetchData()

    // Set up interval for real-time updates
    const intervalId = setInterval(fetchData, interval)

    return () => clearInterval(intervalId)
  }, [fetchData, interval, enabled])

  return { data, loading, error, refetch }
}
