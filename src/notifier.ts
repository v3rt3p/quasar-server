interface Waiter {
  resolve: (noRemove: boolean) => void
  timeout: NodeJS.Timeout | null
}

export class Notifier {
  private waiters: Waiter[] = []

  notifyAll (): void {
    for (const waiter of this.waiters) {
      waiter.resolve(true)
    }
    this.waiters = []
  }

  wait (timeout?: number): Promise<void> {
    // eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
    const notifier = this
    const waiter: Waiter = {
      resolve: () => {},
      timeout: null
    }
    this.waiters.push(waiter)
    const promise = new Promise<void>((resolve) => {
      let resolved = false
      waiter.resolve = (noRemove: boolean) => {
        if (resolved) {
          return
        }
        resolved = true
        if (waiter.timeout) {
          clearTimeout(waiter.timeout)
          waiter.timeout = null
        }
        if (!noRemove) {
          const position = notifier.waiters.indexOf(waiter)
          if (position !== -1) {
            notifier.waiters.splice(position, 1)
          }
        }
        resolve()
      }
    })
    if (timeout !== undefined && Number.isFinite(timeout) && timeout > 0) {
      waiter.timeout = setTimeout(function () {
        waiter.timeout = null
        waiter.resolve(false)
      }, timeout)
    }
    return promise
  }
}
