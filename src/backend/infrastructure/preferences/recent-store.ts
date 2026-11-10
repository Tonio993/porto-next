import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { ArchiveInfo, RecentArchive } from '../../../shared/contracts/archive'

export class RecentStore {
  constructor(private readonly path: string) {}

  list(): RecentArchive[] {
    try {
      const value: unknown = JSON.parse(readFileSync(this.path, 'utf8'))
      if (!Array.isArray(value)) return []
      return value
        .filter(
          (item): item is RecentArchive =>
            !!item &&
            typeof item.path === 'string' &&
            typeof item.name === 'string' &&
            typeof item.lastOpenedAt === 'string' &&
            Number.isFinite(Date.parse(item.lastOpenedAt)),
        )
        .slice(0, 8)
    } catch {
      return []
    }
  }

  remember(archive: ArchiveInfo): void {
    const normalize = (path: string) => (process.platform === 'win32' ? path.toLowerCase() : path)
    const recent = this.list().filter((item) => normalize(item.path) !== normalize(archive.path))
    recent.unshift({
      path: archive.path,
      name: archive.name,
      lastOpenedAt: new Date().toISOString(),
    })
    mkdirSync(dirname(this.path), { recursive: true })
    const temporary = `${this.path}.tmp`
    writeFileSync(temporary, JSON.stringify(recent.slice(0, 8), null, 2), 'utf8')
    renameSync(temporary, this.path)
  }
}
