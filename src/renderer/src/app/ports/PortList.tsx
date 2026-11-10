import { Button, Group, Table, TextInput } from '@mantine/core'
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
}: {
  page: PortPageDto | null
  search: string
  onSearch: (search: string) => void
  onSelect: (id: string) => void
  onPage: (page: number) => void
  loading: boolean
  disabled: boolean
  selected: string | null
}) {
  return (
    <section className="archive-panel" aria-busy={loading}>
      <h2>Porti</h2>
      <TextInput
        label="Cerca porto"
        description="Nome, località o codice paese, anche storici."
        value={search}
        onChange={(event) => onSearch(event.currentTarget.value)}
      />
      {loading && <p role="status">Caricamento porti…</p>}
      {page && (
        <>
          <p>
            {page.total} {page.total === 1 ? 'porto' : 'porti'}
          </p>
          <Table.ScrollContainer minWidth={600}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  {['Codice', 'Nome', 'Località', 'Paese', 'Stato', 'Dettaglio'].map((title) => (
                    <Table.Th key={title}>{title}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {page.items.map((port) => (
                  <Table.Tr key={port.id} data-selected={port.id === selected || undefined}>
                    <Table.Td>{port.code}</Table.Td>
                    <Table.Td>{port.version.name}</Table.Td>
                    <Table.Td>{port.version.locality}</Table.Td>
                    <Table.Td>{countryName(port.version.countryCode)}</Table.Td>
                    <Table.Td>{port.status === 'ACTIVE' ? 'Attivo' : 'Disattivato'}</Table.Td>
                    <Table.Td>
                      <Button
                        variant="subtle"
                        disabled={disabled}
                        onClick={() => onSelect(port.id)}
                        aria-label={`Apri porto ${port.code}`}
                      >
                        Apri
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {!page.total && <p>Nessun porto trovato.</p>}
          <Group mt="sm">
            <Button
              variant="default"
              disabled={disabled || loading || page.page <= 1}
              onClick={() => onPage(page.page - 1)}
            >
              Precedente
            </Button>
            <span>Pagina {page.page}</span>
            <Button
              variant="default"
              disabled={disabled || loading || page.page * page.pageSize >= page.total}
              onClick={() => onPage(page.page + 1)}
            >
              Successiva
            </Button>
          </Group>
        </>
      )}
    </section>
  )
}
