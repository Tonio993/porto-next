import type { ApplicationResult, CommandRequest, QueryRequest } from './application'

export interface CreatePortDto {
  name: string
  locality: string
  countryCode: string
  initialZoneId: string
}

export interface PortDto {
  id: string
  code: number
  status: 'ACTIVE' | 'INACTIVE'
  version: {
    id: string
    effectiveFrom: string | null
    name: string
    locality: string
    countryCode: string
  }
  initialZoneId: string
}

export interface PortListQueryDto {
  page: number
  pageSize: number
  search: string
}

export interface PortPageDto {
  items: readonly PortDto[]
  total: number
  page: number
  pageSize: number
}

export interface PortApi {
  create(request: CommandRequest<CreatePortDto>): Promise<ApplicationResult<PortDto>>
  list(request: QueryRequest<PortListQueryDto>): Promise<ApplicationResult<PortPageDto>>
  get(request: QueryRequest<{ id: string }>): Promise<ApplicationResult<PortDto>>
}

export const portChannels = {
  create: 'ports:create',
  list: 'ports:list',
  get: 'ports:get',
} as const
