import { expect, it } from 'vitest'
import { operationCreationOutcome } from '../../src/renderer/src/api/operation-creation-outcome'
import type { ApplicationResult } from '../../src/shared/contracts/application'
import type { VesselOperationDto } from '../../src/shared/contracts/operations'
const pending = {
  id: 'generato-in-anteprima',
  context: { archiveId: 'a', sessionId: 's', revision: '9007199254740993' },
}
const missing: ApplicationResult<VesselOperationDto> = {
  ok: false,
  context: pending.context,
  error: { code: 'NOT_FOUND', message: 'assente', fields: [], conflicts: [] },
}
it('assenza con revisione invariata consente il riesame; con revisione avanzata resta ignota', () => {
  expect(operationCreationOutcome(pending, missing)).toBe('UNCHANGED')
  expect(
    operationCreationOutcome(pending, {
      ...missing,
      context: { ...pending.context, revision: '9007199254740994' },
    }),
  ).toBe('UNKNOWN')
})
it('identità generata presente nella stessa sessione prova l’applicazione', () => {
  expect(
    operationCreationOutcome(pending, {
      ok: true,
      value: { id: pending.id } as VesselOperationDto,
      context: { ...pending.context, revision: '9007199254740994' },
    }),
  ).toBe('APPLIED')
})
it('risposte mancanti, sessioni, archivi, revisioni o identità discordanti non autorizzano nuove scritture', () => {
  for (const observed of [
    null,
    { ...missing, context: null },
    { ...missing, context: { ...pending.context, sessionId: 'nuova' } },
    { ...missing, context: { ...pending.context, archiveId: 'copia' } },
    { ...missing, context: { ...pending.context, revision: '8' } },
    {
      ok: true,
      value: { id: 'altro' } as VesselOperationDto,
      context: { ...pending.context, revision: '9007199254740994' },
    } as ApplicationResult<VesselOperationDto>,
  ])
    expect(operationCreationOutcome(pending, observed)).toBe('UNKNOWN')
})
