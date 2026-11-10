import { Button, Group, Stack } from '@mantine/core'
import type { VersionDraft } from '../../api/use-ports'
import type { MomentResolutionDto } from '../../../../shared/contracts/values'
import { PortDescriptionFields } from './PortDescriptionFields'
import { VersionMomentFields } from './VersionMomentFields'
import { StateMessage } from '../StateMessage'
export function PortVersionForm({
  draft,
  onChange,
  fields,
  disabled,
  onPreview,
  onResolve,
  resolution,
  onCancel,
  revision,
}: {
  draft: VersionDraft
  onChange: (value: VersionDraft) => void
  fields: Record<string, string>
  disabled: boolean
  onPreview: () => void
  onResolve: () => void
  resolution: MomentResolutionDto | null
  onCancel: () => void
  revision: string
}) {
  return (
    <section aria-label="Editor versione">
      <p className="panel-description">
        {draft.versionId
          ? 'Correggi i dati della versione selezionata.'
          : 'Inserisci una nuova versione con la propria decorrenza.'}{' '}
        Controlla gli effetti nell’anteprima prima di confermare.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onPreview()
        }}
      >
        <Stack>
          <PortDescriptionFields
            value={draft.description}
            onChange={(description) => onChange({ ...draft, description })}
            fields={fields}
            disabled={disabled}
          />
          <VersionMomentFields
            moment={draft.moment}
            fields={fields}
            disabled={disabled}
            onResolve={onResolve}
            resolution={resolution}
            onChange={(moment) => onChange({ ...draft, moment })}
          />
          {draft.context.revision !== revision && (
            <StateMessage kind="warning" title="Bozza precedente ai dati attuali">
              La bozza usa una revisione precedente. Riapri la versione per ripartire dai dati
              aggiornati.
            </StateMessage>
          )}
          <Group className="form-actions">
            <Button variant="subtle" disabled={disabled} onClick={onCancel}>
              Annulla modifica
            </Button>
            <Button type="submit" disabled={disabled}>
              Anteprima versione
            </Button>
          </Group>
        </Stack>
      </form>
    </section>
  )
}
