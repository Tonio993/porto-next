import type { ArchiveState } from './contracts/archive'

/** Events are authoritative for session transitions; late responses cannot undo them. */
export function canApplyArchiveState(
  current: ArchiveState,
  next: ArchiveState,
  requestEpoch: number,
  currentEpoch: number,
): boolean {
  if (current.context?.sessionId === next.context?.sessionId) {
    return (
      !current.context ||
      !next.context ||
      BigInt(next.context.revision) >= BigInt(current.context.revision)
    )
  }
  return requestEpoch === currentEpoch
}
