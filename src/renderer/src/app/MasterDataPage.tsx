import { Button, Group, Stack } from '@mantine/core'
import type { useArchives } from '../api/use-archives'
import { Ports } from './Ports'
import { useCallback, useState } from 'react'
import { Customers } from './customers/Customers'
import { Agencies } from './agencies/Agencies'

export function MasterDataPage({
  archives,
  onDialogChange,
}: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (opened: boolean) => void
}) {
  const [section, setSection] = useState('Porti')
  const [dialogOpened, setDialogOpened] = useState(false)
  const dialogChange = useCallback(
    (opened: boolean) => {
      setDialogOpened(opened)
      onDialogChange(opened)
    },
    [onDialogChange],
  )
  return (
    <Stack>
      <Group aria-label="Tipologie anagrafiche" className="master-data-nav" gap="xs">
        {['Porti', 'Clienti', 'Agenzie', 'Navi'].map((name) => (
          <Button
            key={name}
            variant={section === name ? 'light' : 'default'}
            aria-pressed={section === name}
            disabled={name === 'Navi' || dialogOpened}
            onClick={() => setSection(name)}
          >
            {name}
          </Button>
        ))}
      </Group>
      {section === 'Porti' && <Ports archives={archives} onDialogChange={dialogChange} />}
      {section === 'Clienti' && <Customers archives={archives} onDialogChange={dialogChange} />}
      {section === 'Agenzie' && <Agencies archives={archives} onDialogChange={dialogChange} />}
    </Stack>
  )
}
