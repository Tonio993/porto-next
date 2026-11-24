import type { Context, ReactElement, SetStateAction } from 'react'

type Effect = {
  deps?: readonly unknown[]
  run: () => void | (() => void)
  cleanup?: () => void
  layout: boolean
  pending: boolean
}
let running: HookRunner<unknown> | null = null
export const contexts = new Map<unknown, unknown>()
const equal = (a?: readonly unknown[], b?: readonly unknown[]) =>
  !!a && !!b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]))
function runner() {
  if (!running) throw Error('Hook fuori dal runner')
  return running
}

// Deterministic unit harness: executes the production adapters and their effects, without a DOM.
// It does not attest React reconciliation, browser events, focus or Electron interactions.
export class HookRunner<T> {
  slots: unknown[] = []
  effects: Effect[] = []
  index = 0
  dirty = true
  alive = true
  value!: T
  constructor(private readonly render: () => T) {}
  flush() {
    let turns = 0
    while (this.dirty && this.alive) {
      if (++turns > 100) throw Error('Render non converge')
      this.dirty = false
      this.index = 0
      running = this as HookRunner<unknown>
      try {
        this.value = this.render()
      } finally {
        running = null
      }
      for (const layout of [true, false]) {
        const pending = this.effects.filter((e) => e.pending && e.layout === layout)
        for (const e of pending) e.cleanup?.()
        for (const e of pending) {
          e.pending = false
          e.cleanup = e.run() || undefined
        }
      }
    }
    return this.value
  }
  async until(predicate: (value: T) => boolean) {
    for (let turn = 0; turn < 150; turn++) {
      this.flush()
      if (predicate(this.value)) return this.value
      await Promise.resolve()
    }
    throw Error('Segnale atteso non ricevuto')
  }
  unmount() {
    this.alive = false
    for (const layout of [true, false])
      for (const e of this.effects) if (e.layout === layout) e.cleanup?.()
  }
}
export function useState<T>(initial: T | (() => T)): [T, (value: SetStateAction<T>) => void] {
  const r = runner(),
    index = r.index++
  if (!(index in r.slots)) {
    const state = {
      value: typeof initial === 'function' ? (initial as () => T)() : initial,
      set: (value: SetStateAction<T>) => {
        void value
      },
    }
    state.set = (value) => {
      if (!r.alive) return
      const next = typeof value === 'function' ? (value as (previous: T) => T)(state.value) : value
      if (!Object.is(next, state.value)) {
        state.value = next
        r.dirty = true
      }
    }
    r.slots[index] = state
  }
  const state = r.slots[index] as { value: T; set: (value: SetStateAction<T>) => void }
  return [state.value, state.set]
}
export function useMemo<T>(make: () => T, deps?: readonly unknown[]): T {
  const r = runner(),
    index = r.index++
  let memo = r.slots[index] as { value: T; deps?: readonly unknown[] } | undefined
  if (!memo || !equal(memo.deps, deps)) {
    memo = { value: make(), deps }
    r.slots[index] = memo
  }
  return memo.value
}
export function useRef<T>(initial: T) {
  return useMemo(() => ({ current: initial }), [])
}
export function useCallback<T>(fn: T, deps?: readonly unknown[]) {
  return useMemo(() => fn, deps)
}
function effect(run: Effect['run'], deps: readonly unknown[] | undefined, layout: boolean) {
  const r = runner(),
    index = r.index++
  let e = r.slots[index] as Effect | undefined
  if (!e) {
    e = { run, deps, layout, pending: true }
    r.slots[index] = e
    r.effects.push(e)
  } else if (!equal(e.deps, deps)) {
    e.run = run
    e.deps = deps
    e.pending = true
  }
}
export function useEffect(run: Effect['run'], deps?: readonly unknown[]) {
  effect(run, deps, false)
}
export function useLayoutEffect(run: Effect['run'], deps?: readonly unknown[]) {
  effect(run, deps, true)
}
export function useContext<T>(context: Context<T>): T {
  return contexts.get(context) as T
}
export function useSyncExternalStore<T>(
  subscribe: (fn: () => void) => () => void,
  snapshot: () => T,
) {
  const r = runner()
  useLayoutEffect(
    () =>
      subscribe(() => {
        if (r.alive) r.dirty = true
      }),
    [subscribe],
  )
  return snapshot()
}
export function provide(element: ReactElement<{ value: unknown }>) {
  contexts.set(element.type, element.props.value)
}
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
