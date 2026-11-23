import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApplicationResult, ArchiveContextDto } from '../../../shared/contracts/application'
import { ResponseScope } from './response-scope'
import { runApplicationRequest, type RequestOptions } from './application-request'

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
    <T>(operation: () => Promise<ApplicationResult<T>>, options?: RequestOptions) =>
      runApplicationRequest(scope, operation, report, setLoading, options),
    [scope, report],
  )
  const suspendWhile = useCallback(
    <T>(operation: () => Promise<T>, enabled = true) => {
      if (enabled) setLoading(false)
      return scope.suspendWhile(operation, enabled)
    },
    [scope],
  )
  return { loading, request, invalidate, suspendWhile }
}
