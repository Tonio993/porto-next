import { Badge, Button, Group, Stack } from '@mantine/core'
import type { PortHistoryDto, PortVersionDto } from '../../../../shared/contracts/ports'
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
          <article
            key={version.id}
            className="port-version"
            data-phase={version.phase}
            aria-label={`Versione ${version.effectiveFrom ?? 'iniziale'}`}
          >
            <h3>
              {version.effectiveFrom === null ? 'Versione iniziale' : 'Versione con decorrenza'} ·{' '}
              {version.phase === 'CURRENT'
                ? 'Corrente'
                : version.phase === 'FUTURE'
                  ? 'Futura'
                  : 'Storica'}
            </h3>
            <Badge
              variant="outline"
              color={
                version.phase === 'CURRENT' ? 'teal' : version.phase === 'FUTURE' ? 'blue' : 'gray'
              }
            >
              {version.phase === 'CURRENT'
                ? 'In uso ora'
                : version.phase === 'FUTURE'
                  ? 'Programmata'
                  : 'Non più in uso'}
            </Badge>
            <p>
              {version.name} · {version.locality} · {version.countryCode}
            </p>
            <p>
              {version.effectiveMoment
                ? `Dal ${version.effectiveMoment.localDateTime.replace('T', ' ')} · ${version.effectiveMoment.zoneId} · offset ${version.effectiveMoment.offset} · UTC ${version.effectiveFrom}`
                : 'Da sempre (nessun limite inferiore)'}
            </p>
            <p>
              {version.effectiveTo
                ? `Fino a ${version.effectiveTo} UTC (escluso)`
                : 'Senza limite finale'}
            </p>
            <Group gap="xs">
              <Button variant="light" disabled={disabled} onClick={() => onEdit(version)}>
                Correggi versione
              </Button>
              <Button
                color="red"
                variant="subtle"
                disabled={disabled || version.effectiveFrom === null}
                onClick={() => onDelete(version.id)}
              >
                Elimina versione
              </Button>
            </Group>
            {version.effectiveFrom === null && (
              <p className="panel-description">
                La versione iniziale può essere corretta, ma non eliminata.
              </p>
            )}
          </article>
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
