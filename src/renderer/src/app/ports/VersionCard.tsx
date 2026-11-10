import { Badge, Button, Group } from '@mantine/core'
import type { VersionIntervalDto } from '../../../../shared/contracts/master-data'

export function VersionCard({
  version,
  description,
  disabled,
  onEdit,
  onDelete,
}: {
  version: VersionIntervalDto
  description: string
  disabled: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <article
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
        color={version.phase === 'CURRENT' ? 'teal' : version.phase === 'FUTURE' ? 'blue' : 'gray'}
      >
        {version.phase === 'CURRENT'
          ? 'In uso ora'
          : version.phase === 'FUTURE'
            ? 'Programmata'
            : 'Non più in uso'}
      </Badge>
      <p>{description}</p>

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
        <Button variant="light" disabled={disabled} onClick={onEdit}>
          Correggi versione
        </Button>
        <Button
          color="red"
          variant="subtle"
          disabled={disabled || version.effectiveFrom === null}
          onClick={onDelete}
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
  )
}
