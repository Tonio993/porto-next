import { contextBridge, ipcRenderer } from 'electron'
import type { ArchiveApi, ArchiveState } from '../shared/contracts/archive'
import { archiveChannels } from '../shared/contracts/archive'
import { timeChannels, type TimeApi } from '../shared/contracts/values'
import { portChannels, type PortApi } from '../shared/contracts/ports'

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

const time: TimeApi = {
  getCompanyZone: (request) => ipcRenderer.invoke(timeChannels.getCompanyZone, request),
  configureCompanyZone: (request) => ipcRenderer.invoke(timeChannels.configureCompanyZone, request),
  resolveCompanyMoment: (request) => ipcRenderer.invoke(timeChannels.resolveCompanyMoment, request),
}
contextBridge.exposeInMainWorld('time', time)

const ports: PortApi = {
  create: (request) => ipcRenderer.invoke(portChannels.create, request),
  list: (request) => ipcRenderer.invoke(portChannels.list, request),
  get: (request) => ipcRenderer.invoke(portChannels.get, request),
}
contextBridge.exposeInMainWorld('ports', ports)
