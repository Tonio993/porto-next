import { Button, Group } from '@mantine/core'
import type { PageDto } from '../../../shared/contracts/master-data'

export function PageControls({
  page,
  disabled,
  onPage,
}: {
  page: PageDto<unknown>
  disabled: boolean
  onPage: (page: number) => void
}) {
  if (page.total <= page.pageSize && page.page === 1) return null
  return (
    <Group className="list-pagination" gap="xs" justify="space-between">
      <Button
        size="compact-xs"
        variant="default"
        disabled={disabled || page.page === 1}
        onClick={() => onPage(page.page - 1)}
      >
        Indietro
      </Button>
      <span>
        Pagina {page.page} di {Math.max(1, Math.ceil(page.total / page.pageSize))}
      </span>
      <Button
        size="compact-xs"
        variant="default"
        disabled={disabled || page.page * page.pageSize >= page.total}
        onClick={() => onPage(page.page + 1)}
      >
        Avanti
      </Button>
    </Group>
  )
}
