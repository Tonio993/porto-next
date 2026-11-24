import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  italianNumericFormat,
  type NumericFormat,
} from '../../../shared/contracts/numeric-preference'

interface NumericPreferenceView {
  format: NumericFormat
  loading: boolean
  busy: boolean
  message: string | null
  save: (format: NumericFormat) => Promise<void>
}
const NumericPreferenceContext = createContext<NumericPreferenceView>({
  format: { ...italianNumericFormat } as NumericFormat,
  loading: false,
  busy: false,
  message: null as string | null,
  save: async () => {},
})
export function NumericPreferenceProvider({ children }: { children: ReactNode }) {
  const saving = useRef(false)
  const alive = useRef(true)
  const [format, setFormat] = useState<NumericFormat>({ ...italianNumericFormat })
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    alive.current = true
    let active = true
    void window.numericPreference
      .get()
      .then((result) => {
        if (!active) return
        if (result.ok) {
          setFormat(result.value)
          setMessage(result.warning)
        } else setMessage(result.error.message)
      })
      .catch(() => {
        if (active)
          setMessage('Impossibile leggere la preferenza numerica. In uso il formato italiano.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      alive.current = false
    }
  }, [])
  const save = async (next: NumericFormat) => {
    if (loading || saving.current || !alive.current) return
    saving.current = true
    setBusy(true)
    try {
      const result = await window.numericPreference.set(next)
      if (!alive.current) return
      if (result.ok) {
        setFormat(result.value)
        setMessage('Notazione numerica salvata.')
      } else setMessage(result.error.message)
    } catch {
      if (alive.current)
        setMessage(
          'Impossibile salvare la notazione numerica. La preferenza precedente resta in uso.',
        )
    } finally {
      saving.current = false
      if (alive.current) setBusy(false)
    }
  }
  return (
    <NumericPreferenceContext.Provider value={{ format, loading, busy, message, save }}>
      {children}
    </NumericPreferenceContext.Provider>
  )
}
export const useNumericPreference = () => useContext(NumericPreferenceContext)
export const useNumericFormat = () => useNumericPreference().format
