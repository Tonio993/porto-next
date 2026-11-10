import type { ArchiveContextDto } from '../../../shared/contracts/application'
import { ArchiveCoordinator } from './archive-coordinator'
import { ArchiveFileOperations } from './archive-files'

/** Public lifecycle facade. The callback receives primitives that never enqueue again. */
export class ArchiveService {
  private readonly files: ArchiveFileOperations

  constructor(readonly coordinator = new ArchiveCoordinator()) {
    this.files = new ArchiveFileOperations(coordinator)
  }

  current() {
    return this.coordinator.current()
  }
  context() {
    return this.coordinator.context()
  }

  withFiles<T>(operation: (files: ArchiveFileOperations) => T | Promise<T>): Promise<T> {
    return this.coordinator.run(() => operation(this.files))
  }

  create(path: string, name: string) {
    return this.withFiles((files) => files.create(path, name))
  }
  open(path: string) {
    return this.withFiles((files) => files.open(path))
  }
  saveAs(path: string, expected = this.context()) {
    return this.target(expected, (files) => files.saveAs(path))
  }
  backup(path: string, expected = this.context()) {
    return this.target(expected, (files) => files.backup(path))
  }
  rename(name: string, expected = this.context()) {
    return this.target(expected, (files) => files.rename(name, expected))
  }
  close(expected = this.context()) {
    return this.withFiles((files) => {
      if (expected || this.coordinator.database) this.coordinator.assertContext(expected)
      files.close()
    })
  }
  shutdown() {
    return this.withFiles((files) => files.close())
  }
  private target<T>(
    expected: ArchiveContextDto | null,
    operation: (files: ArchiveFileOperations) => T | Promise<T>,
  ) {
    return this.withFiles((files) => {
      this.coordinator.assertContext(expected)
      return operation(files)
    })
  }
}
