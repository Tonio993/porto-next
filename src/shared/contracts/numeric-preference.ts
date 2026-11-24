export interface NumericFormat {
  decimalSeparator: ',' | '.'
  groupSeparator: '.' | ','
  grouping: boolean
}

export const italianNumericFormat: Readonly<NumericFormat> = {
  decimalSeparator: ',',
  groupSeparator: '.',
  grouping: true,
}
export const englishNumericFormat: Readonly<NumericFormat> = {
  decimalSeparator: '.',
  groupSeparator: ',',
  grouping: true,
}
export type NumericPreferenceResult =
  | { ok: true; value: NumericFormat; source: 'saved' | 'default'; warning: string | null }
  | { ok: false; error: { code: 'INVALID_INPUT' | 'PREFERENCE_WRITE_FAILED'; message: string } }
export interface NumericPreferenceApi {
  get(): Promise<NumericPreferenceResult>
  set(value: NumericFormat): Promise<NumericPreferenceResult>
}
export const numericPreferenceChannels = {
  get: 'numeric-preference:get',
  set: 'numeric-preference:set',
} as const
