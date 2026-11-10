import { Button, TextInput } from '@mantine/core'
import type { MomentInputDto, MomentResolutionDto } from '../../../../shared/contracts/values'
import { MomentChoices } from '../MomentChoices'

export function VersionMomentFields({
  moment,
  fields,
  disabled,
  onResolve,
  resolution,
  onChange,
}: {
  moment: MomentInputDto | null
  fields: Record<string, string>
  disabled: boolean
  onResolve: () => void
  resolution: MomentResolutionDto | null
  onChange: (moment: MomentInputDto) => void
}) {
  return moment ? (
    <>
      <TextInput
        label="Decorrenza locale"
        type="datetime-local"
        min="0001-01-01T00:00"
        max="9999-12-31T23:59"
        step={60}
        required
        disabled={disabled}
        value={moment.localDateTime}
        error={fields.moment ?? fields.localDateTime}
        onChange={(event) =>
          onChange({ localDateTime: event.currentTarget.value, selectedOffset: null })
        }
      />
      <Button variant="default" disabled={disabled || !moment.localDateTime} onClick={onResolve}>
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
                localDateTime: choice.localDateTime,
                selectedOffset: choice.offset,
              })
            }
          />
        </>
      )}
      {moment.selectedOffset && <p>Offset scelto: {moment.selectedOffset}</p>}
    </>
  ) : (
    <p>Versione iniziale: la decorrenza rimane assente.</p>
  )
}
