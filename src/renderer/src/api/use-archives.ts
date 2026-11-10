import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArchiveState, Result } from '../../../shared/contracts/archive'
import { canApplyArchiveState } from '../../../shared/archive-state-order'

export function useArchives() {
  const [state, setState] = useState<ArchiveState>({ active: null, recent: [], context: null })
  const latest = useRef(state)
  const epoch = useRef(0)
  const pending = useRef(0)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const apply = useCallback((next: ArchiveState, requestEpoch: number) => {
    if (!canApplyArchiveState(latest.current, next, requestEpoch, epoch.current)) return false
    if (latest.current.context?.sessionId !== next.context?.sessionId) {
      setError(null)
      setNotice(null)
    }
    latest.current = next
    epoch.current += 1
    setState(next)
    return true
  }, [])

  useEffect(() => {
    let alive = true
    if (!window.archives) {
      setError('Avvia Porto Next dall’applicazione desktop per accedere ai tuoi archivi.')
      setBusy(false)
      return
    }
    const unsubscribe = window.archives.onChanged((next) => {
      if (alive) apply(next, epoch.current)
    })
    const requestEpoch = epoch.current
    void window.archives
      .getState()
      .then((result) => {
        if (!alive) return
        if (result.ok) apply(result.value, requestEpoch)
        else if (requestEpoch === epoch.current) setError(result.error.message)
      })
      .catch(() => {
        if (alive && requestEpoch === epoch.current)
          setError('Non è stato possibile inizializzare l’applicazione.')
      })
      .finally(() => {
        if (alive) setBusy(pending.current > 0)
      })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [apply])

  const run = useCallback(
    async <T>(
      operation: () => Promise<Result<T>>,
      allowSessionChange = false,
    ): Promise<T | null> => {
      const requestSession = latest.current.context?.sessionId
      pending.current += 1
      setBusy(true)
      setError(null)
      setNotice(null)
      try {
        const result = await operation()
        if (!result.ok) {
          if (latest.current.context?.sessionId === requestSession) setError(result.error.message)
          return null
        }
        if (
          !allowSessionChange &&
          (latest.current.context?.sessionId !== requestSession ||
            (result.context &&
              latest.current.context &&
              BigInt(result.context.revision) < BigInt(latest.current.context.revision)))
        )
          return null
        return result.value
      } catch {
        if (latest.current.context?.sessionId === requestSession)
          setError('La comunicazione con l’applicazione non è riuscita. Riprova.')
        return null
      } finally {
        pending.current -= 1
        setBusy(pending.current > 0)
      }
    },
    [],
  )

  const update = useCallback(
    async (operation: () => Promise<Result<ArchiveState>>) => {
      const requestEpoch = epoch.current
      const next = await run(operation, true)
      return next && apply(next, requestEpoch) ? next : null
    },
    [run, apply],
  )

  return { state, busy, error, notice, setError, setNotice, run, update }
}
