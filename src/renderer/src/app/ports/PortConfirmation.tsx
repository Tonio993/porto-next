import { useEffect, useState } from 'react'
import { Button, Group, Table } from '@mantine/core'
import type { PortPreviewDto } from '../../../../shared/contracts/ports'
import { StateMessage } from '../StateMessage'
const labels: Record<string, string> = {
  name: 'Nome',
  locality: 'Località',
  countryCode: 'Paese',
  effectiveFrom: 'Inizio (UTC)',
  effectiveTo: 'Fine esclusa (UTC)',
  status: 'Stato',
  port: 'Porto',
}
export function PortConfirmation({
  preview,
  disabled,
  revision,
  onConfirm,
  onCancel,
  onPage,
}: {
  preview: PortPreviewDto
  disabled: boolean
  revision: string
  onConfirm: () => void
  onCancel: () => void
  onPage: (page: number) => void
}) {
  const [expired, setExpired] = useState(Date.now() >= Date.parse(preview.expiresAtUtc))
  useEffect(() => {
    const delay = Date.parse(preview.expiresAtUtc) - Date.now()
    setExpired(delay <= 0)
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, delay))
    return () => window.clearTimeout(timer)
  }, [preview.previewId, preview.expiresAtUtc])
  const obsolete = revision !== preview.context.revision
  return (
    <section aria-label="Anteprima modifica">
      <StateMessage
        kind={obsolete || expired ? 'warning' : preview.status === 'READY' ? 'success' : 'error'}
        title={
          obsolete
            ? 'Anteprima obsoleta'
            : expired
              ? 'Anteprima scaduta'
              : preview.status === 'READY'
                ? 'Operazione consentita'
                : 'Operazione bloccata'
        }
      >
        {obsolete
          ? 'I dati sono cambiati. Genera una nuova anteprima.'
          : expired
            ? 'Anteprima scaduta. Generane una nuova.'
            : preview.status === 'READY'
              ? 'Controlla gli effetti prima di confermare.'
              : 'Risolvi i blocchi prima di procedere.'}
      </StateMessage>
      <p>
        {preview.summary.created} creazioni, {preview.summary.updated} aggiornamenti,{' '}
        {preview.summary.deleted} eliminazioni.
      </p>
      <p>
        Riattribuzioni: {preview.summary.reattributed} · Ricalcoli: {preview.summary.recalculated}
      </p>
      {preview.warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
      {preview.blockers.map((blocker, index) => (
        <p role="alert" key={index}>
          {blocker.reference.label}: {blocker.reason}
        </p>
      ))}
      <Table.ScrollContainer
        type="native"
        minWidth={500}
        className="preview-effects"
        tabIndex={0}
        aria-label="Effetti della modifica"
      >
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Elemento</Table.Th>
              <Table.Th>Dato</Table.Th>
              <Table.Th>Prima</Table.Th>
              <Table.Th>Dopo</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {preview.effects.items.flatMap((effect, index) =>
              effect.changes.map((change) => (
                <Table.Tr key={`${index}-${change.field}`}>
                  <Table.Td>
                    {effect.reference.label} (
                    {effect.action === 'CREATE'
                      ? 'creazione'
                      : effect.action === 'DELETE'
                        ? 'eliminazione'
                        : 'aggiornamento'}
                    )
                  </Table.Td>
                  <Table.Td>{labels[change.field] ?? change.field}</Table.Td>
                  <Table.Td>{change.before ?? '—'}</Table.Td>
                  <Table.Td>{change.after ?? '—'}</Table.Td>
                </Table.Tr>
              )),
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Group mt="sm">
        <Button
          variant="default"
          disabled={disabled || preview.effects.page <= 1}
          onClick={() => onPage(preview.effects.page - 1)}
        >
          Effetti precedenti
        </Button>
        <span>
          {preview.effects.total} effetti · pagina {preview.effects.page}
        </span>
        <Button
          variant="default"
          disabled={
            disabled || preview.effects.page * preview.effects.pageSize >= preview.effects.total
          }
          onClick={() => onPage(preview.effects.page + 1)}
        >
          Altri effetti
        </Button>
      </Group>
      <Group mt="md" className="form-actions">
        <Button variant="default" disabled={disabled} onClick={onCancel}>
          Chiudi anteprima
        </Button>
        <Button
          color={
            preview.operation === 'DELETE_PORT' || preview.operation === 'DELETE_VERSION'
              ? 'red'
              : undefined
          }
          disabled={disabled || expired || obsolete || preview.status !== 'READY'}
          onClick={onConfirm}
        >
          Conferma modifica
        </Button>
      </Group>
    </section>
  )
}
