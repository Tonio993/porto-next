import { randomUUID } from 'node:crypto'
import { closeSync, openSync, realpathSync, rmSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import type { ArchiveInfo } from '../../../shared/contracts/archive'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { DatabaseSession } from '../../infrastructure/database/database-session'
import { migrate, SCHEMA_VERSION } from '../../infrastructure/database/migrations'
import { archiveMetadata } from '../../infrastructure/database/schema'
import { ArchiveCoordinator } from './archive-coordinator'

export class ArchiveFileOperations {
  constructor(private readonly coordinator: ArchiveCoordinator) {}

  private get session(): DatabaseSession | null {
    return this.coordinator.database
  }

  current(): ArchiveInfo | null {
    return this.coordinator.current()
  }

  create(path: string, name: string): ArchiveInfo {
    const cleanName = this.validateName(name)
    const destination = resolve(path)
    this.reserve(destination)
    let candidate: DatabaseSession | undefined
    try {
      candidate = new DatabaseSession(destination)
      candidate.configure()
      migrate(candidate.sqlite, 0)
      const now = new Date().toISOString()
      candidate.db
        .insert(archiveMetadata)
        .values({
          singleton: 1,
          id: randomUUID(),
          name: cleanName,
          createdAt: now,
          updatedAt: now,
        })
        .run()
      candidate.metadata()
      candidate.companyZone()
      this.activate(candidate)
      return this.current()!
    } catch (error) {
      candidate?.close()
      this.removeIncomplete(destination)
      throw error
    }
  }

  async open(path: string): Promise<ArchiveInfo> {
    const canonical = realpathSync(resolve(path))
    if (!statSync(canonical).isFile())
      throw new ArchiveError('INVALID_ARCHIVE', 'Seleziona un file di archivio.')
    if (this.session && this.samePath(this.session.path, canonical)) return this.current()!
    const candidate = new DatabaseSession(canonical)
    try {
      const version = candidate.validate()
      try {
        candidate.metadata(version)
        if (version >= 3) candidate.companyZone()
      } catch {
        throw new ArchiveError('INVALID_ARCHIVE', 'La struttura dell’archivio non è valida.')
      }
      candidate.configure()
      if (version < SCHEMA_VERSION) {
        const backupPath = `${canonical}.prima-v${SCHEMA_VERSION}-${Date.now()}.ormeggi`
        await this.copy(candidate, backupPath)
        candidate.sqlite.transaction(() => {
          migrate(candidate.sqlite, version)
          candidate.metadata()
          candidate.companyZone()
        })()
      }
      try {
        candidate.metadata()
      } catch {
        throw new ArchiveError('INVALID_ARCHIVE', 'La struttura dell’archivio non è valida.')
      }
      candidate.configure()
      this.activate(candidate)
      return this.current()!
    } catch (error) {
      candidate.close()
      throw error
    }
  }

  async saveAs(path: string): Promise<ArchiveInfo> {
    const source = this.requireSession()
    const destination = resolve(path)
    await this.copy(source, destination)
    let candidate: DatabaseSession | undefined
    try {
      candidate = new DatabaseSession(destination)
      candidate.validate()
      candidate.configure()
      candidate.metadata()
      candidate.companyZone()
      this.activate(candidate)
      return this.current()!
    } catch (error) {
      candidate?.close()
      this.removeIncomplete(destination)
      throw error
    }
  }

  async backup(path: string): Promise<string> {
    const destination = resolve(path)
    await this.copy(this.requireSession(), destination)
    return destination
  }

  rename(name: string, expected = this.coordinator.context()): ArchiveInfo {
    const session = this.requireSession()
    const cleanName = this.validateName(name)
    this.coordinator.write(expected, () => {
      if (session.metadata().name === cleanName) return
      session.db
        .update(archiveMetadata)
        .set({ name: cleanName })
        .where(eq(archiveMetadata.singleton, 1))
        .run()
    })
    return this.current()!
  }

  close(): void {
    this.coordinator.deactivate()
  }

  private activate(candidate: DatabaseSession): void {
    this.coordinator.activate(candidate)
  }

  private requireSession(): DatabaseSession {
    if (!this.session)
      throw new ArchiveError('NO_ARCHIVE', 'Apri o crea un archivio per continuare.')
    return this.session
  }

  private validateName(name: string): string {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120)
      throw new ArchiveError('INVALID_INPUT', 'Inserisci un nome tra 1 e 120 caratteri.')
    return name.trim()
  }

  private reserve(path: string): void {
    // La creazione esclusiva impedisce di sovrascrivere un archivio esistente.
    closeSync(openSync(path, 'wx'))
  }

  private async copy(source: DatabaseSession, destination: string): Promise<void> {
    this.reserve(destination)
    try {
      await source.sqlite.backup(destination)
      const snapshot = new DatabaseSession(destination)
      try {
        snapshot.configure()
      } finally {
        snapshot.close()
      }
    } catch (error) {
      this.removeIncomplete(destination)
      throw error
    }
  }

  private removeIncomplete(path: string): void {
    try {
      rmSync(path, { force: true })
    } catch {
      /* Il file può essere già stato rimosso. */
    }
  }

  private samePath(left: string, right: string): boolean {
    return process.platform === 'win32'
      ? left.toLowerCase() === right.toLowerCase()
      : left === right
  }
}
