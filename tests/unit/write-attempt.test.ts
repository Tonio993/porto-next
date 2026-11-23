import { expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  WriteAttempt,
  readWriteReceipt,
  recoverWriteAttempt,
} from '../../src/renderer/src/api/write-attempt'
import { ResponseScope } from '../../src/renderer/src/api/response-scope'
import { runApplicationRequest } from '../../src/renderer/src/api/application-request'
import { WriteOutcomeStore } from '../../src/main/ipc/write-outcome-store'
import { trackedRequest, type WriteOutcomeDto } from '../../src/shared/contracts/write-outcomes'
import type { ApplicationResult, ArchiveContextDto } from '../../src/shared/contracts/application'

const context: ArchiveContextDto = {
  archiveId: '12345678-1234-4234-8234-123456789abc',
  sessionId: '22345678-1234-4234-8234-123456789abc',
  revision: '9007199254740993',
}
const id = '32345678-1234-4234-8234-123456789abc'
const success = <T>(value: T, snapshot = context): ApplicationResult<T> => ({
  ok: true,
  context: snapshot,
  value,
})
const failure = (
  code: 'REVISION_CONFLICT' | 'UNEXPECTED' | 'VALIDATION_ERROR',
  snapshot: ArchiveContextDto | null = context,
): ApplicationResult<never> => ({
  ok: false,
  context: snapshot,
  error: { code, message: code, fields: [], conflicts: [] },
})
const readRequest = { context: { sessionId: context.sessionId }, query: { attemptId: id } }
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { resolve, promise }
}
it('risposta normale, rifiuto noto e no-op non introducono incertezza', async () => {
  const attempt = new WriteAttempt()
  for (const result of [success('creata'), failure('VALIDATION_ERROR'), success('no-op')]) {
    expect(await attempt.run(context, id, async () => result)).toBe(result)
    expect(attempt.uncertain).toBe(false)
  }
})
it.each(['null', 'exception', 'UNEXPECTED'] as const)(
  '%s conserva il tentativo originale e blocca ogni riscrittura',
  async (mode) => {
    const attempt = new WriteAttempt(),
      write = vi.fn(async () => {
        if (mode === 'exception') throw Error('persa')
        return mode === 'null' ? null : failure('UNEXPECTED')
      })
    await attempt.run(context, id, write)
    expect(attempt.uncertain).toBe(true)
    await attempt.run({ ...context, revision: '9999999999999999' }, 'altro', write)
    expect(write).toHaveBeenCalledTimes(1)
    const read = vi.fn(async (attemptId, original) => {
      expect(attemptId).toBe(id)
      expect(original).toEqual(context)
      return success({ outcome: 'UNKNOWN', context: null } as WriteOutcomeDto)
    })
    await attempt.recover(read)
    expect(attempt.uncertain).toBe(true)
  },
)
it('promesse controllate: una sola invocazione concorrente, nessun recupero prima della conclusione', async () => {
  const attempt = new WriteAttempt(),
    pending = deferred<ApplicationResult<string> | null>(),
    write = vi.fn(() => pending.promise),
    read = vi.fn()
  const first = attempt.run(context, id, write)
  await attempt.run(context, id, write)
  await attempt.recover(read)
  expect(write).toHaveBeenCalledTimes(1)
  expect(read).not.toHaveBeenCalled()
  pending.resolve(null)
  await first
  expect(attempt.uncertain).toBe(true)
})
it.each(['APPLIED', 'REJECTED', 'UNKNOWN'] as const)(
  'recupero %s legge il medesimo tentativo e non scrive',
  async (outcome) => {
    const attempt = new WriteAttempt(),
      write = vi.fn(async () => null)
    await attempt.run(context, id, write)
    const read = vi.fn(async () => success({ outcome, context }))
    expect(await attempt.recover(read)).toBe(outcome)
    expect(attempt.uncertain).toBe(outcome === 'UNKNOWN')
    expect(write).toHaveBeenCalledTimes(1)
  },
)
it('due recuperi concorrenti producono una sola lettura', async () => {
  const attempt = new WriteAttempt(),
    pending = deferred<ApplicationResult<WriteOutcomeDto>>(),
    read = vi.fn(() => pending.promise)
  await attempt.run(context, id, async () => null)
  const first = attempt.recover(read)
  await attempt.recover(read)
  expect(read).toHaveBeenCalledTimes(1)
  pending.resolve(success({ outcome: 'APPLIED', context }))
  await first
  expect(attempt.uncertain).toBe(false)
})
it('errore o sessione diversa nel recupero mantiene il blocco', async () => {
  const attempt = new WriteAttempt()
  await attempt.run(context, id, async () => null)
  for (const read of [
    async () => null,
    async () => {
      throw Error('offline')
    },
    async () =>
      success({ outcome: 'APPLIED', context } as WriteOutcomeDto, {
        ...context,
        sessionId: 'nuova',
      }),
    async () =>
      success({
        outcome: 'APPLIED',
        context: { ...context, sessionId: 'nuova' },
      } as WriteOutcomeDto),
  ]) {
    expect(await attempt.recover(read)).toBe('UNKNOWN')
    expect(attempt.uncertain).toBe(true)
  }
})
it('ricevuta conserva il contesto originale anche se una lettura osserva una revisione successiva', async () => {
  const store = new WriteOutcomeStore(),
    after = { ...context, revision: '9007199254740994' },
    later = { ...context, revision: '9007199254740995' }
  const call = vi.fn(async () => success('ok', after))
  await store.execute(trackedRequest({ context, payload: { name: 'test' } }, id), call)
  expect(call).toHaveBeenCalledWith({ context, payload: { name: 'test' } })
  expect(store.get(readRequest, later)).toEqual({ outcome: 'APPLIED', context: after })
})
it('ricevuta pendente o assente resta ignota, senza deduzione dalla revisione o dall’assenza', async () => {
  const store = new WriteOutcomeStore(),
    pending = deferred<ApplicationResult<string>>()
  expect(store.get(readRequest, context).outcome).toBe('UNKNOWN')
  const first = store.execute(trackedRequest({ context, payload: {} }, id), () => pending.promise)
  expect(store.get(readRequest, context).outcome).toBe('UNKNOWN')
  pending.resolve(success('ok'))
  await first
  expect(store.get(readRequest, context).outcome).toBe('APPLIED')
})
it.each(['REVISION_CONFLICT', 'VALIDATION_ERROR', 'UNEXPECTED'] as const)(
  'ricevuta di %s distingue rifiuto noto ed esito ignoto',
  async (code) => {
    const store = new WriteOutcomeStore()
    await store.execute(trackedRequest({ context, payload: {} }, id), async () => failure(code))
    expect(store.get(readRequest, context).outcome).toBe(
      code === 'UNEXPECTED' ? 'UNKNOWN' : 'REJECTED',
    )
  },
)
it('eccezione dopo ingresso lascia una ricevuta ignota e impedisce il riuso del tentativo', async () => {
  const store = new WriteOutcomeStore(),
    input = trackedRequest({ context, payload: {} }, id),
    call = vi.fn(async () => {
      throw Error('persa')
    })
  await expect(store.execute(input, call)).rejects.toThrow('persa')
  await expect(store.execute(input, call)).rejects.toThrow('già eseguito')
  expect(store.get(readRequest, context).outcome).toBe('UNKNOWN')
  expect(call).toHaveBeenCalledTimes(1)
})
it('contesto di altra sessione, archivio chiuso e campi inattesi non espongono ricevute', async () => {
  const store = new WriteOutcomeStore()
  await store.execute(trackedRequest({ context, payload: {} }, id), async () => success('ok'))
  expect(() => store.get(readRequest, null)).toThrow()
  expect(() => store.get(readRequest, { ...context, sessionId: 'nuova' })).toThrow()
  expect(() => store.get({ ...readRequest, extra: true }, context)).toThrow()
  expect(() =>
    store.get({ ...readRequest, query: { attemptId: id, extra: true } }, context),
  ).toThrow()
  expect(() => store.get({ ...readRequest, query: { attemptId: 'non uuid' } }, context)).toThrow()
})
it('metadati di trasporto non aggirano la validazione della forma', async () => {
  const store = new WriteOutcomeStore(),
    call = vi.fn(async () => success('ok'))
  for (const input of [
    { context, payload: {}, attemptId: 'x' },
    { context, payload: {}, attemptId: id, extra: true },
    { context: { ...context, revision: '1.0' }, payload: {}, attemptId: id },
  ])
    await expect(store.execute(input, call)).rejects.toThrow()
  expect(call).not.toHaveBeenCalled()
})
it('invocazioni senza metadati conservano il contratto originale', async () => {
  const store = new WriteOutcomeStore(),
    input = { context, payload: {} },
    call = vi.fn(async () => success('ok'))
  await store.execute(input, call)
  expect(call).toHaveBeenCalledWith(input)
  expect(store.get(readRequest, context).outcome).toBe('UNKNOWN')
})
it('lettura recupero attende la conferma del contesto e scarta cambi sessione, smontaggio e revisioni arretrate', async () => {
  const receipt = success({ outcome: 'APPLIED', context } as WriteOutcomeDto)
  const pending = deferred<ArchiveContextDto | null>()
  let latest: ArchiveContextDto | null = context
  const refresh = vi.fn(() => pending.promise)
  const read = vi.fn(async () => receipt)
  const response = readWriteReceipt(context, read, refresh, () => latest)
  await Promise.resolve()
  latest = { ...context, sessionId: 'nuova' }
  pending.resolve(context)
  expect(await response).toBeNull()
  for (const observed of [null, { ...context, archiveId: 'altro' }, { ...context, revision: '1' }])
    expect(
      await readWriteReceipt(
        context,
        read,
        async () => observed,
        () => context,
      ),
    ).toBeNull()
  expect(
    await readWriteReceipt(
      context,
      read,
      async () => context,
      () => null,
    ),
  ).toBeNull()
  expect(read).toHaveBeenCalledTimes(5)
})
it('lettura recupero accetta una revisione corrente avanzata senza ribasare il contesto della ricevuta', async () => {
  const receipt = success({ outcome: 'APPLIED', context } as WriteOutcomeDto)
  const later = { ...context, revision: (BigInt(context.revision) + 1n).toString() }
  expect(
    await readWriteReceipt(
      context,
      async () => receipt,
      async () => later,
      () => later,
    ),
  ).toBe(receipt)
  // PR01: receipt recovery includes revision publication and selection cleanup.
  let observed = context,
    selected: string | null = 'deleted',
    detail: string | null = 'deleted'
  const scope = new ResponseScope(() => observed)
  scope.activate()
  const late = deferred<ApplicationResult<string>>(),
    report = vi.fn(),
    loading = vi.fn()
  const oldRead = runApplicationRequest(scope, () => late.promise, report, loading).then(
    (result) => {
      if (result?.ok) detail = result.value
    },
  )
  const attempt = new WriteAttempt(),
    write = vi.fn(async () => null),
    reread = vi.fn(async () => failure('UNEXPECTED'))
  await attempt.run(context, id, write)
  const outcome = await recoverWriteAttempt(
    attempt,
    async () => {
      observed = later
      await runApplicationRequest(scope, reread, report, loading)
      return success({ outcome: 'APPLIED', context } as WriteOutcomeDto, later)
    },
    () => {
      selected = null
      detail = null
    },
    (work) => scope.suspendWhile(work),
  )
  late.resolve(success('stale', later))
  await oldRead
  expect(outcome).toBe('APPLIED')
  expect(selected).toBeNull()
  expect(detail).toBeNull()
  expect(reread).not.toHaveBeenCalled()
  expect(report).not.toHaveBeenCalled()
  expect(write).toHaveBeenCalledTimes(1)
})
it('rifiuto della lettura non aggiorna il contesto e non costituisce un esito certo', async () => {
  const refresh = vi.fn(),
    result = failure('UNEXPECTED')
  expect(
    await readWriteReceipt(
      context,
      async () => result,
      refresh,
      () => context,
    ),
  ).toBe(result)
  expect(refresh).not.toHaveBeenCalled()
})
it('evizione della ricevuta mantiene l’esito ignoto anche dopo un successo precedente', async () => {
  const store = new WriteOutcomeStore()
  await store.execute(trackedRequest({ context, payload: {} }, id), async () => success('ok'))
  for (let i = 0; i < 2048; i++)
    await store.execute(trackedRequest({ context, payload: {} }, randomUUID()), async () =>
      success('ok'),
    )
  expect(store.get(readRequest, context).outcome).toBe('UNKNOWN')
})
it('ricevuta applicata priva di contesto o con archivio/revisione discordanti mantiene il blocco', async () => {
  const attempt = new WriteAttempt()
  await attempt.run(context, id, async () => null)
  for (const snapshot of [null, { ...context, archiveId: 'altro' }, { ...context, revision: '1' }])
    expect(
      await attempt.recover(async () => success({ outcome: 'APPLIED', context: snapshot })),
    ).toBe('UNKNOWN')
  expect(attempt.uncertain).toBe(true)
})
