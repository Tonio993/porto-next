import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { ArchiveController } from '../../src/main/archive-controller'
import { DatabaseSession } from '../../src/backend/infrastructure/database/database-session'
import { registerArchiveIpc } from '../../src/main/ipc/register'
import { archiveChannels, type ArchiveState, type Result } from '../../src/shared/contracts/archive'
import type { ArchiveContextDto } from '../../src/shared/contracts/application'

vi.mock('electron', () => ({
  BrowserWindow: class {},
  dialog: { showSaveDialog: vi.fn(), showOpenDialog: vi.fn() },
  ipcMain: { handle: vi.fn() },
}))

let folder: string
let controller: ArchiveController
let state: ArchiveState
let owner: BrowserWindow
const request = (context = state.context) => ({ context, payload: null })
async function create(name: string) {
  vi.mocked(dialog.showSaveDialog).mockResolvedValue({
    canceled: false,
    filePath: join(folder, `${name}.ormeggi`),
  })
  expect((await controller.execute('create', name)).ok).toBe(true)
}

beforeEach(() => {
  vi.clearAllMocks()
  folder = mkdtempSync(join(tmpdir(), 'porto-controller-tests-'))
  state = { active: null, context: null, recent: [] }
  owner = { isDestroyed: () => false, webContents: { mainFrame: {} } } as unknown as BrowserWindow
  controller = new ArchiveController(
    folder,
    () => owner,
    (next) => {
      state = next
    },
    () => {},
  )
})
afterEach(async () => {
  vi.restoreAllMocks()
  await controller.shutdown()
  rmSync(folder, { recursive: true, force: true })
})

describe('controller archivi e menu', () => {
  it('non legge B per completare una richiesta contestuale di A', async () => {
    await create('A')
    const old = state.context
    await create('B')
    const metadata = vi.spyOn(DatabaseSession.prototype, 'metadata')
    expect(
      await controller.execute('rename', { context: old, payload: { name: 'Obsoleto' } }),
    ).toMatchObject({ ok: false, context: null, error: { code: 'ARCHIVE_SESSION_CHANGED' } })
    expect(metadata).not.toHaveBeenCalled()
  })
  it('cattura il bersaglio legacy prima dell’attesa e non rinomina la copia', async () => {
    await create('A')
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({
      canceled: false,
      filePath: join(folder, 'copia.ormeggi'),
    })
    const old = state.context
    const copy = controller.execute('saveAs')
    const rename = controller.execute('rename', 'Richiesta precedente')
    expect((await copy).ok).toBe(true)
    expect(await rename).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'ARCHIVE_SESSION_CHANGED' },
    })
    expect(state.context?.archiveId).toBe(old?.archiveId)
    expect(state.context?.sessionId).not.toBe(old?.sessionId)
    expect(state.active?.name).toBe('A')
  })

  it('la UI contestuale rifiuta un vecchio form e una vecchia revisione', async () => {
    await create('A')
    const old = state.context
    expect(
      (
        await controller.execute('rename', {
          context: state.context,
          payload: { name: 'Aggiornato' },
        })
      ).ok,
    ).toBe(true)
    expect(state.context?.revision).toBe('1')
    expect(
      await controller.execute('rename', { context: old, payload: { name: 'Obsoleto' } }),
    ).toMatchObject({
      ok: false,
      error: { code: 'REVISION_CONFLICT', fields: [], conflicts: [] },
      context: { revision: '1' },
    })
    await create('B')
    expect(await controller.execute('close', request(old))).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'ARCHIVE_SESSION_CHANGED' },
    })
    expect(state.active?.name).toBe('B')
  })

  it('un dialogo annullato non cambia contesto né revisione', async () => {
    await create('A')
    const old = state.context
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({ canceled: true, filePath: '' })
    expect((await controller.execute('saveAs', request())).ok).toBe(true)
    expect(state.context).toEqual(old)
  })

  it('valida la forma prima della sessione e rifiuta campi inattesi', async () => {
    const bad = { context: { sessionId: 'no' }, payload: null, extra: true }
    expect(await controller.execute('backup', bad)).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'VALIDATION_ERROR' },
    })
    expect(dialog.showSaveDialog).not.toHaveBeenCalled()
  })

  it('una richiesta valida senza archivio fallisce senza aprire un dialogo', async () => {
    const context: ArchiveContextDto = {
      archiveId: '00000000-0000-4000-8000-000000000001',
      sessionId: '00000000-0000-4000-8000-000000000002',
      revision: '0',
    }
    expect(await controller.execute('backup', request(context))).toMatchObject({
      ok: false,
      context: null,
      error: { code: 'NO_ARCHIVE' },
    })
    expect(dialog.showSaveDialog).not.toHaveBeenCalled()
  })
})

describe('confine IPC', () => {
  it('rifiuta altri mittenti e frame secondari prima del controller', async () => {
    registerArchiveIpc(controller, () => owner)
    const handler = vi
      .mocked(ipcMain.handle)
      .mock.calls.find(([channel]) => channel === archiveChannels.rename)![1]
    const execute = vi.spyOn(controller, 'execute')
    const foreign = {
      sender: {},
      senderFrame: owner.webContents.mainFrame,
    } as Electron.IpcMainInvokeEvent
    const child = { sender: owner.webContents, senderFrame: {} } as Electron.IpcMainInvokeEvent
    for (const event of [foreign, child]) {
      const result = (await handler(event, 'Non autorizzato')) as Result<unknown>
      expect(result).toMatchObject({ ok: false, context: null, error: { code: 'INVALID_INPUT' } })
    }
    expect(execute).not.toHaveBeenCalled()
    await handler(
      {
        sender: owner.webContents,
        senderFrame: owner.webContents.mainFrame,
      } as Electron.IpcMainInvokeEvent,
      'Nome',
    )
    expect(execute).toHaveBeenCalledOnce()
  })
})
