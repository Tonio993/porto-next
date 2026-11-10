import { Button, Group } from '@mantine/core'
import type { PortDto } from '../../../../shared/contracts/ports'
import { countryName } from './PortDescriptionFields'
export function PortDetail({
  port,
  disabled,
  onAdd,
  onDeactivate,
  onReactivate,
  onDelete,
}: {
  port: PortDto
  disabled: boolean
  onAdd: () => void
  onDeactivate: () => void
  onReactivate: () => void
  onDelete: () => void
}) {
  return (
    <section className="archive-panel" aria-label="Dettaglio porto">
      <h2>
        Porto {port.code} · {port.version.name}
      </h2>
      <p>
        Località: {port.version.locality} · Paese: {countryName(port.version.countryCode)} (
        {port.version.countryCode})
      </p>
      <p>Stato: {port.status === 'ACTIVE' ? 'Attivo' : 'Disattivato'}</p>
      <p>
        Versione applicabile:{' '}
        {port.version.effectiveFrom
          ? `dal ${port.version.effectiveFrom} (UTC)`
          : 'iniziale, senza limite temporale inferiore'}
        .
      </p>
      <p>
        Fuso iniziale del porto: <strong>{port.initialZoneId}</strong>
      </p>
      <Group>
        <Button disabled={disabled} onClick={onAdd}>
          Nuova versione
        </Button>
        {port.status === 'ACTIVE' ? (
          <Button variant="default" disabled={disabled} onClick={onDeactivate}>
            Disattiva porto
          </Button>
        ) : (
          <Button variant="default" disabled={disabled} onClick={onReactivate}>
            Riattiva porto
          </Button>
        )}
        <Button color="red" variant="light" disabled={disabled} onClick={onDelete}>
          Elimina porto
        </Button>
      </Group>
    </section>
  )
}
