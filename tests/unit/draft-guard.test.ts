import { expect, it, vi } from 'vitest'
import {
  DraftGuard,
  type DraftOwner,
  type DraftState,
} from '../../src/renderer/src/api/draft-guard'
import { ResponseScope } from '../../src/renderer/src/api/response-scope'
import { runApplicationRequest } from '../../src/renderer/src/api/application-request'
import { SingleFlight } from '../../src/renderer/src/api/single-flight'
import type { ApplicationResult, ArchiveContextDto } from '../../src/shared/contracts/application'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
function fixture(state: DraftState = 'DRAFT') {
  const guard = new DraftGuard()
  const owner: DraftOwner = { state, discard: vi.fn(), recover: vi.fn() }
  const remove = guard.register({}, () => owner)
  const run = vi.fn()
  return {
    guard,
    owner,
    remove,
    run,
    request: () => guard.request({ label: 'nuovo inserimento', run }),
  }
}
it('senza bozza avvia normalmente una sola azione', async () => {
  const f = fixture('CLEAN')
  expect(f.request()).toBe(true)
  expect(f.request()).toBe(false)
  expect(f.run).toHaveBeenCalledTimes(1)
  await Promise.resolve()
  expect(f.request()).toBe(true)
})
it('Annulla conserva valori, contesto e anteprima originali', () => {
  const f = fixture()
  const draft = { value: 'testo', context: { sessionId: 's', revision: '9' }, preview: 'p' }
  f.owner.discard = () => {
    draft.value = ''
    draft.preview = ''
  }
  f.request()
  expect(f.guard.pending?.label).toBe('nuovo inserimento')
  f.guard.cancel()
  expect(draft).toEqual({
    value: 'testo',
    context: { sessionId: 's', revision: '9' },
    preview: 'p',
  })
  expect(f.run).not.toHaveBeenCalled()
})
it('Scarta pulisce prima dell’avvio e non esegue una seconda conferma', () => {
  const f = fixture(),
    events: string[] = []
  f.owner.discard = () => {
    events.push('discard')
    f.owner.state = 'CLEAN'
  }
  f.guard.request({
    label: 'retroattivo',
    run: () => {
      events.push('start')
    },
  })
  f.guard.discard()
  f.guard.discard()
  expect(events).toEqual(['discard', 'start'])
})
it('richieste concorrenti conservano il primo intento esplicito', () => {
  const f = fixture(),
    other = vi.fn()
  f.request()
  expect(f.guard.request({ label: 'altra nave', run: other })).toBe(false)
  f.guard.discard()
  expect(f.run).toHaveBeenCalledTimes(1)
  expect(other).not.toHaveBeenCalled()
})
it.each(['BUSY', 'UNCERTAIN'] as const)(
  '%s blocca nuovo comando, scarto e navigazione anche dopo chiusura del messaggio',
  (state) => {
    const f = fixture(state)
    for (const label of [
      'nuova entrata',
      'nuova prestazione',
      'sezione',
      'sottosezione',
      'altra nave',
      'Salva con nome',
    ]) {
      expect(f.guard.request({ label, run: f.run })).toBe(false)
      f.guard.discard()
      f.guard.cancel()
      expect(f.owner.state).toBe(state)
    }
    expect(f.owner.discard).not.toHaveBeenCalled()
    expect(f.run).not.toHaveBeenCalled()
  },
)
it('riesamina occupazione/incertezza sopraggiunte fra richiesta e Scarta', () => {
  const f = fixture()
  f.request()
  f.owner.state = 'UNCERTAIN'
  f.guard.discard()
  expect(f.guard.blocked).toBe('UNCERTAIN')
  expect(f.owner.discard).not.toHaveBeenCalled()
  expect(f.run).not.toHaveBeenCalled()
})
it('recupero riapre l’editor specifico, senza cancellare lo stato né ripetere il comando', () => {
  const f = fixture('UNCERTAIN')
  f.request()
  f.guard.recover()
  expect(f.owner.recover).toHaveBeenCalledTimes(1)
  expect(f.owner.state).toBe('UNCERTAIN')
  expect(f.owner.discard).not.toHaveBeenCalled()
  expect(f.run).not.toHaveBeenCalled()
})
it('privilegia il recupero dell’incertezza quando un altro proprietario è occupato', () => {
  const f = fixture('BUSY'),
    recover = vi.fn()
  f.guard.register({}, () => ({ state: 'UNCERTAIN', discard: vi.fn(), recover }))
  f.request()
  f.guard.recover()
  expect(recover).toHaveBeenCalledTimes(1)
})
it('riprende la navigazione solo dopo il recupero e una nuova richiesta esplicita', async () => {
  const f = fixture('UNCERTAIN')
  f.request()
  f.guard.recover()
  f.owner.state = 'DRAFT'
  expect(f.run).not.toHaveBeenCalled()
  f.request()
  f.guard.discard()
  await Promise.resolve()
  expect(f.run).toHaveBeenCalledTimes(1)
})
it('scarto di più proprietari precede l’unica azione, smontaggio rimuove il proprietario', () => {
  const f = fixture(),
    discard = vi.fn()
  f.guard.register({}, () => ({ state: 'DRAFT', discard, recover: vi.fn() }))
  f.remove()
  f.request()
  f.guard.discard()
  expect(discard).toHaveBeenCalledTimes(1)
  expect(f.owner.discard).not.toHaveBeenCalled()
  expect(f.run).toHaveBeenCalledTimes(1)
})
it('lo scarto invalida la risposta tardiva e preserva la bozza nuova', async () => {
  const f = fixture(),
    late = deferred<ApplicationResult<string>>()
  const context: ArchiveContextDto = { archiveId: 'a', sessionId: 's', revision: '8' }
  const scope = new ResponseScope(() => context)
  scope.activate()
  let preview: string | null = null
  const response = runApplicationRequest(scope, () => late.promise, vi.fn(), vi.fn()).then((r) => {
    if (r?.ok) preview = r.value
  })
  f.owner.discard = () => {
    scope.invalidate()
    preview = null
  }
  f.guard.request({
    label: 'nuovo',
    run: () => {
      preview = 'nuova'
    },
  })
  f.guard.discard()
  late.resolve({ ok: true, context, value: 'obsoleta' })
  await response
  expect(preview).toBe('nuova')
})
it('smontaggio invalida intento e proprietari; la riattivazione richiede nuovi proprietari e una nuova azione', () => {
  const f = fixture()
  f.request()
  expect(f.guard.pending).not.toBeNull()
  f.guard.dispose()
  f.guard.discard()
  expect(f.request()).toBe(false)
  expect(f.run).not.toHaveBeenCalled()
  expect(f.owner.discard).not.toHaveBeenCalled()
  f.guard.activate()
  const next = { state: 'DRAFT' as DraftState, discard: vi.fn(), recover: vi.fn() }
  f.guard.register({}, () => next)
  f.request()
  f.guard.discard()
  expect(next.discard).toHaveBeenCalledTimes(1)
  expect(f.owner.discard).not.toHaveBeenCalled()
  expect(f.run).toHaveBeenCalledTimes(1)
})
it('SingleFlight blocca doppio click fino all’applicazione dell’esito, poi accetta un nuovo comando', async () => {
  const flight = new SingleFlight(),
    release = deferred<void>(),
    write = vi.fn(() => release.promise)
  const first = flight.run(write)
  await flight.run(write)
  expect(write).toHaveBeenCalledTimes(1)
  release.resolve()
  await first
  await flight.run(async () => {
    write()
  })
  expect(write).toHaveBeenCalledTimes(2)
})
it('SingleFlight si libera dopo eccezione senza ripetizione automatica', async () => {
  const flight = new SingleFlight(),
    write = vi.fn(async () => {
      throw Error('persa')
    })
  await expect(flight.run(write)).rejects.toThrow('persa')
  expect(write).toHaveBeenCalledTimes(1)
  await flight.run(async () => {})
})
