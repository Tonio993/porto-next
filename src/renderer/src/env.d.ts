import type { ArchiveApi } from '../../shared/contracts/archive'
import type { TimeApi } from '../../shared/contracts/values'
import type { PortApi } from '../../shared/contracts/ports'

declare global {
  interface Window {
    archives: ArchiveApi
    time: TimeApi
    ports: PortApi
  }
}
