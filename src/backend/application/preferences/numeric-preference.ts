import {
  italianNumericFormat,
  type NumericFormat,
  type NumericPreferenceResult,
} from '../../../shared/contracts/numeric-preference'

export function validNumericFormat(value: unknown): value is NumericFormat {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return (
    Object.keys(v).length === 3 &&
    typeof v.grouping === 'boolean' &&
    ((v.decimalSeparator === ',' && v.groupSeparator === '.') ||
      (v.decimalSeparator === '.' && v.groupSeparator === ','))
  )
}
export interface NumericPreferenceStorage {
  read(): unknown
  write(value: NumericFormat): void
}
/** Independent of archive coordination: no session, revision or database access. */
export class NumericPreferenceService {
  constructor(
    private readonly storage: NumericPreferenceStorage,
    private readonly log: (error: unknown) => void = () => {},
  ) {}
  get(input?: unknown): NumericPreferenceResult {
    if (input !== undefined) return this.invalid()
    try {
      const value = this.storage.read()
      if (value === undefined)
        return { ok: true, value: { ...italianNumericFormat }, source: 'default', warning: null }
      if (!validNumericFormat(value)) throw new Error('Unsupported numeric preference')
      return { ok: true, value: { ...value }, source: 'saved', warning: null }
    } catch (error) {
      this.log(error)
      return {
        ok: true,
        value: { ...italianNumericFormat },
        source: 'default',
        warning:
          'Preferenza numerica non leggibile o non supportata. In uso il formato italiano; puoi salvarne uno nuovo.',
      }
    }
  }
  set(input: unknown): NumericPreferenceResult {
    if (!validNumericFormat(input)) return this.invalid()
    try {
      this.storage.write(input)
      return { ok: true, value: { ...input }, source: 'saved', warning: null }
    } catch (error) {
      this.log(error)
      return {
        ok: false,
        error: {
          code: 'PREFERENCE_WRITE_FAILED',
          message:
            'Impossibile salvare la notazione numerica. La preferenza precedente resta in uso.',
        },
      }
    }
  }
  private invalid(): NumericPreferenceResult {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message:
          'Configurazione numerica non supportata. Scegli separatori distinti fra punto e virgola e un raggruppamento valido.',
      },
    }
  }
}
