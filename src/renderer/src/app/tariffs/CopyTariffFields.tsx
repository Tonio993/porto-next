import { useEffect, useState } from 'react'
import { Button, Select, Stack } from '@mantine/core'
import type { ArchiveContextDto } from '../../../../shared/contracts/application'
import type {
  TariffConfigurationInput,
  TariffSummaryDto,
} from '../../../../shared/contracts/tariffs'
import type { PageDto } from '../../../../shared/contracts/master-data'
import { useApplicationRequest } from '../../api/use-application-request'
import { PortPicker } from './PortPicker'
import { PageControls } from '../PageControls'
export function CopyTariffFields({
  context,
  portId,
  disabled,
  onCopy,
  report,
}: {
  context: ArchiveContextDto
  portId: string
  disabled: boolean
  onCopy: (c: readonly TariffConfigurationInput[]) => void
  report: (message: string | null) => void
}) {
  const [sourcePort, setSourcePort] = useState<string | null>(portId)
  const [source, setSource] = useState<string | null>(null)
  const [list, setList] = useState<PageDto<TariffSummaryDto> | null>(null),
    [page, setPage] = useState(1)
  const {
    request: readList,
    invalidate: invalidateList,
    loading,
  } = useApplicationRequest(context, report)
  const {
    request: readCopy,
    invalidate: invalidateCopy,
    loading: copying,
  } = useApplicationRequest(context, report)
  useEffect(() => {
    if (!sourcePort) return
    void readList(() =>
      window.tariffs.list({
        context: { sessionId: context.sessionId },
        query: { portId: sourcePort, page, pageSize: 25 },
      }),
    ).then((r) => {
      if (r?.ok) setList(r.value)
    })
  }, [readList, sourcePort, page, context.sessionId, context.revision])
  return (
    <Stack gap="xs">
      <PortPicker
        context={context}
        value={sourcePort}
        label="Porto sorgente"
        disabled={disabled || copying}
        onChange={(p) => {
          invalidateCopy()
          invalidateList()
          setSourcePort(p)
          setSource(null)
          setList(null)
          setPage(1)
        }}
      />
      <Select
        label="Tariffa sorgente"
        value={source}
        data={
          list?.items.map((t) => ({
            value: t.id,
            label: `${t.effectiveMoment!.localDateTime.replace('T', ' ')} (${t.effectiveMoment!.offset})`,
          })) ?? []
        }
        disabled={disabled || loading || copying}
        onChange={(id) => {
          invalidateCopy()
          setSource(id)
        }}
        allowDeselect={false}
        placeholder={
          list?.total === 0 ? 'Nessuna tariffa in questo porto' : 'Seleziona la tariffa da copiare'
        }
      />
      {list && (
        <PageControls
          page={list}
          disabled={disabled || loading || copying}
          onPage={(p) => {
            invalidateList()
            setPage(p)
          }}
        />
      )}
      <Button
        variant="default"
        disabled={disabled || !source || copying}
        onClick={() =>
          void readCopy(() =>
            window.tariffs.copyConfigurations({
              context: { sessionId: context.sessionId },
              query: { id: source! },
            }),
          ).then((r) => {
            if (r?.ok) onCopy(r.value)
          })
        }
      >
        Usa configurazioni sorgenti
      </Button>
    </Stack>
  )
}
