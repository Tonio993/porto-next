import { NumericPreferenceService } from '../backend/application/preferences/numeric-preference'
import { NumericPreferenceStore } from '../backend/infrastructure/preferences/numeric-preference-store'
import { registerNumericPreferenceIpc } from './ipc/register'
import { ServiceService } from '../backend/application/services/service-service'
import { registerServiceIpc } from './ipc/register'
import { AssignmentService } from '../backend/application/operations/assignment-service'
import { registerAssignmentIpc } from './ipc/register'
import { OperationService } from '../backend/application/operations/operation-service'
import { registerOperationIpc } from './ipc/register'
import { TariffService } from '../backend/application/tariffs/tariff-service'
import { registerTariffIpc } from './ipc/register'
import { CatalogService } from '../backend/application/catalog/catalog-service'
import { registerCatalogIpc } from './ipc/register'
import { VesselService } from '../backend/application/vessels/vessel-service'
import { registerVesselIpc } from './ipc/register'
import { AgencyService } from '../backend/application/agencies/agency-service'
import { registerAgencyIpc } from './ipc/register'
import { CustomerService } from '../backend/application/customers/customer-service'
import { registerCustomerIpc } from './ipc/register'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, Menu } from 'electron'
import type { ArchiveState } from '../shared/contracts/archive'
import { archiveChannels } from '../shared/contracts/archive'
import { ArchiveController } from './archive-controller'
import {
  registerArchiveIpc,
  registerTimeIpc,
  registerPortIpc,
  registerBerthIpc,
} from './ipc/register'
import { BerthService } from '../backend/application/berths/berth-service'
import { PortService } from '../backend/application/ports/port-service'
import { ArchiveService } from '../backend/application/archives/archive-service'
import { ArchiveCoordinator } from '../backend/application/archives/archive-coordinator'
import { TimeService } from '../backend/application/time/time-service'

app.setName('Porto Next')
if (process.env.PORTO_TEST_USER_DATA) app.setPath('userData', process.env.PORTO_TEST_USER_DATA)

const ownsInstance = app.requestSingleInstanceLock()
if (!ownsInstance) app.quit()

let window: BrowserWindow | null = null
let controller: ArchiveController | null = null
let mayQuit = false

function log(error: unknown): void {
  console.error(error)
  try {
    const folder = join(app.getPath('userData'), 'logs')
    mkdirSync(folder, { recursive: true })
    appendFileSync(
      join(folder, 'application.log'),
      `${new Date().toISOString()} ${String(error)}\n`,
    )
  } catch {
    /* Un errore di log non deve bloccare la chiusura dell’archivio. */
  }
}

function publish(state: ArchiveState): void {
  if (!window || window.isDestroyed()) return
  window.setTitle(state.active ? `${state.active.name} — Porto Next` : 'Porto Next')
  window.webContents.send(archiveChannels.changed, state)
}

function createWindow(): void {
  window = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 960,
    minHeight: 700,
    show: false,
    backgroundColor: '#f5f7f9',
    title: 'Porto Next',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: process.env.PORTO_TEST_HIDDEN !== '1',
    },
  })
  window.once('ready-to-show', () => {
    if (process.env.PORTO_TEST_HIDDEN !== '1') window?.show()
  })
  window.on('closed', () => {
    window = null
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  )
  window.webContents.session.setPermissionCheckHandler(() => false)
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL)
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
}

function menuAction(action: import('../shared/contracts/archive').ArchiveMenuAction): void {
  window?.webContents.send(archiveChannels.actionRequested, action)
}

if (ownsInstance) {
  app.on('second-instance', () => {
    if (window?.isMinimized()) window.restore()
    window?.show()
    window?.focus()
  })
  void app
    .whenReady()
    .then(() => {
      const archives = new ArchiveService(new ArchiveCoordinator(log))
      controller = new ArchiveController(
        app.getPath('userData'),
        () => window,
        publish,
        log,
        archives,
      )
      registerArchiveIpc(controller, () => window)
      registerNumericPreferenceIpc(
        new NumericPreferenceService(
          new NumericPreferenceStore(join(app.getPath('userData'), 'numeric-preference.json')),
          log,
        ),
        () => window,
      )
      registerTimeIpc(new TimeService(archives.coordinator), () => window)
      registerPortIpc(new PortService(archives.coordinator), () => window)
      registerBerthIpc(new BerthService(archives.coordinator), () => window)
      registerCustomerIpc(new CustomerService(archives.coordinator), () => window)
      registerAgencyIpc(new AgencyService(archives.coordinator), () => window)
      registerVesselIpc(new VesselService(archives.coordinator), () => window)
      registerCatalogIpc(new CatalogService(archives.coordinator), () => window)
      registerServiceIpc(new ServiceService(archives.coordinator), () => window)
      registerAssignmentIpc(new AssignmentService(archives.coordinator), () => window)
      registerOperationIpc(new OperationService(archives.coordinator), () => window)
      registerTariffIpc(new TariffService(archives.coordinator), () => window)
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: 'File',
            submenu: [
              {
                label: 'Apri archivio…',
                accelerator: 'CmdOrCtrl+O',
                click: () => {
                  void menuAction('open')
                },
              },
              {
                label: 'Salva con nome…',
                accelerator: 'CmdOrCtrl+Shift+S',
                click: () => {
                  void menuAction('saveAs')
                },
              },
              {
                label: 'Crea copia di backup…',
                click: () => {
                  void menuAction('backup')
                },
              },
              {
                label: 'Chiudi archivio',
                click: () => {
                  void menuAction('close')
                },
              },
              { type: 'separator' },
              { label: 'Esci', role: 'quit' },
            ],
          },
          {
            label: 'Modifica',
            submenu: [
              { label: 'Annulla', role: 'undo' },
              { label: 'Ripeti', role: 'redo' },
              { type: 'separator' },
              { label: 'Taglia', role: 'cut' },
              { label: 'Copia', role: 'copy' },
              { label: 'Incolla', role: 'paste' },
              { label: 'Seleziona tutto', role: 'selectAll' },
            ],
          },
          {
            label: 'Visualizza',
            submenu: [
              { label: 'Zoom avanti', role: 'zoomIn' },
              { label: 'Zoom indietro', role: 'zoomOut' },
              { label: 'Zoom predefinito', role: 'resetZoom' },
              ...(!app.isPackaged
                ? [{ label: 'Strumenti di sviluppo', role: 'toggleDevTools' as const }]
                : []),
            ],
          },
        ]),
      )
      createWindow()
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
    })
    .catch((error) => {
      log(error)
      app.quit()
    })
}

app.on('before-quit', (event) => {
  if (mayQuit || !controller) return
  event.preventDefault()
  void controller
    .shutdown()
    .catch(log)
    .finally(() => {
      mayQuit = true
      app.quit()
    })
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
