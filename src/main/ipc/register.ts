import type { VesselService } from '../../backend/application/vessels/vessel-service'
import { vesselChannels, type VesselApi } from '../../shared/contracts/vessels'
import { agencyChannels, type AgencyApi } from '../../shared/contracts/agencies'
import type { AgencyService } from '../../backend/application/agencies/agency-service'
import { customerChannels, type CustomerApi } from '../../shared/contracts/customers'
import type { CustomerService } from '../../backend/application/customers/customer-service'
import { BrowserWindow, ipcMain } from 'electron'
import { archiveChannels } from '../../shared/contracts/archive'
import { ArchiveController, type ArchiveAction } from '../archive-controller'
import type { TimeService } from '../../backend/application/time/time-service'
import type { TimeApi } from '../../shared/contracts/values'
import { timeChannels } from '../../shared/contracts/values'
import { portChannels, type PortApi } from '../../shared/contracts/ports'
import { berthChannels, type BerthApi } from '../../shared/contracts/berths'
import type { BerthService } from '../../backend/application/berths/berth-service'
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
    registerGuardedIpc(archiveChannels[action], window, (input) =>
      controller.execute(action, input),
    )
  }
}

function registerGuardedIpc(
  channel: string,
  window: () => BrowserWindow | null,
  execute: (input: unknown) => unknown,
): void {
  ipcMain.handle(channel, (event, input: unknown) => {
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
    return execute(input)
  })
}

export function registerTimeIpc(service: TimeService, window: () => BrowserWindow | null): void {
  for (const action of Object.keys(timeChannels) as (keyof TimeApi)[]) {
    registerGuardedIpc(timeChannels[action], window, (input) => service[action](input as never))
  }
}

export function registerPortIpc(service: PortService, window: () => BrowserWindow | null): void {
  for (const action of Object.keys(portChannels) as (keyof PortApi)[]) {
    registerGuardedIpc(portChannels[action], window, (input) => service[action](input as never))
  }
}

export function registerBerthIpc(service: BerthService, window: () => BrowserWindow | null): void {
  for (const action of Object.keys(berthChannels) as (keyof BerthApi)[]) {
    registerGuardedIpc(berthChannels[action], window, (input) => service[action](input as never))
  }
}

export function registerCustomerIpc(
  service: CustomerService,
  window: () => BrowserWindow | null,
): void {
  for (const action of Object.keys(customerChannels) as (keyof CustomerApi)[]) {
    registerGuardedIpc(customerChannels[action], window, (input) => service[action](input as never))
  }
}

export function registerAgencyIpc(
  service: AgencyService,
  window: () => BrowserWindow | null,
): void {
  for (const action of Object.keys(agencyChannels) as (keyof AgencyApi)[]) {
    registerGuardedIpc(agencyChannels[action], window, (input) => service[action](input as never))
  }
}

export function registerVesselIpc(
  service: VesselService,
  window: () => BrowserWindow | null,
): void {
  for (const action of Object.keys(vesselChannels) as (keyof VesselApi)[]) {
    registerGuardedIpc(vesselChannels[action], window, (input) => service[action](input as never))
  }
}
