import { Button, Group, Stack, Tabs, TextInput } from '@mantine/core'
import type {
  TariffConfigurationDto,
  TariffConfigurationInput,
} from '../../../../shared/contracts/tariffs'
import { vesselTypes, type VesselTypeId } from '../../../../shared/contracts/vessels'
import { decimalInput } from '../../api/numeric-input'

export type ConfigurationDraft = {
  vesselTypeId: VesselTypeId
  brackets: { upperLimit: string; value: string }[]
  extraWidth: string
  extraValue: string
}
export const emptyConfigurations = (): ConfigurationDraft[] =>
  vesselTypes.map((t) => ({
    vesselTypeId: t.id,
    brackets: [{ upperLimit: '', value: '' }],
    extraWidth: '',
    extraValue: '',
  }))
export const copyDraft = (configs: readonly TariffConfigurationInput[]): ConfigurationDraft[] =>
  vesselTypes.map((t) => {
    const c = configs.find((c) => c.vesselTypeId === t.id)!
    return {
      ...c,
      brackets: c.brackets.map((b) => ({
        upperLimit: String(b.upperLimit),
        value: b.value.replace('.', ','),
      })),
      extraWidth: String(c.extraWidth),
      extraValue: c.extraValue.replace('.', ','),
    }
  })
export function readConfigurations(configs: ConfigurationDraft[]): TariffConfigurationInput[] {
  const integer = (raw: string) => {
    if (!/^[0-9]+$/.test(raw.trim()) || !Number.isSafeInteger(Number(raw)))
      throw new Error('Inserisci limiti e ampiezze interi entro 9007199254740991.')
    return Number(raw)
  }
  const decimal = (raw: string) => {
    const value = decimalInput(raw)
    if (value === null || raw.trim().replace(',', '.').replace('.', '').length > 256)
      throw new Error('Inserisci valori decimali non negativi, con al massimo 256 cifre.')
    return value
  }
  return configs.map((c) => ({
    vesselTypeId: c.vesselTypeId,
    extraWidth: integer(c.extraWidth),
    extraValue: decimal(c.extraValue),
    brackets: c.brackets.map((b) => ({
      upperLimit: integer(b.upperLimit),
      value: decimal(b.value),
    })),
  }))
}
export function ConfigurationFields({
  value,
  onChange,
  disabled,
}: {
  value: ConfigurationDraft[]
  onChange: (value: ConfigurationDraft[]) => void
  disabled: boolean
}) {
  const change = (index: number, c: ConfigurationDraft) =>
    onChange(value.map((old, i) => (i === index ? c : old)))
  return (
    <Tabs defaultValue="STANDARD">
      <Tabs.List aria-label="Configurazioni nave">
        {vesselTypes.map((t) => (
          <Tabs.Tab key={t.id} value={t.id}>
            {t.id}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {value.map((c, index) => (
        <Tabs.Panel value={c.vesselTypeId} key={c.vesselTypeId} pt="sm">
          <Stack gap="sm">
            <p>
              {vesselTypes.find((t) => t.id === c.vesselTypeId)!.label} · Limiti inclusi, in ordine
              crescente. Valori in EUR, anche zero.
            </p>
            {c.brackets.map((b, i) => (
              <div className="tariff-bracket-fields" key={i}>
                <TextInput
                  label={`Limite incluso ${i + 1}`}
                  inputMode="numeric"
                  value={b.upperLimit}
                  disabled={disabled}
                  onChange={(e) =>
                    change(index, {
                      ...c,
                      brackets: c.brackets.map((old, n) =>
                        n === i ? { ...old, upperLimit: e.currentTarget.value } : old,
                      ),
                    })
                  }
                />
                <TextInput
                  label={`Valore EUR ${i + 1}`}
                  inputMode="decimal"
                  value={b.value}
                  disabled={disabled}
                  onChange={(e) =>
                    change(index, {
                      ...c,
                      brackets: c.brackets.map((old, n) =>
                        n === i ? { ...old, value: e.currentTarget.value } : old,
                      ),
                    })
                  }
                />
                <Button
                  variant="subtle"
                  aria-label={`Rimuovi scaglione ${i + 1}`}
                  disabled={disabled || c.brackets.length === 1}
                  onClick={() =>
                    change(index, { ...c, brackets: c.brackets.filter((_, n) => n !== i) })
                  }
                >
                  Rimuovi
                </Button>
              </div>
            ))}
            <Group>
              <Button
                variant="default"
                disabled={disabled || c.brackets.length >= 1000}
                onClick={() =>
                  change(index, { ...c, brackets: [...c.brackets, { upperLimit: '', value: '' }] })
                }
              >
                Aggiungi scaglione
              </Button>
            </Group>
            <div className="tariff-extra-fields">
              <TextInput
                label="Ampiezza extra"
                inputMode="numeric"
                value={c.extraWidth}
                disabled={disabled}
                onChange={(e) => change(index, { ...c, extraWidth: e.currentTarget.value })}
              />
              <TextInput
                label="Valore extra EUR"
                inputMode="decimal"
                value={c.extraValue}
                disabled={disabled}
                onChange={(e) => change(index, { ...c, extraValue: e.currentTarget.value })}
              />
            </div>
          </Stack>
        </Tabs.Panel>
      ))}
    </Tabs>
  )
}
export function ConfigurationDetails({
  configurations,
}: {
  configurations: readonly TariffConfigurationDto[]
}) {
  return (
    <>
      {vesselTypes.map((t) => {
        const c = configurations.find((c) => c.vesselTypeId === t.id)!
        return (
          <section
            key={c.id}
            aria-label={`Configurazione ${t.id}`}
            className="tariff-configuration"
          >
            <h3>
              {t.id} · {t.label}
            </h3>
            <table className="tariff-table">
              <thead>
                <tr>
                  <th>Limite incluso</th>
                  <th>Valore EUR</th>
                </tr>
              </thead>
              <tbody>
                {c.brackets.map((b) => (
                  <tr key={b.id}>
                    <td>{b.upperLimit}</td>
                    <td>{b.value.replace('.', ',')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Ampiezza extra: {c.extraWidth} · Valore extra:{' '}
              <span className="tariff-long-value">{c.extraValue.replace('.', ',')} EUR</span>
            </p>
          </section>
        )
      })}
    </>
  )
}
