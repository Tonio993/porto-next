import { expect, it, vi } from 'vitest'
import { runApplicationRequest } from '../../src/renderer/src/api/application-request'
import { ResponseScope } from '../../src/renderer/src/api/response-scope'
import type { ApplicationResult, ArchiveContextDto } from '../../src/shared/contracts/application'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function fixture() {
  let context: ArchiveContextDto = { archiveId: 'archive', sessionId: 'session', revision: '42' }
  const scope = new ResponseScope(() => context)
  scope.activate()
  const report = vi.fn(),
    loading = vi.fn()
  const request = <T>(operation: () => Promise<ApplicationResult<T>>, expectedAbsence = false) =>
    runApplicationRequest(scope, operation, report, loading, { expectedAbsence })
  return {
    scope,
    report,
    loading,
    request,
    get context() {
      return context
    },
    set context(value: ArchiveContextDto) {
      context = value
    },
  }
}
function failure(
  context: ArchiveContextDto | null,
  code: 'NOT_FOUND' | 'REFERENCE_IN_USE' = 'NOT_FOUND',
): ApplicationResult<never> {
  return {
    ok: false,
    context,
    error: {
      code,
      message: code === 'NOT_FOUND' ? 'Elemento assente' : 'Elemento utilizzato',
      fields: [],
      conflicts: [],
    },
  }
}

it('eliminazione: invalida letture pendenti, impedisce riletture fino alla pulizia della selezione e scarta assenze tardive', async () => {
  const f = fixture(),
    late = deferred<ApplicationResult<string>>(),
    committed = deferred<void>(),
    releaseState = deferred<void>()
  const oldRead = f.request(() => late.promise)
  let selected: string | null = 'element',
    detail: string | null = 'element'
  const reread = vi.fn(async () => failure(f.context))
  const deletion = f.scope.suspendWhile(async () => {
    f.context = { ...f.context, revision: '43' }
    committed.resolve()
    await releaseState.promise
    selected = null
    detail = null
  })
  await committed.promise
  expect(await f.request(reread)).toBeNull()
  expect(reread).not.toHaveBeenCalled()
  late.resolve(failure(f.context))
  expect(await oldRead).toBeNull()
  releaseState.resolve()
  await deletion
  expect({ selected, detail }).toEqual({ selected: null, detail: null })
  expect(f.report).not.toHaveBeenCalled()
  expect(await f.request(async () => failure(f.context))).toEqual(failure(f.context))
  expect(f.report).toHaveBeenCalledWith('Elemento assente')
})

it('una risposta avviata prima della sospensione non riappare nemmeno se arriva dopo la sua fine', async () => {
  const f = fixture(),
    late = deferred<ApplicationResult<string>>()
  const oldRead = f.request(() => late.promise)
  await f.scope.suspendWhile(async () => undefined)
  late.resolve({ ok: true, context: f.context, value: 'dettaglio eliminato' })
  expect(await oldRead).toBeNull()
})

it('assenza attesa ? locale alla richiesta di recupero; altri errori restano segnalati', async () => {
  const f = fixture()
  expect(await f.request(async () => failure(f.context), true)).toEqual(failure(f.context))
  expect(f.report).not.toHaveBeenCalled()
  await f.request(async () => failure(f.context, 'REFERENCE_IN_USE'), true)
  expect(f.report).toHaveBeenLastCalledWith('Elemento utilizzato')
  await f.request(async () => failure(f.context))
  expect(f.report).toHaveBeenLastCalledWith('Elemento assente')
})

it.each(['sessione', 'revisione', 'selezione', 'smontaggio'] as const)(
  'scarta successo ed errore superati per %s',
  async (change) => {
    for (const ok of [true, false]) {
      const f = fixture(),
        late = deferred<ApplicationResult<string>>()
      const original = f.context
      const pending = f.request(() => late.promise, true)
      if (change === 'sessione') f.context = { ...original, sessionId: 'new-session' }
      if (change === 'revisione') f.context = { ...original, revision: '43' }
      if (change === 'selezione') f.scope.invalidate()
      if (change === 'smontaggio') f.scope.dispose()
      late.resolve(ok ? { ok: true, context: original, value: 'vecchio' } : failure(original))
      expect(await pending).toBeNull()
      expect(f.report).not.toHaveBeenCalled()
    }
  },
)

it('un errore di comunicazione reale viene segnalato, uno superato non modifica la vista n? il caricamento nuovo', async () => {
  const f = fixture(),
    old = deferred<ApplicationResult<string>>(),
    current = deferred<ApplicationResult<string>>()
  const first = f.request(() => old.promise)
  const second = f.request(() => current.promise)
  old.reject(Error('vecchio canale'))
  expect(await first).toBeNull()
  expect(f.report).not.toHaveBeenCalled()
  expect(f.loading.mock.calls).toEqual([[true], [true]])
  current.reject(Error('canale corrente'))
  expect(await second).toBeNull()
  expect(f.report).toHaveBeenCalledOnce()
  expect(f.loading).toHaveBeenLastCalledWith(false)
})

it('rilascia la barriera dopo errori e sospensioni annidate; non sospende le modifiche non distruttive', async () => {
  const f = fixture()
  await expect(
    f.scope.suspendWhile(async () => {
      await f.scope.suspendWhile(async () => undefined)
      expect(await f.request(async () => failure(f.context))).toBeNull()
      throw Error('esito perso')
    }),
  ).rejects.toThrow('esito perso')
  await f.scope.suspendWhile(async () => {
    expect(
      await f.request(async () => ({ ok: true, value: 'aggiornamento', context: f.context })),
    ).toMatchObject({ value: 'aggiornamento' })
  }, false)
  expect(f.report).not.toHaveBeenCalled()
})

it('il recupero non accetta assenze di una vecchia sessione o revisione, anche con contesto nullo dopo cambio sessione', async () => {
  const f = fixture(),
    late = deferred<ApplicationResult<string>>()
  const pending = f.request(() => late.promise, true)
  f.context = { ...f.context, sessionId: 'copy-session' }
  late.resolve(failure(null))
  expect(await pending).toBeNull()
  expect(f.report).not.toHaveBeenCalled()
})
