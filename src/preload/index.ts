import { writeOutcomeChannel, type WriteOutcomeApi } from '../shared/contracts/write-outcomes'
import { serviceChannels, type ServiceApi } from '../shared/contracts/services'
import { assignmentChannels, type AssignmentApi } from '../shared/contracts/assignments'
import { operationChannels, type OperationApi } from '../shared/contracts/operations'
import { tariffChannels, type TariffApi } from '../shared/contracts/tariffs'
import { catalogChannels, type CatalogApi } from '../shared/contracts/catalog'
import { vesselChannels, type VesselApi } from '../shared/contracts/vessels'
import { agencyChannels, type AgencyApi } from '../shared/contracts/agencies'
import { customerChannels, type CustomerApi } from '../shared/contracts/customers'
import { contextBridge, ipcRenderer } from 'electron'
import type { ArchiveApi, ArchiveState } from '../shared/contracts/archive'
import { archiveChannels } from '../shared/contracts/archive'
import { timeChannels, type TimeApi } from '../shared/contracts/values'
import { berthChannels, type BerthApi } from '../shared/contracts/berths'
import { portChannels, type PortApi } from '../shared/contracts/ports'

const api: ArchiveApi = {
  onActionRequested: (callback) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      action: import('../shared/contracts/archive').ArchiveMenuAction,
    ) => callback(action)
    ipcRenderer.on(archiveChannels.actionRequested, listener)
    return () => ipcRenderer.removeListener(archiveChannels.actionRequested, listener)
  },
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

const vessels: VesselApi = {
  versionAt: (request) => ipcRenderer.invoke(vesselChannels.versionAt, request),
  get: (request) => ipcRenderer.invoke(vesselChannels.get, request),
  create: (request) => ipcRenderer.invoke(vesselChannels.create, request),
  list: (request) => ipcRenderer.invoke(vesselChannels.list, request),
  history: (request) => ipcRenderer.invoke(vesselChannels.history, request),
  resolveVersionMoment: (request) =>
    ipcRenderer.invoke(vesselChannels.resolveVersionMoment, request),
  preview: (request) => ipcRenderer.invoke(vesselChannels.preview, request),
  confirm: (request) => ipcRenderer.invoke(vesselChannels.confirm, request),
  reactivate: (request) => ipcRenderer.invoke(vesselChannels.reactivate, request),
  previewEffects: (request) => ipcRenderer.invoke(vesselChannels.previewEffects, request),
}
contextBridge.exposeInMainWorld('vessels', vessels)

const catalog: CatalogApi = {
  weightHistory: (request) => ipcRenderer.invoke(catalogChannels.weightHistory, request),
  getWeight: (request) => ipcRenderer.invoke(catalogChannels.getWeight, request),
  resolveWeightMoment: (request) =>
    ipcRenderer.invoke(catalogChannels.resolveWeightMoment, request),
  previewWeight: (request) => ipcRenderer.invoke(catalogChannels.previewWeight, request),
  confirmWeight: (request) => ipcRenderer.invoke(catalogChannels.confirmWeight, request),
  weightEffects: (request) => ipcRenderer.invoke(catalogChannels.weightEffects, request),
  list: (request) => ipcRenderer.invoke(catalogChannels.list, request),
  get: (request) => ipcRenderer.invoke(catalogChannels.get, request),
  fixedWeights: (request) => ipcRenderer.invoke(catalogChannels.fixedWeights, request),
  create: (request) => ipcRenderer.invoke(catalogChannels.create, request),
  preview: (request) => ipcRenderer.invoke(catalogChannels.preview, request),
  confirm: (request) => ipcRenderer.invoke(catalogChannels.confirm, request),
  reactivate: (request) => ipcRenderer.invoke(catalogChannels.reactivate, request),
  previewEffects: (request) => ipcRenderer.invoke(catalogChannels.previewEffects, request),
}
contextBridge.exposeInMainWorld('catalog', catalog)

const tariffs: TariffApi = {
  previewUpdate: (request) => ipcRenderer.invoke(tariffChannels.previewUpdate, request),
  confirmUpdate: (request) => ipcRenderer.invoke(tariffChannels.confirmUpdate, request),
  previewDelete: (request) => ipcRenderer.invoke(tariffChannels.previewDelete, request),
  confirmDelete: (request) => ipcRenderer.invoke(tariffChannels.confirmDelete, request),
  updateEffects: (request) => ipcRenderer.invoke(tariffChannels.updateEffects, request),
  deletionEffects: (request) => ipcRenderer.invoke(tariffChannels.deletionEffects, request),
  list: (request) => ipcRenderer.invoke(tariffChannels.list, request),
  get: (request) => ipcRenderer.invoke(tariffChannels.get, request),
  copyConfigurations: (request) => ipcRenderer.invoke(tariffChannels.copyConfigurations, request),
  resolveMoment: (request) => ipcRenderer.invoke(tariffChannels.resolveMoment, request),
  previewCreate: (request) => ipcRenderer.invoke(tariffChannels.previewCreate, request),
  confirmCreate: (request) => ipcRenderer.invoke(tariffChannels.confirmCreate, request),
  previewEffects: (request) => ipcRenderer.invoke(tariffChannels.previewEffects, request),
  simulateBase: (request) => ipcRenderer.invoke(tariffChannels.simulateBase, request),
}
contextBridge.exposeInMainWorld('tariffs', tariffs)

const operations: OperationApi = {
  resolveCompletionMoment: (request) =>
    ipcRenderer.invoke(operationChannels.resolveCompletionMoment, request),
  resolveCorrectionMoment: (request) =>
    ipcRenderer.invoke(operationChannels.resolveCorrectionMoment, request),
  previewDelete: (request) => ipcRenderer.invoke(operationChannels.previewDelete, request),
  deletionEffects: (request) => ipcRenderer.invoke(operationChannels.deletionEffects, request),
  confirmDelete: (request) => ipcRenderer.invoke(operationChannels.confirmDelete, request),
  updateNotes: (request) => ipcRenderer.invoke(operationChannels.updateNotes, request),
  previewCorrect: (request) => ipcRenderer.invoke(operationChannels.previewCorrect, request),
  correctionEffects: (request) => ipcRenderer.invoke(operationChannels.correctionEffects, request),
  confirmCorrect: (request) => ipcRenderer.invoke(operationChannels.confirmCorrect, request),
  previewInsert: (request) => ipcRenderer.invoke(operationChannels.previewInsert, request),
  insertionEffects: (request) => ipcRenderer.invoke(operationChannels.insertionEffects, request),
  confirmInsert: (request) => ipcRenderer.invoke(operationChannels.confirmInsert, request),
  previewComplete: (request) => ipcRenderer.invoke(operationChannels.previewComplete, request),
  completionEffects: (request) => ipcRenderer.invoke(operationChannels.completionEffects, request),
  confirmComplete: (request) => ipcRenderer.invoke(operationChannels.confirmComplete, request),
  contextAt: (request) => ipcRenderer.invoke(operationChannels.contextAt, request),
  list: (request) => ipcRenderer.invoke(operationChannels.list, request),
  get: (request) => ipcRenderer.invoke(operationChannels.get, request),
  stays: (request) => ipcRenderer.invoke(operationChannels.stays, request),
  resolveMoment: (request) => ipcRenderer.invoke(operationChannels.resolveMoment, request),
  previewCreate: (request) => ipcRenderer.invoke(operationChannels.previewCreate, request),
  confirmCreate: (request) => ipcRenderer.invoke(operationChannels.confirmCreate, request),
  previewEffects: (request) => ipcRenderer.invoke(operationChannels.previewEffects, request),
}
contextBridge.exposeInMainWorld('operations', operations)

const assignments: AssignmentApi = {
  get: (request) => ipcRenderer.invoke(assignmentChannels.get, request),
  preview: (request) => ipcRenderer.invoke(assignmentChannels.preview, request),
  previewEffects: (request) => ipcRenderer.invoke(assignmentChannels.previewEffects, request),
  confirm: (request) => ipcRenderer.invoke(assignmentChannels.confirm, request),
}
contextBridge.exposeInMainWorld('assignments', assignments)

const services: ServiceApi = {
  preview: (request) => ipcRenderer.invoke(serviceChannels.preview, request),
  confirm: (request) => ipcRenderer.invoke(serviceChannels.confirm, request),
  updateNotes: (request) => ipcRenderer.invoke(serviceChannels.updateNotes, request),
  resolveMoment: (request) => ipcRenderer.invoke(serviceChannels.resolveMoment, request),
  createFree: (request) => ipcRenderer.invoke(serviceChannels.createFree, request),
  createCatalog: (request) => ipcRenderer.invoke(serviceChannels.createCatalog, request),
  list: (request) => ipcRenderer.invoke(serviceChannels.list, request),
  get: (request) => ipcRenderer.invoke(serviceChannels.get, request),
}
contextBridge.exposeInMainWorld('services', services)

const writeOutcomes: WriteOutcomeApi = {
  get: (request) => ipcRenderer.invoke(writeOutcomeChannel, request),
}
contextBridge.exposeInMainWorld('writeOutcomes', writeOutcomes)
