import { useState } from 'react'
import { Button, Checkbox, Modal, Select, Stack } from '@mantine/core'
import { useNumericPreference } from '../api/use-numeric-preference'
import { formatNumeric } from '../api/numeric-input'
import type { NumericFormat } from '../../../shared/contracts/numeric-preference'

export function NumericSettings() {
  const preference = useNumericPreference()
  const [opened, setOpened] = useState(false)
  const [draft, setDraft] = useState<NumericFormat>(preference.format)
  return (
    <>
      <Button
        variant="subtle"
        disabled={preference.loading}
        onClick={() => {
          setDraft({ ...preference.format })
          setOpened(true)
        }}
      >
        Notazione numerica
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Notazione numerica" centered>
        <Stack>
          <p>
            Preferenza locale comune a tutti gli archivi. Le bozze già iniziate conservano il loro
            formato.
          </p>
          <Select
            label="Separatore decimale"
            value={draft.decimalSeparator}
            disabled={preference.loading || preference.busy}
            data={[
              { value: ',', label: 'Virgola — italiano' },
              { value: '.', label: 'Punto — anglosassone' },
            ]}
            onChange={(v) => {
              if (v === ',' || v === '.')
                setDraft({ ...draft, decimalSeparator: v, groupSeparator: v === ',' ? '.' : ',' })
            }}
          />
          <Select
            label="Separatore delle migliaia"
            value={draft.groupSeparator}
            disabled={preference.loading || preference.busy}
            data={[
              { value: '.', label: 'Punto' },
              { value: ',', label: 'Virgola' },
            ]}
            onChange={(v) => {
              if (v === ',' || v === '.')
                setDraft({ ...draft, groupSeparator: v, decimalSeparator: v === ',' ? '.' : ',' })
            }}
          />
          <Checkbox
            label="Raggruppa le migliaia"
            checked={draft.grouping}
            disabled={preference.loading || preference.busy}
            onChange={(e) => setDraft({ ...draft, grouping: e.currentTarget.checked })}
          />
          <p>
            Esempio: <output>{formatNumeric('1234.56', draft)}</output>
          </p>
          {preference.message && <p role="status">{preference.message}</p>}
          <Button
            disabled={preference.loading || preference.busy}
            onClick={() => void preference.save(draft)}
          >
            Salva notazione
          </Button>
        </Stack>
      </Modal>
    </>
  )
}
