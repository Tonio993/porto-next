import { BrowserWindow, ipcMain } from 'electron'
import { archiveChannels } from '../../shared/contracts/archive'
import { ArchiveController, type ArchiveAction } from '../archive-controller'
import type { TimeService } from '../../backend/application/time/time-service'
import type { TimeApi } from '../../shared/contracts/values'
import { timeChannels } from '../../shared/contracts/values'
import { portChannels, type PortApi } from '../../shared/contracts/ports'
import type { PortService } from '../../backend/application/ports/port-service'

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
          error: {
            code: 'INVALID_INPUT',
            message: 'Richiesta non autorizzata.',
            fields: [],
            conflicts: [],
          },
          context: null,
        }
      return controller.execute(action, input)
    })
  }
}

export function registerTimeIpc(service: TimeService, window: () => BrowserWindow | null): void {
  for (const action of Object.keys(timeChannels) as (keyof TimeApi)[]) {
    ipcMain.handle(timeChannels[action], (event, input: unknown) => {
      const owner = window()
      if (
        !owner ||
        event.sender !== owner.webContents ||
        event.senderFrame !== owner.webContents.mainFrame
      )
        return {
          ok: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Richiesta non autorizzata.',
            fields: [],
            conflicts: [],
          },
          context: null,
        }
      // The coordinator and each use case validate the unknown input at runtime.
      return service[action](input as never)
    })
  }
}

export function registerPortIpc(service: PortService, window: () => BrowserWindow | null): void {
  for (const action of Object.keys(portChannels) as (keyof PortApi)[]) {
    ipcMain.handle(portChannels[action], (event, input: unknown) => {
      const owner = window()
      if (
        !owner ||
        event.sender !== owner.webContents ||
        event.senderFrame !== owner.webContents.mainFrame
      )
        return {
          ok: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Richiesta non autorizzata.',
            fields: [],
            conflicts: [],
          },
          context: null,
        }
      return service[action](input as never)
    })
  }
}
