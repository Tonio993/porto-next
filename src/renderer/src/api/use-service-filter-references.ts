import { useEffect, useState } from 'react'
import type { ArchiveContextDto, ApplicationResult } from '../../../shared/contracts/application'
import type { ServiceListQuery } from '../../../shared/contracts/services'
import type { VoyageDto } from '../../../shared/contracts/operations'
import { useApplicationRequest } from './use-application-request'

type Filters = Omit<ServiceListQuery, 'vesselId' | 'page' | 'pageSize'>

// Resolve references independently of the visible options page. Never infer deletion from a list.
export function useServiceFilterReferences(
  context: ArchiveContextDto,
  vesselId: string | null,
  filters: Filters,
  revalidate: (patch: Partial<Filters>) => void,
) {
  const [voyage, setVoyage] = useState<VoyageDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { request, invalidate } = useApplicationRequest(context, setError)
  useEffect(() => {
    let current = true
    setVoyage(null)
    setError(null)
    void request(
      async (): Promise<
        ApplicationResult<{ patch: Partial<Filters>; voyage: VoyageDto | null }>
      > => {
        const patch: Partial<Filters> = {}
        const readContext = { sessionId: context.sessionId }
        const references = [
          ['portId', window.ports],
          [
            'berthId',
            {
              get: (request: Parameters<typeof window.ports.get>[0]) =>
                window.berths.history({
                  ...request,
                  query: { ...request.query, page: 1, pageSize: 1 },
                }),
            },
          ],
          ['customerId', window.customers],
          ['agencyId', window.agencies],
          ['serviceTypeId', window.catalog],
        ] as const
        for (const [field, api] of references) {
          const id = filters[field]
          if (!id) continue
          const result = await api.get({ context: readContext, query: { id } })
          if (!result.ok && result.error.code !== 'NOT_FOUND') return result
          if (!current || result.context?.revision !== context.revision)
            return {
              ok: true,
              context: result.context ?? context,
              value: { patch: {}, voyage: null },
            }
          if (!result.ok) {
            patch[field] = null
            if (field === 'portId') patch.berthId = null
          }
        }
        let found: VoyageDto | null = null
        if (vesselId && filters.voyageId) {
          for (let page = 1; current; page++) {
            const result = await window.operations.stays({
              context: readContext,
              query: { vesselId, page, pageSize: 100 },
            })
            if (!result.ok) return result
            if (!current || result.context?.revision !== context.revision)
              return {
                ok: true,
                context: result.context ?? context,
                value: { patch: {}, voyage: null },
              }
            found = result.value.items.find((v) => v.id === filters.voyageId) ?? null
            if (found || page * 100 >= result.value.total) break
          }
          if (!found) Object.assign(patch, { voyageId: null, portCallId: null, berthStayId: null })
          else {
            const visit = found.visits.find((v) => v.id === filters.portCallId)
            if (filters.portCallId && !visit)
              Object.assign(patch, { portCallId: null, berthStayId: null })
            else if (filters.berthStayId && !visit?.stays.some((s) => s.id === filters.berthStayId))
              patch.berthStayId = null
          }
        }
        return { ok: true, context, value: { patch, voyage: found } }
      },
    ).then((result) => {
      if (!current || !result?.ok || result.context.revision !== context.revision) return
      setVoyage(result.value.voyage)
      if (Object.keys(result.value.patch).length) revalidate(result.value.patch)
    })
    return () => {
      current = false
      invalidate()
    }
  }, [request, invalidate, context.sessionId, context.revision, vesselId, filters])
  return { voyage, error }
}
