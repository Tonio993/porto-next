import { expect, it } from 'vitest'
import { PreviewStore } from '../../src/backend/application/previews/preview-store'
it('limita a 32 anteprime, rimuove scadute, consuma e protegge copie e operazione', () => {
  let now = 0
  const store = new PreviewStore(() => now)
  const context = { archiveId: 'A', sessionId: 'one', revision: '1' }
  const input = { name: 'Originale' }
  const first = store.put('EDIT', context, input)
  input.name = 'Alterato'
  expect(store.get(first.previewId, 'EDIT', context).input).toEqual({ name: 'Originale' })
  for (let index = 0; index < 32; ++index) store.put('EDIT', context, {})
  expect(() => store.get(first.previewId, 'EDIT', context)).toThrow()
  const last = store.put('EDIT', context, {})
  expect(() => store.get(last.previewId, 'DELETE', context)).toThrow()
  expect(store.get(last.previewId, 'EDIT', context)).toBeDefined()
  expect(() => store.get(last.previewId, 'EDIT', { ...context, revision: '2' })).toThrow()
  now = 15 * 60_000
  expect(() => store.get(last.previewId, 'EDIT', context)).toThrow()
  const current = store.put('EDIT', context, {})
  store.consume(current.previewId)
  expect(() => store.get(current.previewId, 'EDIT', context)).toThrow()
})
