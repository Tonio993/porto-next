import { useConsultationState } from '../api/use-consultation-state'
import { useDraftProtection } from './DraftProtection'
import { Button, Group } from '@mantine/core'
import type { useArchives } from '../api/use-archives'
import { Catalog } from './Catalog'
import { Tariffs } from './tariffs/Tariffs'
export function CatalogPage(props: {
  archives: ReturnType<typeof useArchives>
  onDialogChange: (open: boolean) => void
}) {
  const guard = useDraftProtection()
  const [section, setSection] = useConsultationState('navigation', 'catalog')
  return (
    <>
      <Group className="master-data-nav" gap="xs" aria-label="Sezioni catalogo">
        <Button
          variant={section === 'CATALOG' ? 'light' : 'subtle'}
          aria-pressed={section === 'CATALOG'}
          onClick={() => {
            if (section !== 'CATALOG')
              guard.request({ label: 'cambiare sottosezione', run: () => setSection('CATALOG') })
          }}
        >
          Tipi di prestazione e pesi
        </Button>
        <Button
          variant={section === 'TARIFFS' ? 'light' : 'subtle'}
          aria-pressed={section === 'TARIFFS'}
          onClick={() => {
            if (section !== 'TARIFFS')
              guard.request({ label: 'cambiare sottosezione', run: () => setSection('TARIFFS') })
          }}
        >
          Tariffe
        </Button>
      </Group>
      {section === 'CATALOG' ? <Catalog {...props} /> : <Tariffs {...props} />}
    </>
  )
}
