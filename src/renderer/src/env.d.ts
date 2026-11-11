import type { VesselApi } from '../../shared/contracts/vessels'
import type { AgencyApi } from '../../shared/contracts/agencies'
import type { CustomerApi } from '../../shared/contracts/customers'
import type { ArchiveApi } from '../../shared/contracts/archive'
import type { TimeApi } from '../../shared/contracts/values'
import type { BerthApi } from '../../shared/contracts/berths'
import type { PortApi } from '../../shared/contracts/ports'

declare global {
  interface Window {
    customers: CustomerApi
    agencies: AgencyApi
    vessels: VesselApi
    archives: ArchiveApi
    time: TimeApi
    ports: PortApi
    berths: BerthApi
  }
}
