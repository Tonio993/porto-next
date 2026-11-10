import { basename, join } from 'node:path'
import { BrowserWindow, dialog } from 'electron'
import type { ArchiveContextDto } from '../shared/contracts/application'
import type { ArchiveFileOperations } from '../backend/application/archives/archive-files'
import {
  record,
  validateContext,
  validateFileRequest,
} from '../backend/application/archives/context-validation'
import { ArchiveService } from '../backend/application/archives/archive-service'
import { RecentStore } from '../backend/infrastructure/preferences/recent-store'
import type { ArchiveState, Result } from '../shared/contracts/archive'
import { ArchiveError, asArchiveError } from '../shared/errors/archive-error'

export type ArchiveAction =
  'state' | 'create' | 'open' | 'openRecent' | 'saveAs' | 'backup' | 'close' | 'rename'
const filters = [{ name: 'Archivio Porto Next', extensions: ['ormeggi'] }]

export class ArchiveController {
  private readonly recent: RecentStore

  constructor(
    userDataPath: string,
    private readonly window: () => BrowserWindow | null,
    private readonly publish: (state: ArchiveState) => void,
    private readonly log: (error: unknown) => void,
    private readonly archives = new ArchiveService(),
  ) {
    this.recent = new RecentStore(join(userDataPath, 'recent-archives.json'))
  }

  execute(action: ArchiveAction, input?: unknown): Promise<Result<unknown>> {
    // Capture the menu/legacy target now, before waiting in the shared queue or a dialog.
    const targeted = ['rename', 'saveAs', 'backup', 'close'].includes(action)
    const legacy = input === undefined || (action === 'rename' && typeof input === 'string')
    const captured = targeted && legacy ? this.archives.context() : null
    return this.archives.withFiles(async (files): Promise<Result<unknown>> => {
      try {
        let expected = captured
        let valueInput = input
        if (action === 'rename' && input !== undefined && typeof input !== 'string') {
          const parameters = record(input, ['context', 'payload'])
          const payload = record(parameters.payload, ['name'])
          valueInput = this.text(payload.name)
          expected = validateContext(parameters.context)
        } else if (targeted && action !== 'rename' && input !== undefined) {
          expected = validateFileRequest(input)
        }
        if (action === 'rename') valueInput = this.text(valueInput)
        if (targeted) this.archives.coordinator.assertContext(expected)
        const value = await this.perform(files, action, valueInput, expected)
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
        return { ok: true, value: action === 'backup' ? value : state, context: state.context }
      } catch (error) {
        this.log(error)
        const known = asArchiveError(error)
        return {
          ok: false,
          error: {
            code: known.code,
            message: known.message,
            fields: known.fields,
            conflicts: known.conflicts,
          },
          context: ['NO_ARCHIVE', 'ARCHIVE_SESSION_CHANGED', 'VALIDATION_ERROR'].includes(
            known.code,
          )
            ? null
            : this.archives.context(),
        }
      }
    })
  }

  async shutdown(): Promise<void> {
    await this.archives.shutdown()
  }
  private state(): ArchiveState {
    return {
      active: this.archives.current(),
      recent: this.recent.list(),
      context: this.archives.context(),
    }
  }

  private async perform(
    files: ArchiveFileOperations,
    action: ArchiveAction,
    input: unknown,
    expected: ArchiveContextDto | null,
  ): Promise<unknown> {
    const window = this.window()
    if (action === 'state') return this.state()
    if (action === 'close') return files.close()
    if (action === 'rename') return files.rename(this.text(input), expected)
    if (action === 'openRecent') {
      const path = this.text(input)
      if (!this.recent.list().some((item) => item.path === path))
        throw new ArchiveError('INVALID_INPUT', 'Seleziona un archivio dall’elenco dei recenti.')
      return files.open(path)
    }
    if (!window || window.isDestroyed())
      throw new ArchiveError('UNEXPECTED', 'La finestra dell’applicazione non è disponibile.')

    if (action === 'open') {
      const result = await dialog.showOpenDialog(window, {
        title: 'Apri archivio',
        filters,
        properties: ['openFile'],
      })
      if (!result.canceled && result.filePaths[0]) await files.open(result.filePaths[0])
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
      if (!result.canceled && result.filePath) await files.create(result.filePath, name)
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
    this.archives.coordinator.assertContext(expected)
    if (backup) return { path: await files.backup(result.filePath) }
    return files.saveAs(result.filePath)
  }

  private text(input: unknown): string {
    if (typeof input !== 'string' || !input || input.length > 32_768)
      throw new ArchiveError('INVALID_INPUT', 'La richiesta non è valida.')
    return input
  }
}
