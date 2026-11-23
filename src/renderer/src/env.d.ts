import type { WriteOutcomeApi } from '../../shared/contracts/write-outcomes'
import type { ServiceApi } from '../../shared/contracts/services'
import type { AssignmentApi } from '../../shared/contracts/assignments'
import type { OperationApi } from '../../shared/contracts/operations'
import type { TariffApi } from '../../shared/contracts/tariffs'
import type { CatalogApi } from '../../shared/contracts/catalog'
import type { VesselApi } from '../../shared/contracts/vessels'
import type { AgencyApi } from '../../shared/contracts/agencies'
import type { CustomerApi } from '../../shared/contracts/customers'
import type { ArchiveApi } from '../../shared/contracts/archive'
import type { TimeApi } from '../../shared/contracts/values'
import type { BerthApi } from '../../shared/contracts/berths'
import type { PortApi } from '../../shared/contracts/ports'

declare global {
  interface Window {
    writeOutcomes: WriteOutcomeApi
    services: ServiceApi
    assignments: AssignmentApi
    operations: OperationApi
    tariffs: TariffApi
    catalog: CatalogApi
    customers: CustomerApi
    agencies: AgencyApi
    vessels: VesselApi
    archives: ArchiveApi
    time: TimeApi
    ports: PortApi
    berths: BerthApi
  }
}
