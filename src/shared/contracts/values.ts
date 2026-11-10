import type { ApplicationResult, CommandRequest, QueryRequest } from './application'

export type MoneyText = string
export type DecimalText = string
export type LocalMinute = string
export type UtcInstant = string

export interface MomentInputDto {
  localDateTime: LocalMinute
  selectedOffset: string | null
}

export interface ResolvedMomentDto {
  localDateTime: LocalMinute
  zoneId: string
  offset: string
  utc: UtcInstant
}

export type MomentResolutionDto =
  | { status: 'RESOLVED'; moment: ResolvedMomentDto }
  | {
      status: 'CHOICE_REQUIRED'
      choices: readonly [ResolvedMomentDto, ResolvedMomentDto, ...ResolvedMomentDto[]]
    }

export interface CompanyTimeZoneDto {
  zoneId: string
  confirmed: boolean
}

export interface TimeApi {
  getCompanyZone: (request: QueryRequest<null>) => Promise<ApplicationResult<CompanyTimeZoneDto>>
  configureCompanyZone: (
    request: CommandRequest<{ zoneId: string }>,
  ) => Promise<ApplicationResult<CompanyTimeZoneDto>>
  resolveCompanyMoment: (
    request: QueryRequest<MomentInputDto>,
  ) => Promise<ApplicationResult<MomentResolutionDto>>
}

export const timeChannels = {
  getCompanyZone: 'time:company-zone',
  configureCompanyZone: 'time:configure-company-zone',
  resolveCompanyMoment: 'time:resolve-company-moment',
} as const
