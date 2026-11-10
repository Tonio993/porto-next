import { useCallback, useEffect, useState } from 'react'
import type { ArchiveState, Result } from '../../../shared/contracts/archive'

export function useArchives() {
  const [state, setState] = useState<ArchiveState>({ active: null, recent: [] })
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    if (!window.archives) {
      setError('Avvia Porto Next dall’applicazione desktop per accedere ai tuoi archivi.')
      setBusy(false)
      return
    }
    const unsubscribe = window.archives.onChanged((next) => {
      if (alive) setState(next)
    })
    void window.archives
      .getState()
      .then((result) => {
        if (!alive) return
        if (result.ok) setState(result.value)
        else setError(result.error.message)
      })
      .catch(() => {
        if (alive) setError('Non è stato possibile inizializzare l’applicazione.')
      })
      .finally(() => {
        if (alive) setBusy(false)
      })
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const run = useCallback(async <T>(operation: () => Promise<Result<T>>): Promise<T | null> => {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await operation()
      if (!result.ok) {
        setError(result.error.message)
        return null
      }
      return result.value
    } catch {
      setError('La comunicazione con l’applicazione non è riuscita. Riprova.')
      return null
    } finally {
      setBusy(false)
    }
  }, [])

  const update = useCallback(
    async (operation: () => Promise<Result<ArchiveState>>) => {
      const next = await run(operation)
      if (next) setState(next)
      return next
    },
    [run],
  )

  return { state, busy, error, notice, setError, setNotice, run, update }
}
