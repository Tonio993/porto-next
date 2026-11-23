import { WriteOutcomeStore } from './write-outcome-store'
import { writeOutcomeChannel, type WriteOutcomeApi } from '../../shared/contracts/write-outcomes'
import type { ApplicationResult } from '../../shared/contracts/application'
import { asArchiveError } from '../../shared/errors/archive-error'
import { ServiceService } from '../../backend/application/services/service-service'
import { serviceChannels, type ServiceApi } from '../../shared/contracts/services'
import { AssignmentService } from '../../backend/application/operations/assignment-service'
import { assignmentChannels, type AssignmentApi } from '../../shared/contracts/assignments'
import { OperationService } from '../../backend/application/operations/operation-service'
import { operationChannels, type OperationApi } from '../../shared/contracts/operations'
import { TariffService } from '../../backend/application/tariffs/tariff-service'
import { tariffChannels, type TariffApi } from '../../shared/contracts/tariffs'
import type { CatalogService } from '../../backend/application/catalog/catalog-service'
import { catalogChannels, type CatalogApi } from '../../shared/contracts/catalog'
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

const writeOutcomes = new WriteOutcomeStore()

export function registerArchiveIpc(
  controller: ArchiveController,
  window: () => BrowserWindow | null,
): void {
  registerGuardedIpc(writeOutcomeChannel, window, (input) =>
    controller.readWriteOutcome(input as Parameters<WriteOutcomeApi['get']>[0], (context) =>
      writeOutcomes.get(input, context),
    ),
  )
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
    if (
      input &&
      typeof input === 'object' &&
      'attemptId' in input &&
      /:(create|create-free|create-catalog|confirm(?:-[a-z]+)?|reactivate|update-notes|configure-company-zone)$/.test(
        channel,
      )
    ) {
      return writeOutcomes
        .execute(input, (value) => Promise.resolve(execute(value) as ApplicationResult<unknown>))
        .catch((error) => {
          const known = asArchiveError(error)
          return {
            ok: false,
            error: {
              code: known.code,
              message: known.message,
              fields: known.fields,
              conflicts: known.conflicts,
            },
            context: null,
          }
        })
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

export function registerCatalogIpc(
  service: CatalogService,
  window: () => BrowserWindow | null,
): void {
  for (const action of Object.keys(catalogChannels) as (keyof CatalogApi)[]) {
    registerGuardedIpc(catalogChannels[action], window, (input) => service[action](input as never))
  }
}

export function registerTariffIpc(
  service: TariffService,
  window: () => BrowserWindow | null,
): void {
  for (const action of Object.keys(tariffChannels) as (keyof TariffApi)[]) {
    registerGuardedIpc(tariffChannels[action], window, (input) => service[action](input as never))
  }
}

export function registerOperationIpc(
  service: OperationService,
  window: () => BrowserWindow | null,
): void {
  for (const action of Object.keys(operationChannels) as (keyof OperationApi)[]) {
    registerGuardedIpc(operationChannels[action], window, (input) =>
      service[action](input as never),
    )
  }
}

export function registerAssignmentIpc(
  service: AssignmentService,
  window: () => BrowserWindow | null,
): void {
  for (const action of Object.keys(assignmentChannels) as (keyof AssignmentApi)[])
    registerGuardedIpc(assignmentChannels[action], window, (input) =>
      service[action](input as never),
    )
}

export function registerServiceIpc(
  service: ServiceService,
  window: () => BrowserWindow | null,
): void {
  for (const action of Object.keys(serviceChannels) as (keyof ServiceApi)[])
    registerGuardedIpc(serviceChannels[action], window, (input) => service[action](input as never))
}
