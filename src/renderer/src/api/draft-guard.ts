export type DraftState = 'CLEAN' | 'DRAFT' | 'BUSY' | 'UNCERTAIN'
export interface DraftOwner {
  state: DraftState
  discard: () => void
  recover: () => void
}
export interface RequestedAction {
  label: string
  run: () => void | Promise<void>
}

/** Workspace lifetime; closing a view or message never changes an owner's state. */
export class DraftGuard {
  private owners = new Map<object, () => DraftOwner>()
  private executing = false
  private active = true
  pending: RequestedAction | null = null
  blocked: DraftState | null = null
  constructor(private readonly changed: () => void = () => {}) {}
  activate() {
    this.active = true
  }
  dispose() {
    this.active = false
    this.pending = null
    this.blocked = null
    this.owners.clear()
  }
  register(key: object, owner: () => DraftOwner) {
    this.owners.set(key, owner)
    return () => {
      this.owners.delete(key)
    }
  }
  private current() {
    return [...this.owners.values()].map((read) => read())
  }
  request(action: RequestedAction) {
    if (!this.active || this.executing || this.pending) return false
    const owners = this.current()
    const blocker =
      owners.find((o) => o.state === 'UNCERTAIN') ?? owners.find((o) => o.state === 'BUSY')
    if (blocker) {
      this.blocked = blocker.state
      this.changed()
      return false
    }
    if (owners.some((o) => o.state === 'DRAFT')) {
      this.pending = action
      this.changed()
      return false
    }
    this.execute(action)
    return true
  }
  cancel() {
    if (!this.active) return
    this.pending = null
    this.blocked = null
    this.changed()
  }
  discard() {
    const action = this.pending
    if (!this.active || !action || this.executing) return
    // Recheck at confirmation: a write may have started while the dialog was open.
    const owners = this.current()
    if (owners.some((o) => o.state === 'BUSY' || o.state === 'UNCERTAIN')) {
      this.pending = null
      this.request(action)
      return
    }
    this.pending = null
    for (const owner of owners) if (owner.state === 'DRAFT') owner.discard()
    this.execute(action)
    this.changed()
  }
  recover() {
    if (!this.active) return
    const owner = this.current().find((o) => o.state === 'UNCERTAIN')
    this.cancel()
    owner?.recover()
  }
  private execute(action: RequestedAction) {
    this.executing = true
    try {
      const result = action.run()
      void Promise.resolve(result).finally(() => {
        this.executing = false
      })
    } catch (error) {
      this.executing = false
      throw error
    }
  }
}
