import type { PortDto } from '../../../shared/contracts/ports'
import type { VesselDto } from '../../../shared/contracts/vessels'
import type { BerthDto } from '../../../shared/contracts/berths'
import { countryName } from '../app/ports/PortDescriptionFields'
/** Domain reservations make these tuples unique across pages, filters and statuses. */
export function portName(p: PortDto): string {
  return p.version.name + ' · ' + p.version.locality + ' · ' + countryName(p.version.countryCode)
}
export function vesselName(v: VesselDto): string {
  return v.version.registeredName + (v.version.imoNumber ? ' · IMO ' + v.version.imoNumber : '')
}
export function berthName(b: BerthDto): string {
  return b.version.name + ' · ' + (b.portLabel ?? 'Porto selezionato')
}
