import { formatUtcInstant } from '../../api/date-display'
import { useNumericFormat } from '../../api/use-numeric-preference'
import { formatNumeric } from '../../api/numeric-input'
import type { NumericFormat } from '../../../../shared/contracts/numeric-preference'
import { useEffect, useState } from 'react'
import { Button, Group, Table } from '@mantine/core'
import type { ChangePreviewDto } from '../../../../shared/contracts/master-data'
import { StateMessage } from '../StateMessage'
const labels: Record<string, string> = {
  moment: 'Momento (UTC)',
  startedAt: 'Inizio (UTC)',
  endedAt: 'Fine (UTC)',
  calculatedBase: 'Base calcolata (EUR)',
  manualOverride: 'Sostituzione manuale (EUR)',
  effectiveBase: 'Base effettiva (EUR)',
  vesselVersionId: 'Versione nave',
  portVersionId: 'Versione porto',
  berthVersionId: 'Versione banchina',
  versionId: 'Versione applicata',
  vesselName: 'Nome nave',
  tariffId: 'Tariffa applicata',
  tariffEffectiveFrom: 'Decorrenza tariffa (UTC)',
  configurationId: 'Configurazione tariffaria',
  bracketId: 'Scaglione',
  upperLimit: 'Limite ordinario',
  ordinaryValue: 'Valore ordinario (EUR)',
  extraWidth: 'Ampiezza extra',
  extraValue: 'Valore extra (EUR)',
  extraCount: 'Numero extra',
  tariffValue: 'Valore tariffario (EUR)',
  weightSequenceId: 'Sequenza peso',
  weightVersionId: 'Versione peso',
  base: 'Base calcolata (EUR)',
  steps: 'Traccia di calcolo',
  description: 'Descrizione',
  weight: 'Peso',
  name: 'Nome',
  businessName: 'Ragione sociale',
  registeredName: 'Nome di registrazione',
  imoNumber: 'IMO',
  vesselTypeId: 'Tipologia nave',
  size: 'Dimensione',
  locality: 'Località',
  countryCode: 'Paese',
  effectiveMoment: 'Decorrenza locale, fuso e offset',
  configurations: 'Configurazioni tariffarie',
  calculation: 'Calcolo teorico e riferimenti',
  effectiveFrom: 'Inizio (UTC)',
  effectiveTo: 'Fine esclusa (UTC)',
  status: 'Stato',
  port: 'Porto',
  berth: 'Banchina',
  customerId: 'Cliente esplicito',
  agencyId: 'Agenzia esplicita',
  customer: 'Cliente effettivo e fonte',
  agency: 'Agenzia effettiva e fonte',
  vessel: 'Nave',
  selectable: 'Selezionabile',
}
export function displayPreviewValue(
  field: string,
  value: string | null,
  format: NumericFormat,
): string {
  if (value === null) return '—'
  if (
    [
      'arrival',
      'Arrivo',
      'moment',
      'startedAt',
      'endedAt',
      'effectiveFrom',
      'effectiveTo',
      'tariffEffectiveFrom',
    ].includes(field) &&
    /^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value)
  )
    return formatUtcInstant(value)
  const numericFields = [
    'size',
    'weight',
    'upperLimit',
    'ordinaryValue',
    'extraWidth',
    'extraValue',
    'extraCount',
    'tariffValue',
    'base',
    'calculatedBase',
    'manualOverride',
    'effectiveBase',
  ]
  if (numericFields.includes(field) && /^[0-9]+(?:\.[0-9]+)?$/.test(value))
    return formatNumeric(value, format)
  const values: Record<string, Record<string, string>> = {
    status: {
      ACTIVE: 'Attivo',
      INACTIVE: 'Disattivato',
      PLANNED: 'Prevista',
      PERFORMED: 'Effettuata',
      MISSED: 'Mancata',
    },
    Tipologia: { ENTRY: 'Entrata', EXIT: 'Uscita', MOVEMENT: 'Spostamento' },
    vesselTypeId: { STANDARD: 'Nave normale', PASSENGER: 'Nave passeggeri', ADM: 'Nave ADM' },
    selectable: { true: 'Sì', false: 'No' },
  }
  return values[field]?.[value] ?? value
}
export function PortConfirmation({
  preview,
  disabled,
  cancelDisabled = disabled,
  revision,
  onConfirm,
  onCancel,
  onPage,
}: {
  preview: ChangePreviewDto
  disabled: boolean
  cancelDisabled?: boolean
  revision: string
  onConfirm: () => void
  onCancel: () => void
  onPage: (page: number) => void
}) {
  const numericFormat = useNumericFormat()
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
        minWidth={0}
        className="preview-effects"
        tabIndex={0}
        aria-label="Effetti della modifica"
      >
        <Table striped withTableBorder style={{ tableLayout: 'fixed', width: '100%' }}>
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
                  <Table.Td title={change.before ?? undefined}>
                    {displayPreviewValue(change.field, change.before, numericFormat)}
                  </Table.Td>
                  <Table.Td title={change.after ?? undefined}>
                    {displayPreviewValue(change.field, change.after, numericFormat)}
                  </Table.Td>
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
        <Button variant="default" disabled={cancelDisabled} onClick={onCancel}>
          Chiudi anteprima
        </Button>
        <Button
          color={
            [
              'OPERATION_DELETE',
              'TARIFF_DELETE',
              'WEIGHT_DELETE',
              'DELETE_PORT',
              'DELETE_BERTH',
              'DELETE_CUSTOMER',
              'DELETE_AGENCY',
              'CATALOG_DELETE',
            ].includes(preview.operation) || preview.operation === 'DELETE_VERSION'
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
