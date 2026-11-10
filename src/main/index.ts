import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, Menu } from 'electron'
import type { ArchiveState } from '../shared/contracts/archive'
import { archiveChannels } from '../shared/contracts/archive'
import { ArchiveController, type ArchiveAction } from './archive-controller'
import { registerArchiveIpc } from './ipc/register'

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

async function menuAction(action: ArchiveAction): Promise<void> {
  const result = await controller?.execute(action)
  if (result && !result.ok && window)
    await dialog.showMessageBox(window, {
      type: 'error',
      title: 'Archivio',
      message: result.error.message,
    })
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
      controller = new ArchiveController(app.getPath('userData'), () => window, publish, log)
      registerArchiveIpc(controller, () => window)
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
