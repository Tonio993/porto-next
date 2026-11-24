import dataset from './data/time-zones.json'

export const timeZoneDataset = dataset
const countryMap: Readonly<Record<string, readonly string[]>> = dataset.countries
const links: Readonly<Record<string, string>> = dataset.aliases

/** Geographic equivalence for selection only. Never canonicalize persisted moments with this. */
export function geographicZone(zone: string): string {
  while (links[zone]) zone = links[zone]
  return zone
}

const support = new Map<string, boolean>()
export function supportsTimeZone(zone: string): boolean {
  if (support.has(zone)) return support.get(zone)!
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format(0)
    support.set(zone, true)
    return true
  } catch {
    support.set(zone, false)
    return false
  }
}

export function availableTimeZones(supported = supportsTimeZone): string[] {
  return dataset.zones.filter(supported)
}

export function countryTimeZones(country: string, supported = supportsTimeZone): string[] {
  // If the current IANA name is newer than ICU, offer a supported alias of that same zone.
  return (countryMap[country] ?? []).flatMap((zone) => {
    const choice = supported(zone)
      ? zone
      : dataset.zones.find((name) => geographicZone(name) === zone && supported(name))
    return choice ? [choice] : []
  })
}

export function compatibleTimeZone(country: string, zone: string): boolean {
  return supportsTimeZone(zone) && (countryMap[country] ?? []).includes(geographicZone(zone))
}

/** A changed country retains a compatible explicit choice, then considers the company proposal. */
export function proposedPortZone(country: string, company: string, selected = ''): string {
  const zones = countryTimeZones(country)
  for (const zone of [selected, company]) {
    if (compatibleTimeZone(country, zone))
      return zones.find((choice) => geographicZone(choice) === geographicZone(zone)) ?? ''
  }
  return zones.length === 1 ? zones[0] : ''
}
