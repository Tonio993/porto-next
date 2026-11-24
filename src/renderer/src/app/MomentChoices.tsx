import { historicalMomentDetail } from '../api/date-display'
import { Button, Group } from '@mantine/core'
import type { ResolvedMomentDto } from '../../../shared/contracts/values'

export function MomentChoices({
  choices,
  disabled,
  onChoose,
}: {
  choices: readonly ResolvedMomentDto[]
  disabled: boolean
  onChoose: (choice: ResolvedMomentDto) => void
}) {
  return (
    <Group>
      {choices.map((choice, index) => (
        <Button
          title={historicalMomentDetail(choice)}
          key={choice.utc}
          variant="light"
          disabled={disabled}
          onClick={() => onChoose(choice)}
        >
          {index === 0 ? 'Prima' : 'Seconda'} occorrenza ({choice.offset})
        </Button>
      ))}
    </Group>
  )
}
