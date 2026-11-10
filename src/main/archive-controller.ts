import { basename, join } from 'node:path'
import { BrowserWindow, dialog } from 'electron'
import { ArchiveService } from '../backend/application/archives/archive-service'
import { RecentStore } from '../backend/infrastructure/preferences/recent-store'
import type { ArchiveState, Result } from '../shared/contracts/archive'
import { ArchiveError, asArchiveError } from '../shared/errors/archive-error'

export type ArchiveAction =
  'state' | 'create' | 'open' | 'openRecent' | 'saveAs' | 'backup' | 'close' | 'rename'
const filters = [{ name: 'Archivio Porto Next', extensions: ['ormeggi'] }]

export class ArchiveController {
  private readonly archives = new ArchiveService()
  private readonly recent: RecentStore
  private pending: Promise<void> = Promise.resolve()

  constructor(
    userDataPath: string,
    private readonly window: () => BrowserWindow | null,
    private readonly publish: (state: ArchiveState) => void,
    private readonly log: (error: unknown) => void,
  ) {
    this.recent = new RecentStore(join(userDataPath, 'recent-archives.json'))
  }

  execute(action: ArchiveAction, input?: unknown): Promise<Result<unknown>> {
    const result = this.pending.then(async (): Promise<Result<unknown>> => {
      try {
        const value = await this.perform(action, input)
        const active = this.archives.current()
        if (active && action !== 'state' && action !== 'backup') {
          try {
            this.recent.remember(active)
          } catch (error) {
            this.log(error)
          }
        }
        const state = this.state()
        if (action !== 'state') this.publish(state)
        return { ok: true, value: action === 'backup' ? value : state }
      } catch (error) {
        this.log(error)
        const known = asArchiveError(error)
        return { ok: false, error: { code: known.code, message: known.message } }
      }
    })
    this.pending = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  async shutdown(): Promise<void> {
    await this.pending
    await this.archives.close()
  }

  private state(): ArchiveState {
    return { active: this.archives.current(), recent: this.recent.list() }
  }

  private async perform(action: ArchiveAction, input?: unknown): Promise<unknown> {
    const window = this.window()
    if (action === 'state') return this.state()
    if (action === 'close') return this.archives.close()
    if (action === 'rename') return this.archives.rename(this.text(input))
    if (action === 'openRecent') {
      const path = this.text(input)
      if (!this.recent.list().some((item) => item.path === path))
        throw new ArchiveError('INVALID_INPUT', 'Seleziona un archivio dall’elenco dei recenti.')
      return this.archives.open(path)
    }
    if (!window || window.isDestroyed())
      throw new ArchiveError('UNEXPECTED', 'La finestra dell’applicazione non è disponibile.')

    if (action === 'open') {
      const result = await dialog.showOpenDialog(window, {
        title: 'Apri archivio',
        filters,
        properties: ['openFile'],
      })
      if (!result.canceled && result.filePaths[0]) await this.archives.open(result.filePaths[0])
      return
    }
    if (action === 'create') {
      const name = this.text(input).trim()
      if (!name || name.length > 120)
        throw new ArchiveError('INVALID_INPUT', 'Inserisci un nome tra 1 e 120 caratteri.')
      const filename =
        // eslint-disable-next-line no-control-regex -- Esclude i caratteri vietati nei nomi dei file Windows.
        name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '') || 'Archivio'
      const result = await dialog.showSaveDialog(window, {
        title: 'Crea nuovo archivio',
        defaultPath: `${filename}.ormeggi`,
        filters,
      })
      if (!result.canceled && result.filePath) await this.archives.create(result.filePath, name)
      return
    }

    const active = this.archives.current()
    if (!active) throw new ArchiveError('NO_ARCHIVE', 'Apri o crea un archivio per continuare.')
    const backup = action === 'backup'
    const result = await dialog.showSaveDialog(window, {
      title: backup ? 'Crea copia di backup' : 'Salva archivio con nome',
      defaultPath: join(
        active.path,
        '..',
        `${basename(active.path, '.ormeggi')}-${backup ? 'backup' : 'copia'}.ormeggi`,
      ),
      filters,
    })
    if (result.canceled || !result.filePath) return { path: null }
    if (backup) return { path: await this.archives.backup(result.filePath) }
    return this.archives.saveAs(result.filePath)
  }

  private text(input: unknown): string {
    if (typeof input !== 'string' || !input || input.length > 32_768)
      throw new ArchiveError('INVALID_INPUT', 'La richiesta non è valida.')
    return input
  }
}
