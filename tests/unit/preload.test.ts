import { expect, it, vi } from 'vitest'
import {
  trackedRequest,
  writeOutcomeChannel,
  type WriteOutcomeApi,
} from '../../src/shared/contracts/write-outcomes'
import {
  archiveChannels,
  type ArchiveApi,
  type ArchiveMenuAction,
} from '../../src/shared/contracts/archive'
import type { AgencyApi } from '../../src/shared/contracts/agencies'
import { ipcRenderer } from 'electron'

const exposed = vi.hoisted(() => new Map<string, unknown>())
vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: (name: string, api: unknown) => exposed.set(name, api) },
  ipcRenderer: { invoke: vi.fn(async () => ({ ok: true })), on: vi.fn(), removeListener: vi.fn() },
}))
import '../../src/preload/index'

it('preload espone soltanto la lettura specifica della ricevuta, senza IPC generico', async () => {
  const api = exposed.get('writeOutcomes') as WriteOutcomeApi
  const request = { context: { sessionId: 'session' }, query: { attemptId: 'attempt' } }
  expect(Object.keys(api)).toEqual(['get'])
  await api.get(request)
  expect(ipcRenderer.invoke).toHaveBeenLastCalledWith(writeOutcomeChannel, request)
})
it('preload conserva i metadati del tentativo sulla singola API di dominio', async () => {
  const api = exposed.get('agencies') as AgencyApi
  const request = trackedRequest(
    {
      context: { archiveId: 'a', sessionId: 's', revision: '9' },
      payload: { businessName: 'Agenzia' },
    },
    'tentativo',
  )
  await api.create(request)
  expect(ipcRenderer.invoke).toHaveBeenLastCalledWith('agencies:create', request)
})
it('menu File inoltra l’azione alla guardia renderer e consente la rimozione del listener', () => {
  const api = exposed.get('archives') as ArchiveApi,
    callback = vi.fn()
  const remove = api.onActionRequested(callback)
  const registration = vi
    .mocked(ipcRenderer.on)
    .mock.calls.find(([channel]) => channel === archiveChannels.actionRequested)!
  const listener = registration[1] as (_: unknown, action: ArchiveMenuAction) => void
  for (const action of ['open', 'saveAs', 'backup', 'close'] as const) listener({}, action)
  expect(callback.mock.calls.map(([action]) => action)).toEqual([
    'open',
    'saveAs',
    'backup',
    'close',
  ])
  remove()
  expect(ipcRenderer.removeListener).toHaveBeenLastCalledWith(
    archiveChannels.actionRequested,
    listener,
  )
})
