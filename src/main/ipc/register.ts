import { BrowserWindow, ipcMain } from 'electron'
import { archiveChannels } from '../../shared/contracts/archive'
import { ArchiveController, type ArchiveAction } from '../archive-controller'

export function registerArchiveIpc(
  controller: ArchiveController,
  window: () => BrowserWindow | null,
): void {
  const actions: ArchiveAction[] = [
    'state',
    'create',
    'open',
    'openRecent',
    'saveAs',
    'backup',
    'close',
    'rename',
  ]
  for (const action of actions) {
    ipcMain.handle(archiveChannels[action], (event, input: unknown) => {
      const owner = window()
      if (
        !owner ||
        event.sender !== owner.webContents ||
        event.senderFrame !== owner.webContents.mainFrame
      )
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Richiesta non autorizzata.' },
        }
      return controller.execute(action, input)
    })
  }
}
