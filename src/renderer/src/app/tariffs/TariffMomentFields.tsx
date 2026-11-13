import { Button, Group, Stack, TextInput } from '@mantine/core'
import type { MomentInputDto, MomentResolutionDto } from '../../../../shared/contracts/values'
import { MomentChoices } from '../MomentChoices'
export const emptyMoment = (): MomentInputDto => ({ localDateTime: '', selectedOffset: null })
export function TariffMomentFields({
  moment,
  onChange,
  resolution,
  onResolve,
  disabled,
  economic = false,
  label,
  resolveLabel,
}: {
  moment: MomentInputDto
  onChange: (value: MomentInputDto) => void
  resolution: MomentResolutionDto | null
  onResolve: () => void
  disabled: boolean
  economic?: boolean
  label?: string
  resolveLabel?: string
}) {
  return (
    <Stack gap="xs">
      <TextInput
        data-autofocus
        type="datetime-local"
        label={label ?? (economic ? 'Momento economico locale' : 'Decorrenza locale')}
        min="0001-01-01T00:00"
        max="9999-12-31T23:59"
        step={60}
        required
        value={moment.localDateTime}
        disabled={disabled}
        onChange={(e) => onChange({ localDateTime: e.currentTarget.value, selectedOffset: null })}
      />
      <Group>
        <Button variant="default" disabled={disabled || !moment.localDateTime} onClick={onResolve}>
          {resolveLabel ?? (economic ? 'Verifica momento' : 'Verifica decorrenza')}
        </Button>
      </Group>
      {resolution?.status === 'CHOICE_REQUIRED' && (
        <>
          <p>Scegli l’occorrenza dell’orario.</p>
          <MomentChoices
            choices={resolution.choices}
            disabled={disabled}
            onChoose={(c) => onChange({ localDateTime: c.localDateTime, selectedOffset: c.offset })}
          />
        </>
      )}
      {moment.selectedOffset && <p>Offset scelto: {moment.selectedOffset}</p>}
      {resolution?.status === 'RESOLVED' && (
        <p className="tariff-long-value">
          Fuso {resolution.moment.zoneId} · offset {resolution.moment.offset} · UTC{' '}
          {resolution.moment.utc}
        </p>
      )}
    </Stack>
  )
}
