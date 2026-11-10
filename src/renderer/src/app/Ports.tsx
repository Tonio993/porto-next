import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button, Group, Select, Stack, Table, TextInput } from '@mantine/core'
import type { ArchiveContextDto, ApplicationResult } from '../../../shared/contracts/application'
import type { CreatePortDto, PortDto, PortPageDto } from '../../../shared/contracts/ports'
import { countryCodes } from '../../../shared/contracts/countries'
import type { useArchives } from '../api/use-archives'

const names = new Intl.DisplayNames(['it'], { type: 'region' })
const countries = countryCodes
  .map((value) => ({ value, label: `${names.of(value)} (${value})` }))
  .sort((a, b) => a.label.localeCompare(b.label, 'it'))
const empty = { name: '', locality: '', countryCode: 'IT', initialZoneId: 'Europe/Rome' }

export function Ports({ archives }: { archives: ReturnType<typeof useArchives> }) {
  const { state, busy, run, update, setError, setNotice } = archives
  const [draft, setDraft] = useState<CreatePortDto>(empty)
  const [draftContext, setDraftContext] = useState<ArchiveContextDto | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [page, setPage] = useState<PortPageDto | null>(null)
  const [detail, setDetail] = useState<PortDto | null>(null)
  const [search, setSearch] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const alive = useRef(false)
  const lists = useRef(0)
  const details = useRef(0)
  const latestContext = useRef(state.context!)
  latestContext.current = state.context!
  const sessionId = state.context!.sessionId

  const accepted = useCallback(<T,>(result: ApplicationResult<T>) => {
    if (!alive.current) return false
    if (
      result.context &&
      (result.context.sessionId !== latestContext.current.sessionId ||
        BigInt(result.context.revision) < BigInt(latestContext.current.revision))
    )
      return false
    return true
  }, [])

  const load = useCallback(async () => {
    const sequence = ++lists.current
    try {
      const result = await window.ports.list({
        context: { sessionId },
        query: { page: pageNumber, pageSize: 25, search },
      })
      if (!accepted(result) || sequence !== lists.current) return
      if (result.ok) setPage(result.value)
      else setError(result.error.message)
    } catch {
      if (alive.current && sequence === lists.current)
        setError('Non è stato possibile leggere i porti.')
    }
  }, [accepted, sessionId, pageNumber, search, setError])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      ++lists.current
      ++details.current
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, state.context?.revision])

  useEffect(() => {
    let current = true
    void window.time
      .getCompanyZone({ context: { sessionId }, query: null })
      .then((result) => {
        if (!current || !accepted(result)) return
        if (result.ok) {
          setDraft((value) => ({ ...value, initialZoneId: result.value.zoneId }))
          setDraftContext(result.context)
        } else setError(result.error.message)
      })
      .catch(() => {
        if (current) setError('Non è stato possibile leggere il fuso proposto.')
      })
    return () => {
      current = false
    }
  }, [accepted, sessionId, setError])

  async function create(event: FormEvent) {
    event.preventDefault()
    if (!draftContext) return
    setFields({})
    ++lists.current
    ++details.current
    const value = await run(async () => {
      const result = await window.ports.create({ context: draftContext, payload: draft })
      if (accepted(result)) {
        if (!result.ok)
          setFields(
            Object.fromEntries(
              result.error.fields.map((issue) => [issue.path.join('.'), issue.message]),
            ),
          )
        else setDraftContext(result.context)
      }
      return result
    })
    if (!alive.current || !value) return
    setDetail(value)
    setDraft({ ...empty, initialZoneId: draft.initialZoneId })
    await update(() => window.archives.getState())
    if (!alive.current) return
    setNotice(`Porto ${value.code} creato.`)
    await load()
  }

  async function open(id: string) {
    const sequence = ++details.current
    const value = await run(() => window.ports.get({ context: { sessionId }, query: { id } }))
    if (alive.current && sequence === details.current) setDetail(value)
  }

  async function reload() {
    const next = await update(() => window.archives.getState())
    if (!alive.current || !next?.context || next.context.sessionId !== sessionId) return
    setDraftContext(next.context)
    setFields({})
    await load()
  }

  return (
    <Stack gap="lg">
      <section className="archive-panel">
        <h2>Porti</h2>
        <p>
          Crea e consulta i porti di questo archivio. Banchine, clienti, agenzie e navi saranno
          disponibili nei prossimi incrementi.
        </p>
        <TextInput
          label="Cerca porto"
          description="Nome, località o codice paese."
          value={search}
          onChange={(event) => {
            ++lists.current
            setSearch(event.currentTarget.value)
            setPageNumber(1)
          }}
        />
        {page && (
          <>
            <p>{page.total} porti</p>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Codice</Table.Th>
                  <Table.Th>Nome</Table.Th>
                  <Table.Th>Località</Table.Th>
                  <Table.Th>Paese</Table.Th>
                  <Table.Th>Stato</Table.Th>
                  <Table.Th>Dettaglio</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {page.items.map((port) => (
                  <Table.Tr key={port.id}>
                    <Table.Td>{port.code}</Table.Td>
                    <Table.Td>{port.version.name}</Table.Td>
                    <Table.Td>{port.version.locality}</Table.Td>
                    <Table.Td>{names.of(port.version.countryCode)}</Table.Td>
                    <Table.Td>{port.status === 'ACTIVE' ? 'Attivo' : 'Disattivato'}</Table.Td>
                    <Table.Td>
                      <Button
                        variant="subtle"
                        disabled={busy}
                        onClick={() => void open(port.id)}
                        aria-label={`Apri porto ${port.code}`}
                      >
                        Apri
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {page.total === 0 && <p>Nessun porto trovato.</p>}
            <Group mt="sm">
              <Button
                variant="default"
                disabled={busy || pageNumber <= 1}
                onClick={() => setPageNumber(pageNumber - 1)}
              >
                Precedente
              </Button>
              <span>Pagina {pageNumber}</span>
              <Button
                variant="default"
                disabled={busy || pageNumber * 25 >= page.total}
                onClick={() => setPageNumber(pageNumber + 1)}
              >
                Successiva
              </Button>
            </Group>
          </>
        )}
      </section>
      {detail && (
        <section className="archive-panel" aria-label="Dettaglio porto">
          <h2>
            Porto {detail.code} · {detail.version.name}
          </h2>
          <p>
            Località: {detail.version.locality} · Paese: {names.of(detail.version.countryCode)} (
            {detail.version.countryCode})
          </p>
          <p>Stato: {detail.status === 'ACTIVE' ? 'Attivo' : 'Disattivato'}</p>
          <p>Versione applicabile: iniziale, senza limite temporale inferiore o finale.</p>
          <p>
            Fuso iniziale del porto: <strong>{detail.initialZoneId}</strong>
          </p>
          <p>
            Modifiche, cronologia e gestione dello stato saranno disponibili nel prossimo
            incremento.
          </p>
        </section>
      )}
      <section className="archive-panel">
        <h2>Nuovo porto</h2>
        <form onSubmit={(event) => void create(event)}>
          <Stack gap="sm">
            <TextInput
              label="Nome del porto"
              required
              disabled={busy}
              value={draft.name}
              error={fields.name}
              onChange={(event) => setDraft({ ...draft, name: event.currentTarget.value })}
            />
            <TextInput
              label="Località"
              required
              disabled={busy}
              value={draft.locality}
              error={fields.locality}
              onChange={(event) => setDraft({ ...draft, locality: event.currentTarget.value })}
            />
            <Select
              label="Paese"
              searchable
              required
              disabled={busy}
              data={countries}
              value={draft.countryCode}
              error={fields.countryCode}
              onChange={(value) => setDraft({ ...draft, countryCode: value ?? '' })}
            />
            <TextInput
              label="Fuso IANA del porto"
              required
              disabled={busy || !draftContext}
              description="Proposto dal fuso aziendale, per esempio Europe/Rome. Rimane autonomo dopo la creazione."
              value={draft.initialZoneId}
              error={fields.initialZoneId}
              onChange={(event) => setDraft({ ...draft, initialZoneId: event.currentTarget.value })}
            />
            <Group>
              <Button type="submit" disabled={busy || !draftContext}>
                Crea porto
              </Button>
              <Button variant="default" disabled={busy} onClick={() => void reload()}>
                Ricarica dati
              </Button>
            </Group>
            {draftContext?.revision !== state.context?.revision && (
              <p>I dati dell’archivio sono cambiati. Ricarica i dati prima di salvare.</p>
            )}
          </Stack>
        </form>
      </section>
    </Stack>
  )
}
