import { expect, it } from 'vitest'
import { ResponseScope, fieldErrors } from '../../src/renderer/src/api/response-scope'
import type { ArchiveContextDto, ApplicationResult } from '../../src/shared/contracts/application'
it('scarta risultati dopo selezione diversa, smontaggio, rimontaggio e cambio sessione', async () => {
  let context: ArchiveContextDto = { archiveId: 'A', sessionId: 'one', revision: '1' }
  const scope = new ResponseScope(() => context)
  scope.activate()
  const result: ApplicationResult<string> = { ok: true, value: 'prima selezione', context }
  const first = scope.begin()
  const second = scope.begin()
  expect(first.accepts(result)).toBe(false)
  expect(second.accepts(result)).toBe(true)
  scope.dispose()
  scope.activate()
  expect(second.accepts(result)).toBe(false)
  const active = scope.begin()
  context = { ...context, sessionId: 'two' }
  expect(active.accepts(result)).toBe(false)
})
it('scarta risposte di revisioni precedenti senza perdere i metadati delle risposte valide', () => {
  const context = { archiveId: 'A', sessionId: 'one', revision: '9007199254740994' }
  const scope = new ResponseScope(() => context)
  scope.activate()
  const ticket = scope.begin()
  expect(
    ticket.accepts({
      ok: true,
      value: null,
      context: { ...context, revision: '9007199254740993' },
    }),
  ).toBe(false)
  expect(ticket.accepts({ ok: true, value: null, context })).toBe(true)
  scope.invalidate()
  expect(ticket.current()).toBe(false)
})
it('conserva i percorsi degli errori per campo', () => {
  expect(
    fieldErrors([
      { path: ['moment', 'selectedOffset'], code: 'INVALID', message: 'Scegli una occorrenza' },
    ]),
  ).toEqual({ 'moment.selectedOffset': 'Scegli una occorrenza' })
})
