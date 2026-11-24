import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { NumericFormat } from '../../../shared/contracts/numeric-preference'
import type { NumericPreferenceStorage } from '../../application/preferences/numeric-preference'

export class NumericPreferenceStore implements NumericPreferenceStorage {
  constructor(private readonly path: string) {}
  read(): unknown {
    try {
      return JSON.parse(readFileSync(this.path, 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw error
    }
  }
  write(value: NumericFormat): void {
    mkdirSync(dirname(this.path), { recursive: true })
    const temporary = `${this.path}.tmp`
    writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf8')
    renameSync(temporary, this.path)
  }
}
