import { Button, Group, Stack } from '@mantine/core'
import type { PortHistoryDto, PortVersionDto } from '../../../../shared/contracts/ports'
import { VersionCard } from './VersionCard'
export function PortHistory({
  history,
  loading,
  disabled,
  onEdit,
  onDelete,
  onPage,
}: {
  history: PortHistoryDto
  loading: boolean
  disabled: boolean
  onEdit: (version: PortVersionDto) => void
  onDelete: (versionId: string) => void
  onPage: (page: number) => void
}) {
  const { versions } = history
  return (
    <section className="archive-panel" aria-label="Cronologia porto" aria-busy={loading}>
      <h2>Cronologia</h2>
      <p className="panel-description">
        Inizio incluso, fine esclusa. Le versioni future si applicano alla loro decorrenza.
      </p>
      <Stack>
        {versions.items.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            description={`${version.name} · ${version.locality} · ${version.countryCode}`}
            disabled={disabled}
            onEdit={() => onEdit(version)}
            onDelete={() => onDelete(version.id)}
          />
        ))}
      </Stack>
      <Group mt="sm">
        <Button
          variant="default"
          disabled={loading || disabled || versions.page <= 1}
          onClick={() => onPage(versions.page - 1)}
        >
          Versioni precedenti
        </Button>
        <span>
          Pagina {versions.page} · {versions.total} versioni
        </span>
        <Button
          variant="default"
          disabled={loading || disabled || versions.page * versions.pageSize >= versions.total}
          onClick={() => onPage(versions.page + 1)}
        >
          Altre versioni
        </Button>
      </Group>
    </section>
  )
}
