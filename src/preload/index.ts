import { contextBridge, ipcRenderer } from 'electron'
import type { ArchiveApi, ArchiveState } from '../shared/contracts/archive'
import { archiveChannels } from '../shared/contracts/archive'

const api: ArchiveApi = {
  getState: () => ipcRenderer.invoke(archiveChannels.state),
  create: (name) => ipcRenderer.invoke(archiveChannels.create, name),
  open: () => ipcRenderer.invoke(archiveChannels.open),
  openRecent: (path) => ipcRenderer.invoke(archiveChannels.openRecent, path),
  saveAs: (request) => ipcRenderer.invoke(archiveChannels.saveAs, request),
  backup: (request) => ipcRenderer.invoke(archiveChannels.backup, request),
  close: (request) => ipcRenderer.invoke(archiveChannels.close, request),
  rename: (input) => ipcRenderer.invoke(archiveChannels.rename, input),
  onChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, state: ArchiveState) => callback(state)
    ipcRenderer.on(archiveChannels.changed, listener)
    return () => {
      ipcRenderer.removeListener(archiveChannels.changed, listener)
    }
  },
}
contextBridge.exposeInMainWorld('archives', api)
