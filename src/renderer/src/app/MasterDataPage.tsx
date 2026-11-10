import { Button, Group, Stack } from '@mantine/core'
import type { useArchives } from '../api/use-archives'
import { Ports } from './Ports'

export function MasterDataPage({ archives }: { archives: ReturnType<typeof useArchives> }) {
  return (
    <Stack>
      <Group aria-label="Tipologie anagrafiche">
        <Button variant="light" aria-pressed>
          Porti
        </Button>
        {['Banchine', 'Clienti', 'Agenzie', 'Navi'].map((name) => (
          <Button key={name} variant="default" disabled>
            {name}
          </Button>
        ))}
      </Group>
      <Ports archives={archives} />
    </Stack>
  )
}
