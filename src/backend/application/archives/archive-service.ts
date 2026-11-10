import { randomUUID } from 'node:crypto'
import { closeSync, openSync, realpathSync, rmSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import type { ArchiveInfo } from '../../../shared/contracts/archive'
import { ArchiveError } from '../../../shared/errors/archive-error'
import { DatabaseSession } from '../../infrastructure/database/database-session'
import { migrate, SCHEMA_VERSION } from '../../infrastructure/database/migrations'
import { archiveMetadata } from '../../infrastructure/database/schema'

export class ArchiveService {
  private session: DatabaseSession | null = null
  private pending: Promise<void> = Promise.resolve()

  current(): ArchiveInfo | null {
    if (!this.session) return null
    const { id, name, createdAt, updatedAt } = this.session.metadata()
    return {
      id,
      name,
      path: this.session.path,
      schemaVersion: SCHEMA_VERSION,
      createdAt,
      updatedAt,
    }
  }

  create(path: string, name: string): Promise<ArchiveInfo> {
    return this.enqueue(() => {
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
        this.activate(candidate)
        return this.current()!
      } catch (error) {
        candidate?.close()
        this.removeIncomplete(destination)
        throw error
      }
    })
  }

  open(path: string): Promise<ArchiveInfo> {
    return this.enqueue(async () => {
      const canonical = realpathSync(resolve(path))
      if (!statSync(canonical).isFile())
        throw new ArchiveError('INVALID_ARCHIVE', 'Seleziona un file di archivio.')
      if (this.session && this.samePath(this.session.path, canonical)) return this.current()!
      const candidate = new DatabaseSession(canonical)
      try {
        const version = candidate.validate()
        if (version < SCHEMA_VERSION) {
          const backupPath = `${canonical}.prima-v${SCHEMA_VERSION}-${Date.now()}.ormeggi`
          await this.copy(candidate, backupPath)
          migrate(candidate.sqlite, version)
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
    })
  }

  saveAs(path: string): Promise<ArchiveInfo> {
    return this.enqueue(async () => {
      const source = this.requireSession()
      const destination = resolve(path)
      await this.copy(source, destination)
      let candidate: DatabaseSession | undefined
      try {
        candidate = new DatabaseSession(destination)
        candidate.validate()
        candidate.configure()
        candidate.metadata()
        this.activate(candidate)
        return this.current()!
      } catch (error) {
        candidate?.close()
        this.removeIncomplete(destination)
        throw error
      }
    })
  }

  backup(path: string): Promise<string> {
    return this.enqueue(async () => {
      const destination = resolve(path)
      await this.copy(this.requireSession(), destination)
      return destination
    })
  }

  rename(name: string): Promise<ArchiveInfo> {
    return this.enqueue(() => {
      const session = this.requireSession()
      const cleanName = this.validateName(name)
      session.db
        .update(archiveMetadata)
        .set({ name: cleanName, updatedAt: new Date().toISOString() })
        .where(eq(archiveMetadata.singleton, 1))
        .run()
      return this.current()!
    })
  }

  close(): Promise<void> {
    return this.enqueue(() => {
      this.session?.close()
      this.session = null
    })
  }

  private activate(candidate: DatabaseSession): void {
    this.session?.close()
    this.session = candidate
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

  private enqueue<T>(operation: () => T | Promise<T>): Promise<T> {
    const result = this.pending.then(operation)
    this.pending = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}
