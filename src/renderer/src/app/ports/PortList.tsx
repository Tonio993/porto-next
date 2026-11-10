import { Button, Group, TextInput } from '@mantine/core'
import { IconPlus, IconSearch } from '@tabler/icons-react'
import type { PortPageDto } from '../../../../shared/contracts/ports'
import { countryName } from './PortDescriptionFields'
export function PortList({
  page,
  search,
  onSearch,
  onSelect,
  onPage,
  loading,
  disabled,
  selected,
  onCreate,
}: {
  page: PortPageDto | null
  search: string
  onSearch: (search: string) => void
  onSelect: (id: string) => void
  onPage: (page: number) => void
  loading: boolean
  disabled: boolean
  selected: string | null
  onCreate: () => void
}) {
  return (
    <section className="archive-panel port-list" aria-label="Elenco porti" aria-busy={loading}>
      <Group justify="space-between" className="port-list-heading">
        <h2>Porti</h2>
        <Button
          size="compact-sm"
          leftSection={<IconPlus size={16} />}
          disabled={disabled}
          onClick={onCreate}
        >
          Nuovo porto
        </Button>
      </Group>
      <TextInput
        label="Cerca porto"
        description="Nome, località o paese, anche storici."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => onSearch(event.currentTarget.value)}
      />
      <div className="list-summary" role="status">
        {loading
          ? 'Caricamento porti…'
          : page
            ? `${page.total} ${page.total === 1 ? 'porto' : 'porti'}`
            : 'Elenco non disponibile.'}
      </div>
      <div className="port-list-results">
        {page?.items.map((port) => (
          <button
            key={port.id}
            className="port-list-item"
            aria-label={`Apri porto ${port.code}`}
            aria-pressed={port.id === selected}
            disabled={disabled || loading}
            onClick={() => onSelect(port.id)}
          >
            <span className="port-item-code">
              Porto {port.code} · {port.status === 'ACTIVE' ? 'Attivo' : 'Disattivato'}
            </span>
            <strong>{port.version.name}</strong>
            <span>
              {port.version.locality} · {countryName(port.version.countryCode)}
            </span>
            {port.id === selected && <span className="selection-label">Selezionato</span>}
          </button>
        ))}
        {page && !page.total && !loading && (
          <div className="list-empty">
            <strong>Nessun porto trovato.</strong>
            <p>
              {search
                ? 'Prova un altro nome, località o paese.'
                : 'Aggiungi il primo porto con «Nuovo porto».'}
            </p>
          </div>
        )}
      </div>
      {page && (
        <Group className="list-pagination" gap="xs" justify="space-between">
          <Button
            size="compact-xs"
            variant="default"
            disabled={disabled || loading || page.page <= 1}
            onClick={() => onPage(page.page - 1)}
          >
            Precedente
          </Button>
          <span>Pagina {page.page}</span>
          <Button
            size="compact-xs"
            variant="default"
            disabled={disabled || loading || page.page * page.pageSize >= page.total}
            onClick={() => onPage(page.page + 1)}
          >
            Successiva
          </Button>
        </Group>
      )}
    </section>
  )
}
