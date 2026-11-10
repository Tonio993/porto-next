import type { ArchiveApi } from '../../shared/contracts/archive'
import type { TimeApi } from '../../shared/contracts/values'
import type { BerthApi } from '../../shared/contracts/berths'
import type { PortApi } from '../../shared/contracts/ports'

declare global {
  interface Window {
    archives: ArchiveApi
    time: TimeApi
    ports: PortApi
    berths: BerthApi
  }
}
