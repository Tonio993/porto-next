import type { ApplicationErrorDto, ArchiveContextDto, CommandRequest } from './application'

export interface ArchiveInfo {
  id: string
  name: string
  path: string
  schemaVersion: number
  createdAt: string
  updatedAt: string
}

export interface RecentArchive {
  path: string
  name: string
  lastOpenedAt: string
}

export interface ArchiveState {
  active: ArchiveInfo | null
  recent: RecentArchive[]
  context: ArchiveContextDto | null
}

export const archiveChannels = {
  state: 'archive:state',
  create: 'archive:create',
  open: 'archive:open',
  openRecent: 'archive:open-recent',
  saveAs: 'archive:save-as',
  backup: 'archive:backup',
  close: 'archive:close',
  rename: 'archive:rename',
  changed: 'archive:changed',
  actionRequested: 'archive:action-requested',
} as const

export type ErrorCode =
  | 'INVALID_ARCHIVE'
  | 'NEWER_SCHEMA'
  | 'INVALID_INPUT'
  | 'FILE_EXISTS'
  | 'FILE_NOT_FOUND'
  | 'FILE_ACCESS'
  | 'ARCHIVE_BUSY'
  | 'NO_ARCHIVE'
  | 'UNEXPECTED'

export type Result<T> =
  | { ok: true; value: T; context?: ArchiveContextDto | null }
  | { ok: false; error: ApplicationErrorDto; context?: ArchiveContextDto | null }

export type ArchiveMenuAction = 'open' | 'saveAs' | 'backup' | 'close'
export interface ArchiveApi {
  onActionRequested(callback: (action: ArchiveMenuAction) => void): () => void
  getState(): Promise<Result<ArchiveState>>
  create(name: string): Promise<Result<ArchiveState>>
  open(): Promise<Result<ArchiveState>>
  openRecent(path: string): Promise<Result<ArchiveState>>
  saveAs(request?: CommandRequest<null>): Promise<Result<ArchiveState>>
  backup(request?: CommandRequest<null>): Promise<Result<{ path: string | null }>>
  close(request?: CommandRequest<null>): Promise<Result<ArchiveState>>
  rename(input: string | CommandRequest<{ name: string }>): Promise<Result<ArchiveState>>
  onChanged(callback: (state: ArchiveState) => void): () => void
}
