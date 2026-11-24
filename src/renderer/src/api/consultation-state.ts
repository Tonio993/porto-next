import type { ServiceListQuery } from '../../../shared/contracts/services'

const list = { search: '', page: 1, selection: null as string | null }
const picker = { search: '', page: 1 }

// Only consultation intent belongs here. DTOs, drafts and write outcomes stay with their owners.
export const consultationDefaults = {
  navigation: { master: 'Porti', catalog: 'CATALOG' },
  ports: { ...list },
  customers: { ...list },
  agencies: { ...list },
  vessels: { ...list },
  berths: { page: 1, selection: null as string | null },
  portHistory: { page: 1 },
  customerHistory: { page: 1 },
  agencyHistory: { page: 1 },
  vesselHistory: { page: 1 },
  berthHistory: { page: 1 },
  catalog: { ...list, status: 'ALL' },
  weights: { page: 1 },
  operationOwner: { vesselId: null as string | null },
  operations: {
    page: 1,
    stayPage: 1,
    selection: null as string | null,
    view: 'operations',
    instant: '',
  },
  serviceOwner: { vesselId: null as string | null },
  services: {
    page: 1,
    selection: null as { id: string } | null,
    filters: {} as Omit<ServiceListQuery, 'vesselId' | 'page' | 'pageSize'>,
    expanded: false,
    voyagePage: 1,
  },
  tariffOwner: { portId: null as string | null },
  tariffs: { page: 1, selection: null as string | null },
  operationVessels: { ...picker },
  serviceVessels: { ...picker },
  tariffPorts: { ...picker },
  servicePorts: { ...picker },
  serviceBerths: { ...picker },
  serviceCustomers: { ...picker },
  serviceAgencies: { ...picker },
  serviceTypes: { ...picker },
}
export type ConsultationState = typeof consultationDefaults
export type ConsultationSection = keyof ConsultationState

export class ConsultationStore {
  private readonly values = new Map<string, unknown>()
  private readonly listeners = new Set<() => void>()

  private key(section: ConsultationSection, owner: string | null, field: string) {
    return JSON.stringify([section, owner, field])
  }

  read<S extends ConsultationSection, F extends keyof ConsultationState[S]>(
    section: S,
    owner: string | null,
    field: F,
  ): ConsultationState[S][F] {
    const key = this.key(section, owner, String(field))
    return (
      this.values.has(key) ? this.values.get(key) : consultationDefaults[section][field]
    ) as ConsultationState[S][F]
  }

  write<S extends ConsultationSection, F extends keyof ConsultationState[S]>(
    section: S,
    owner: string | null,
    field: F,
    value: ConsultationState[S][F],
  ) {
    if (Object.is(this.read(section, owner, field), value)) return
    this.values.set(this.key(section, owner, String(field)), value)
    this.listeners.forEach((listener) => listener())
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
