/** Synchronous latch around an entire UI action, including its result application. */
export class SingleFlight {
  private running = false
  get busy() {
    return this.running
  }
  async run(action: () => Promise<void>) {
    if (this.running) return
    this.running = true
    try {
      await action()
    } finally {
      this.running = false
    }
  }
}
