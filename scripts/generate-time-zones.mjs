import { format, resolveConfig } from 'prettier'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Offline, reproducible generation from the vendored IANA release. No runtime download.
const root = 'resources/time-zones/2026f'
const files = ['zone.tab', 'zone1970.tab', 'backward', 'etcetera', 'version', 'LICENSE']
const sources = Object.fromEntries(
  files.map((file) => [file, readFileSync(join(root, file), 'utf8')]),
)
const rows = (text) => text.split(/\r?\n/).filter((line) => line && !line.startsWith('#'))
const aliases = {}
for (const file of ['backward', 'etcetera'])
  for (const line of rows(sources[file])) {
    const [kind, target, name] = line.trim().split(/\s+/)
    if (kind === 'Link') aliases[name] = target
  }
const canonical = (zone) => {
  const seen = new Set()
  while (aliases[zone]) {
    if (seen.has(zone)) throw Error('Cyclic IANA link')
    seen.add(zone)
    zone = aliases[zone]
  }
  return zone
}
const countries = {}
const names = new Set(['UTC'])
for (const file of ['zone.tab', 'zone1970.tab'])
  for (const line of rows(sources[file])) {
    const [codes, , zone] = line.split('\t')
    if (!zone) throw Error(`Invalid row: ${line}`)
    names.add(zone)
    for (const code of codes.split(',')) (countries[code] ??= new Set()).add(canonical(zone))
  }
for (const [alias, target] of Object.entries(aliases)) {
  names.add(alias)
  names.add(target)
}
for (const line of rows(sources.etcetera)) {
  const [kind, name] = line.trim().split(/\s+/)
  if (kind === 'Zone') names.add(name)
}
const sorted = (object) =>
  Object.fromEntries(Object.entries(object).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
const dataset = {
  version: sources.version.trim(),
  source: 'https://data.iana.org/time-zones/releases/tzdata2026f.tar.gz',
  license: 'Public domain',
  hashes: Object.fromEntries(
    files.map((file) => [
      file,
      createHash('sha256')
        .update(readFileSync(join(root, file)))
        .digest('hex'),
    ]),
  ),
  countries: sorted(
    Object.fromEntries(Object.entries(countries).map(([code, zones]) => [code, [...zones].sort()])),
  ),
  aliases: sorted(aliases),
  zones: [...names].sort(),
}
writeFileSync(
  process.argv[2] ?? 'src/shared/data/time-zones.json',
  await format(JSON.stringify(dataset), {
    ...(await resolveConfig('src/shared/data/time-zones.json')),
    parser: 'json',
  }),
)
