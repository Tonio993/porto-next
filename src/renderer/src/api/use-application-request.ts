import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApplicationResult, ArchiveContextDto } from '../../../shared/contracts/application'
import { ResponseScope } from './response-scope'

export function useApplicationRequest(
  context: ArchiveContextDto | null,
  report: (message: string | null) => void,
) {
  const latest = useRef(context)
  latest.current = context
  const [scope] = useState(() => new ResponseScope(() => latest.current))
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    scope.activate()
    return () => scope.dispose()
  }, [scope])
  const invalidate = useCallback(() => {
    scope.invalidate()
    setLoading(false)
  }, [scope])
  const request = useCallback(
    async <T>(operation: () => Promise<ApplicationResult<T>>) => {
      const ticket = scope.begin()
      setLoading(true)
      try {
        const result = await operation()
        if (!ticket.accepts(result)) return null
        if (!result.ok) report(result.error.message)
        return result
      } catch {
        if (ticket.current()) report('La comunicazione con l’applicazione non è riuscita. Riprova.')
        return null
      } finally {
        if (ticket.current()) setLoading(false)
      }
    },
    [scope, report],
  )
  return { loading, request, invalidate }
}
