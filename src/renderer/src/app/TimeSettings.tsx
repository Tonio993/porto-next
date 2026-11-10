import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button, Stack, TextInput } from '@mantine/core'
import type { ArchiveContextDto } from '../../../shared/contracts/application'
import type { CompanyTimeZoneDto, MomentResolutionDto } from '../../../shared/contracts/values'
import type { useArchives } from '../api/use-archives'
import { useApplicationRequest } from '../api/use-application-request'
import { MomentChoices } from './MomentChoices'

export function TimeSettings({ archives }: { archives: ReturnType<typeof useArchives> }) {
  const { state, execute, setError } = archives
  const [company, setCompany] = useState<CompanyTimeZoneDto | null>(null)
  const [draftContext, setDraftContext] = useState<ArchiveContextDto | null>(null)
  const [zoneId, setZoneId] = useState('Europe/Rome')
  const [local, setLocal] = useState('')
  const [resolution, setResolution] = useState<MomentResolutionDto | null>(null)
  const {
    request: loadRequest,
    invalidate: invalidateLoad,
    loading,
  } = useApplicationRequest(state.context, setError)
  const resolver = useApplicationRequest(state.context, setError)
  const command = useApplicationRequest(state.context, setError)
  const busy = archives.busy || archives.commandBusy || command.loading
  const sessionId = state.context!.sessionId
  const load = useCallback(async () => {
    setError(null)
    const result = await loadRequest(() =>
      window.time.getCompanyZone({ context: { sessionId }, query: null }),
    )
    if (result?.ok) {
      setCompany(result.value)
      setZoneId(result.value.zoneId)
      setDraftContext(result.context)
    }
  }, [loadRequest, sessionId, setError])
  useEffect(() => {
    void load()
  }, [load])
  async function configure(event: FormEvent) {
    event.preventDefault()
    if (!draftContext) return
    invalidateLoad()
    const result = await command.request(() =>
      execute(() =>
        window.time.configureCompanyZone({ context: draftContext, payload: { zoneId } }),
      ),
    )
    if (result?.ok) {
      setCompany(result.value)
      setZoneId(result.value.zoneId)
      setDraftContext(result.context)
    }
  }
  async function resolve(selectedOffset: string | null = null) {
    const result = await resolver.request(() =>
      window.time.resolveCompanyMoment({
        context: { sessionId },
        query: { localDateTime: local, selectedOffset },
      }),
    )
    if (result) setResolution(result.ok ? result.value : null)
  }
  return (
    <section className="archive-panel">
      <Stack gap="lg">
        <div>
          <h2>Fuso aziendale iniziale</h2>
          <p>
            Il fuso appartiene a questo archivio. Ogni porto avrà un proprio fuso, proposto a
            partire da quello aziendale.
          </p>
        </div>
        {company && !company.confirmed && (
          <form onSubmit={(event) => void configure(event)}>
            <Stack gap="sm" align="flex-start">
              <TextInput
                label="Fuso IANA aziendale"
                description="Per esempio Europe/Rome, Europe/London o Asia/Kathmandu."
                value={zoneId}
                onChange={(event) => setZoneId(event.currentTarget.value)}
                required
                disabled={busy || loading || resolver.loading}
                style={{ width: '100%' }}
              />
              <p>
                Dopo la conferma, le variazioni del fuso non saranno disponibili in questo rilascio.
              </p>
              <Button type="submit" disabled={busy}>
                Conferma fuso iniziale
              </Button>
              <Button variant="subtle" disabled={busy} onClick={() => void load()}>
                Ricarica configurazione
              </Button>
            </Stack>
          </form>
        )}
        {company?.confirmed && (
          <>
            <p role="status">
              Fuso aziendale confermato: <strong>{company.zoneId}</strong>
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void resolve()
              }}
            >
              <Stack gap="sm" align="flex-start">
                <h2>Verifica un orario aziendale</h2>
                <p>Controlla un orario senza registrare attività.</p>
                <TextInput
                  label="Data e ora locale"
                  type="datetime-local"
                  min="0001-01-01T00:00"
                  max="9999-12-31T23:59"
                  step={60}
                  value={local}
                  required
                  disabled={busy}
                  onChange={(event) => {
                    resolver.invalidate()
                    setLocal(event.currentTarget.value)
                    setResolution(null)
                  }}
                />
                <Button type="submit" disabled={busy}>
                  Verifica orario
                </Button>
              </Stack>
            </form>
            {resolution?.status === 'CHOICE_REQUIRED' && (
              <Stack gap="sm" align="flex-start">
                <p>Quest’ora si presenta due volte. Scegli l’occorrenza.</p>
                <MomentChoices
                  choices={resolution.choices}
                  disabled={busy}
                  onChoose={(choice) => void resolve(choice.offset)}
                />
              </Stack>
            )}
            {resolution?.status === 'RESOLVED' && (
              <div role="status">
                <p>Orario locale: {resolution.moment.localDateTime.replace('T', ' ')}</p>
                <p>
                  Fuso: {resolution.moment.zoneId} · Offset: {resolution.moment.offset}
                </p>
                <p>UTC: {resolution.moment.utc}</p>
              </div>
            )}
          </>
        )}
      </Stack>
    </section>
  )
}
