import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type SetStateAction,
} from 'react'
import {
  ConsultationStore,
  type ConsultationSection,
  type ConsultationState,
} from './consultation-state'

const ConsultationContext = createContext<ConsultationStore | null>(null)

// App remounts this provider together with DraftProtection on every actual session activation.
export function ConsultationWorkspace({ children }: { children: ReactNode }) {
  const [store] = useState(() => new ConsultationStore())
  return <ConsultationContext.Provider value={store}>{children}</ConsultationContext.Provider>
}

export function useConsultationState<
  S extends ConsultationSection,
  F extends keyof ConsultationState[S],
>(
  section: S,
  field: F,
  owner: string | null = null,
): [
  ConsultationState[S][F],
  (value: SetStateAction<ConsultationState[S][F]>) => void,
  () => boolean,
] {
  const store = useContext(ConsultationContext)
  if (!store) throw Error('Consultazione fuori dal workspace')
  const binding = useMemo(() => {
    let active = false
    return {
      activate: () => {
        active = true
      },
      dispose: () => {
        active = false
      },
      read: () => store.read(section, owner, field),
      current: (expected: ConsultationState[S][F]) =>
        active && Object.is(store.read(section, owner, field), expected),
      set: (value: SetStateAction<ConsultationState[S][F]>) => {
        if (!active) return
        const next =
          typeof value === 'function'
            ? (value as (previous: ConsultationState[S][F]) => ConsultationState[S][F])(
                store.read(section, owner, field),
              )
            : value
        store.write(section, owner, field, next)
      },
    }
  }, [store, section, owner, field])
  useLayoutEffect(() => {
    binding.activate()
    return binding.dispose
  }, [binding])
  const value = useSyncExternalStore(store.subscribe, binding.read, binding.read)
  // A response can have resolved immediately before an event changes the intent, even before React commits.
  const current = useMemo(() => () => binding.current(value), [binding, value])
  return [value, binding.set, current]
}

export function useConsultationPicker(
  section:
    | 'operationVessels'
    | 'serviceVessels'
    | 'tariffPorts'
    | 'servicePorts'
    | 'serviceBerths'
    | 'serviceCustomers'
    | 'serviceAgencies'
    | 'serviceTypes',
  owner: string | null = null,
) {
  const [search, setSearch, searchCurrent] = useConsultationState(section, 'search', owner)
  const [page, setPage, pageCurrent] = useConsultationState(section, 'page', owner)
  return {
    scope: JSON.stringify([section, owner]),
    search,
    setSearch,
    page,
    setPage,
    current: () => searchCurrent() && pageCurrent(),
  }
}
export type ConsultationPicker = ReturnType<typeof useConsultationPicker>
