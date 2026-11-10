import type { ArchiveApi } from '../../shared/contracts/archive'
import type { TimeApi } from '../../shared/contracts/values'

declare global {
  interface Window {
    archives: ArchiveApi
    time: TimeApi
  }
}
