import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ipcMain, type BrowserWindow } from 'electron'
import { NumericPreferenceService } from '../../src/backend/application/preferences/numeric-preference'
import { NumericPreferenceStore } from '../../src/backend/infrastructure/preferences/numeric-preference-store'
import {
  englishNumericFormat as en,
  italianNumericFormat as itFormat,
  numericPreferenceChannels,
} from '../../src/shared/contracts/numeric-preference'
import { registerNumericPreferenceIpc } from '../../src/main/ipc/register'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() }, BrowserWindow: class {} }))
let folder: string, path: string
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'porto-pr04-'))
  path = join(folder, 'numeric-preference.json')
  vi.clearAllMocks()
})
afterEach(() => rmSync(folder, { recursive: true, force: true }))
it('file assente: default italiano senza creare un file o simulare una persistenza', () => {
  expect(new NumericPreferenceService(new NumericPreferenceStore(path)).get()).toEqual({
    ok: true,
    value: itFormat,
    source: 'default',
    warning: null,
  })
  expect(() => readFileSync(path)).toThrow()
})
it.each([itFormat, en, { ...en, grouping: false }])(
  'salva e rilegge la preferenza specifica %j',
  (format) => {
    const service = new NumericPreferenceService(new NumericPreferenceStore(path))
    expect(service.set(format)).toMatchObject({ ok: true, source: 'saved', value: format })
    expect(new NumericPreferenceService(new NumericPreferenceStore(path)).get()).toMatchObject({
      ok: true,
      source: 'saved',
      value: format,
      warning: null,
    })
  },
)
it.each(['{', 'null', '[]', '{"decimalSeparator":";","groupSeparator":".","grouping":true}'])(
  'file corrotto/non supportato %s: fallback visibile senza sovrascrivere',
  (contents) => {
    writeFileSync(path, contents)
    const result = new NumericPreferenceService(new NumericPreferenceStore(path)).get()
    expect(result).toMatchObject({
      ok: true,
      value: itFormat,
      source: 'default',
      warning: expect.any(String),
    })
    expect(readFileSync(path, 'utf8')).toBe(contents)
  },
)
it.each([
  null,
  [],
  {},
  { ...en, decimalSeparator: ',' },
  { ...en, grouping: 'true' },
  { ...en, path: 'other.json' },
  { ...en, groupSeparator: ' ' },
])('rifiuta configurazioni non supportate %j prima dello storage', (invalid) => {
  const storage = { read: vi.fn(), write: vi.fn() }
  const service = new NumericPreferenceService(storage)
  expect(service.set(invalid)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
  expect(storage.write).not.toHaveBeenCalled()
  expect(service.get(invalid)).toMatchObject({ ok: false })
  expect(storage.read).not.toHaveBeenCalled()
})
it('errore di scrittura/rename: fallimento esplicito e preferenza precedente ancora leggibile', () => {
  const service = new NumericPreferenceService(new NumericPreferenceStore(path))
  service.set(itFormat)
  mkdirSync(`${path}.tmp`)
  expect(service.set(en)).toMatchObject({ ok: false, error: { code: 'PREFERENCE_WRITE_FAILED' } })
  expect(service.get()).toMatchObject({ value: itFormat })
  // A directory in place of the temporary file causes a real portable write failure.
  const blocked = join(folder, 'parent-file')
  writeFileSync(blocked, 'blocked')
  const broken = new NumericPreferenceService(
    new NumericPreferenceStore(join(blocked, 'value.json')),
  )
  expect(broken.set(en)).toMatchObject({ ok: false, error: { code: 'PREFERENCE_WRITE_FAILED' } })
  const failure = new NumericPreferenceService({
    read: () => (service.get().ok ? itFormat : null),
    write: () => {
      throw Error('rename denied')
    },
  })
  expect(failure.set(en)).toMatchObject({ ok: false })
  expect(service.get()).toMatchObject({ value: itFormat })
})
it('IPC controlla mittente e main frame, payload e campi inattesi senza API filesystem', async () => {
  const store = { read: vi.fn(() => en), write: vi.fn() }
  const service = new NumericPreferenceService(store)
  const owner = { webContents: { mainFrame: {} } } as unknown as BrowserWindow
  let available = true
  registerNumericPreferenceIpc(service, () => (available ? owner : null))
  const handlers = new Map(vi.mocked(ipcMain.handle).mock.calls)
  const get = handlers.get(numericPreferenceChannels.get)!,
    set = handlers.get(numericPreferenceChannels.set)!
  const event = {
    sender: owner.webContents,
    senderFrame: owner.webContents.mainFrame,
  } as Electron.IpcMainInvokeEvent
  for (const bad of [
    { ...event, sender: {} },
    { ...event, senderFrame: {} },
  ])
    expect(await set(bad as never, en)).toMatchObject({ ok: false })
  available = false
  expect(await get(event)).toMatchObject({ ok: false })
  expect(store.read).not.toHaveBeenCalled()
  expect(store.write).not.toHaveBeenCalled()
  available = true
  expect(await get(event, { context: {} })).toMatchObject({ ok: false })
  expect(await set(event, { ...en, extra: true })).toMatchObject({ ok: false })
  expect(await get(event)).toMatchObject({ ok: true, value: en })
  expect(await set(event, itFormat)).toMatchObject({ ok: true, value: itFormat })
  expect(store.write).toHaveBeenCalledExactlyOnceWith(itFormat)
})
