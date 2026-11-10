import { Button, Group, Stack, TextInput } from '@mantine/core'
import type { VersionDraft } from '../../api/use-ports'
import type { MomentResolutionDto } from '../../../../shared/contracts/values'
import { PortDescriptionFields } from './PortDescriptionFields'
import { MomentChoices } from '../MomentChoices'
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
    <section className="archive-panel" aria-label="Editor versione">
      <h2>{draft.versionId ? 'Correggi versione' : 'Inserisci versione'}</h2>
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
          {draft.moment ? (
            <>
              <TextInput
                label="Decorrenza locale"
                type="datetime-local"
                min="0001-01-01T00:00"
                max="9999-12-31T23:59"
                step={60}
                required
                disabled={disabled}
                value={draft.moment.localDateTime}
                error={fields.moment ?? fields.localDateTime}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    moment: { localDateTime: event.currentTarget.value, selectedOffset: null },
                  })
                }
              />
              <Button
                variant="default"
                disabled={disabled || !draft.moment.localDateTime}
                onClick={onResolve}
              >
                Verifica decorrenza
              </Button>
              {resolution?.status === 'CHOICE_REQUIRED' && (
                <>
                  <p>Scegli l’occorrenza della decorrenza.</p>
                  <MomentChoices
                    choices={resolution.choices}
                    disabled={disabled}
                    onChoose={(choice) =>
                      onChange({
                        ...draft,
                        moment: {
                          localDateTime: choice.localDateTime,
                          selectedOffset: choice.offset,
                        },
                      })
                    }
                  />
                </>
              )}
              {draft.moment.selectedOffset && <p>Offset scelto: {draft.moment.selectedOffset}</p>}
            </>
          ) : (
            <p>Versione iniziale: la decorrenza rimane assente.</p>
          )}
          {draft.context.revision !== revision && (
            <p role="status">
              La bozza usa una revisione precedente. Riapri la versione per ripartire dai dati
              aggiornati.
            </p>
          )}
          <Group>
            <Button type="submit" disabled={disabled}>
              Anteprima versione
            </Button>
            <Button variant="subtle" disabled={disabled} onClick={onCancel}>
              Annulla modifica
            </Button>
          </Group>
        </Stack>
      </form>
    </section>
  )
}
