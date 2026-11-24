import type { ApplicationResult } from '../../../shared/contracts/application'
import type { ResponseScope } from './response-scope'

export interface RequestOptions {
  /** Reads whose caller explicitly handles absence (recovery or consultation revalidation). */
  expectedAbsence?: boolean
}

/** Async request lifecycle shared by the React adapter and independently owned lanes. */
export async function runApplicationRequest<T>(
  scope: ResponseScope,
  operation: () => Promise<ApplicationResult<T>>,
  report: (message: string | null) => void,
  setLoading: (loading: boolean) => void,
  options: RequestOptions = {},
): Promise<ApplicationResult<T> | null> {
  const ticket = scope.begin()
  if (!ticket.current()) return null
  setLoading(true)
  try {
    const result = await operation()
    if (!ticket.accepts(result)) return null
    if (!result.ok && !(options.expectedAbsence && result.error.code === 'NOT_FOUND'))
      report(result.error.message)
    return result
  } catch {
    if (ticket.current()) report('La comunicazione con l’applicazione non è riuscita. Riprova.')
    return null
  } finally {
    if (ticket.current()) setLoading(false)
  }
}
