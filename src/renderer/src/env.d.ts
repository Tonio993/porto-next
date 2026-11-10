import type { ArchiveApi } from '../../shared/contracts/archive'

declare global {
  interface Window {
    archives: ArchiveApi
  }
}
