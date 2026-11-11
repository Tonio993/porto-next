import { agencyChannels, type AgencyApi } from '../shared/contracts/agencies'
import { customerChannels, type CustomerApi } from '../shared/contracts/customers'
import { contextBridge, ipcRenderer } from 'electron'
import type { ArchiveApi, ArchiveState } from '../shared/contracts/archive'
import { archiveChannels } from '../shared/contracts/archive'
import { timeChannels, type TimeApi } from '../shared/contracts/values'
import { berthChannels, type BerthApi } from '../shared/contracts/berths'
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
  history: (request) => ipcRenderer.invoke(portChannels.history, request),
  resolveVersionMoment: (request) => ipcRenderer.invoke(portChannels.resolveVersionMoment, request),
  previewInsertVersion: (request) => ipcRenderer.invoke(portChannels.previewInsertVersion, request),
  previewUpdateVersion: (request) => ipcRenderer.invoke(portChannels.previewUpdateVersion, request),
  previewDeleteVersion: (request) => ipcRenderer.invoke(portChannels.previewDeleteVersion, request),
  previewDeactivate: (request) => ipcRenderer.invoke(portChannels.previewDeactivate, request),
  previewDelete: (request) => ipcRenderer.invoke(portChannels.previewDelete, request),
  confirmInsertVersion: (request) => ipcRenderer.invoke(portChannels.confirmInsertVersion, request),
  confirmUpdateVersion: (request) => ipcRenderer.invoke(portChannels.confirmUpdateVersion, request),
  confirmDeleteVersion: (request) => ipcRenderer.invoke(portChannels.confirmDeleteVersion, request),
  confirmDeactivate: (request) => ipcRenderer.invoke(portChannels.confirmDeactivate, request),
  confirmDelete: (request) => ipcRenderer.invoke(portChannels.confirmDelete, request),
  reactivate: (request) => ipcRenderer.invoke(portChannels.reactivate, request),
  previewEffects: (request) => ipcRenderer.invoke(portChannels.previewEffects, request),
  create: (request) => ipcRenderer.invoke(portChannels.create, request),
  list: (request) => ipcRenderer.invoke(portChannels.list, request),
  get: (request) => ipcRenderer.invoke(portChannels.get, request),
}
contextBridge.exposeInMainWorld('ports', ports)

const berths: BerthApi = {
  create: (request) => ipcRenderer.invoke(berthChannels.create, request),
  list: (request) => ipcRenderer.invoke(berthChannels.list, request),
  history: (request) => ipcRenderer.invoke(berthChannels.history, request),
  resolveVersionMoment: (request) =>
    ipcRenderer.invoke(berthChannels.resolveVersionMoment, request),
  preview: (request) => ipcRenderer.invoke(berthChannels.preview, request),
  confirm: (request) => ipcRenderer.invoke(berthChannels.confirm, request),
  reactivate: (request) => ipcRenderer.invoke(berthChannels.reactivate, request),
  previewEffects: (request) => ipcRenderer.invoke(berthChannels.previewEffects, request),
}
contextBridge.exposeInMainWorld('berths', berths)

const customers: CustomerApi = {
  get: (request) => ipcRenderer.invoke(customerChannels.get, request),
  create: (request) => ipcRenderer.invoke(customerChannels.create, request),
  list: (request) => ipcRenderer.invoke(customerChannels.list, request),
  history: (request) => ipcRenderer.invoke(customerChannels.history, request),
  resolveVersionMoment: (request) =>
    ipcRenderer.invoke(customerChannels.resolveVersionMoment, request),
  preview: (request) => ipcRenderer.invoke(customerChannels.preview, request),
  confirm: (request) => ipcRenderer.invoke(customerChannels.confirm, request),
  reactivate: (request) => ipcRenderer.invoke(customerChannels.reactivate, request),
  previewEffects: (request) => ipcRenderer.invoke(customerChannels.previewEffects, request),
}
contextBridge.exposeInMainWorld('customers', customers)

const agencies: AgencyApi = {
  get: (request) => ipcRenderer.invoke(agencyChannels.get, request),
  create: (request) => ipcRenderer.invoke(agencyChannels.create, request),
  list: (request) => ipcRenderer.invoke(agencyChannels.list, request),
  history: (request) => ipcRenderer.invoke(agencyChannels.history, request),
  resolveVersionMoment: (request) =>
    ipcRenderer.invoke(agencyChannels.resolveVersionMoment, request),
  preview: (request) => ipcRenderer.invoke(agencyChannels.preview, request),
  confirm: (request) => ipcRenderer.invoke(agencyChannels.confirm, request),
  reactivate: (request) => ipcRenderer.invoke(agencyChannels.reactivate, request),
  previewEffects: (request) => ipcRenderer.invoke(agencyChannels.previewEffects, request),
}
contextBridge.exposeInMainWorld('agencies', agencies)
