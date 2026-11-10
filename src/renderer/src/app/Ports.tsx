import { Button, Group, Stack, TextInput } from '@mantine/core'
import type { useArchives } from '../api/use-archives'
import { usePorts } from '../api/use-ports'
import { PortDescriptionFields } from './ports/PortDescriptionFields'
import { PortList } from './ports/PortList'
import { PortDetail } from './ports/PortDetail'
import { PortHistory } from './ports/PortHistory'
import { PortVersionForm } from './ports/PortVersionForm'
import { PortConfirmation } from './ports/PortConfirmation'

export function Ports({ archives }: { archives: ReturnType<typeof useArchives> }) {
  const ports = usePorts(archives)
  return (
    <Stack gap="lg">
      <PortList
        page={ports.page}
        search={ports.search}
        onSearch={ports.setSearch}
        onSelect={ports.select}
        onPage={ports.setPageNumber}
        loading={ports.loadingList}
        disabled={archives.busy}
        selected={ports.selection}
      />
      {ports.loadingDetail && <p role="status">Caricamento dettaglio…</p>}
      {ports.history && (
        <>
          <PortDetail
            port={ports.history.port}
            disabled={ports.busy}
            onAdd={() => ports.edit()}
            onDeactivate={() => void ports.previewPortChange('deactivate')}
            onReactivate={() => void ports.reactivate()}
            onDelete={() => void ports.previewPortChange('delete')}
          />
          <PortHistory
            history={ports.history}
            loading={ports.loadingDetail}
            disabled={ports.busy}
            onEdit={ports.edit}
            onDelete={(id) => void ports.previewDeleteVersion(id)}
            onPage={ports.setHistoryPage}
          />
        </>
      )}
      {ports.editor && (
        <PortVersionForm
          draft={ports.editor}
          onChange={ports.changeEditor}
          fields={ports.fields}
          disabled={ports.busy || ports.loadingMoment}
          onPreview={() => void ports.previewVersion()}
          onResolve={() => void ports.resolveVersion()}
          resolution={ports.resolution}
          onCancel={() => ports.changeEditor(null)}
          revision={ports.revision}
        />
      )}
      {ports.preview && (
        <PortConfirmation
          key={ports.preview.previewId}
          preview={ports.preview}
          disabled={ports.busy || ports.loadingEffects}
          revision={ports.revision}
          onConfirm={() => void ports.confirm()}
          onCancel={ports.cancelPreview}
          onPage={(page) => void ports.loadEffects(page)}
        />
      )}
      <section className="archive-panel" aria-label="Creazione porto">
        <h2>Nuovo porto</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void ports.create()
          }}
        >
          <Stack>
            <PortDescriptionFields
              value={ports.draft}
              onChange={(value) => ports.setDraft({ ...ports.draft, ...value })}
              disabled={ports.busy}
              fields={ports.createFields}
            />
            <TextInput
              label="Fuso IANA del porto"
              required
              disabled={ports.busy || !ports.draftContext}
              description="Proposto dal fuso aziendale. Rimane autonomo dopo la creazione."
              value={ports.draft.initialZoneId}
              error={ports.createFields.initialZoneId}
              onChange={(event) =>
                ports.setDraft({ ...ports.draft, initialZoneId: event.currentTarget.value })
              }
            />
            <Group>
              <Button type="submit" disabled={ports.busy || !ports.draftContext}>
                Crea porto
              </Button>
              <Button
                variant="default"
                disabled={ports.busy}
                onClick={() => void ports.reloadCreate()}
              >
                Ricarica dati
              </Button>
            </Group>
            {ports.draftContext && ports.draftContext.revision !== ports.revision && (
              <p>I dati dell’archivio sono cambiati. Ricarica i dati prima di salvare.</p>
            )}
          </Stack>
        </form>
      </section>
    </Stack>
  )
}
