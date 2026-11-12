import { useState } from 'react'
import { Button, Group } from '@mantine/core'
import type { useArchives } from '../api/use-archives'
import { Catalog } from './Catalog'
import { Tariffs } from './tariffs/Tariffs'
export function CatalogPage(props: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const [section, setSection] = useState('CATALOG')
  return (
    <>
      <Group className="master-data-nav" gap="xs" aria-label="Sezioni catalogo">
        <Button
          variant={section === 'CATALOG' ? 'light' : 'subtle'}
          aria-pressed={section === 'CATALOG'}
          onClick={() => setSection('CATALOG')}
        >
          Tipi di prestazione e pesi
        </Button>
        <Button
          variant={section === 'TARIFFS' ? 'light' : 'subtle'}
          aria-pressed={section === 'TARIFFS'}
          onClick={() => setSection('TARIFFS')}
        >
          Tariffe
        </Button>
      </Group>
      {section === 'CATALOG' ? <Catalog {...props} /> : <Tariffs {...props} />}
    </>
  )
}
