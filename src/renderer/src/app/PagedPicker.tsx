import { useEffect, useRef } from 'react'
import { Button, Combobox, ScrollArea, TextInput, useCombobox } from '@mantine/core'
import type { PageDto } from '../../../shared/contracts/master-data'
import type { PickerOption, PickerSelectedState } from '../api/use-paged-picker'
import { PageControls } from './PageControls'

export interface PagedPickerProps {
  label: string
  placeholder: string
  value: string | null
  search: string
  data: PickerOption[]
  chosen: PickerOption | null
  selectedState: PickerSelectedState
  page: PageDto<unknown> | null
  loading: boolean
  error: string | null
  disabled?: boolean
  required?: boolean
  clearable?: boolean
  clearLabel?: string
  autoFocus?: boolean
  onChange: (id: string | null) => void
  onSearchChange: (search: string) => void
  onPage: (page: number) => void
  onRetry?: () => void
}

/** Presentation only: no local filtering and no implicit selection on typing, blur or paging. */
export function PagedPicker({
  label,
  placeholder,
  value,
  search,
  data,
  chosen,
  selectedState,
  page,
  loading,
  error,
  disabled = false,
  required = false,
  clearable = false,
  clearLabel,
  autoFocus,
  onChange,
  onSearchChange,
  onPage,
  onRetry,
}: PagedPickerProps) {
  const field = useRef<HTMLDivElement>(null)
  const target = useRef<HTMLInputElement>(null)
  const dropdown = useRef<HTMLDivElement>(null)
  const returningFocus = useRef(false)
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() })
  useEffect(() => combobox.resetSelectedOption(), [data, search, page])
  const close = () => {
    combobox.closeDropdown()
    returningFocus.current = true
    target.current?.focus()
    returningFocus.current = false
  }
  const blur = (next: EventTarget | null) => {
    if (
      !(next instanceof Node) ||
      (!field.current?.contains(next) && !dropdown.current?.contains(next))
    )
      combobox.closeDropdown()
  }
  const outside =
    !!page &&
    !!value &&
    !!chosen &&
    !page?.items.some(
      (item) => typeof item === 'object' && item !== null && 'id' in item && item.id === value,
    )
  const selectionText =
    chosen?.label ??
    (selectedState === 'missing'
      ? 'Il riferimento selezionato non è disponibile.'
      : selectedState === 'error'
        ? 'Impossibile leggere il riferimento selezionato.'
        : value
          ? 'Caricamento del selezionato…'
          : '')
  return (
    <div className="paged-picker" ref={field} onBlur={(event) => blur(event.relatedTarget)}>
      <Combobox
        store={combobox}
        withinPortal={false}
        readOnly={disabled}
        onOptionSubmit={(id) => {
          if (disabled || !data.some((item) => item.value === id && !item.disabled)) return
          onChange(id)
          close()
        }}
      >
        <Combobox.Target>
          <TextInput
            ref={target}
            label={label}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            data-autofocus={autoFocus || undefined}
            value={combobox.dropdownOpened ? search : selectionText}
            maxLength={200}
            error={error}
            description={combobox.dropdownOpened && value ? `Scelto: ${selectionText}` : undefined}
            rightSection={
              clearable && value ? (
                <Combobox.ClearButton
                  aria-label={clearLabel ?? `Rimuovi ${label.toLowerCase()}`}
                  tabIndex={0}
                  aria-hidden={false}
                  disabled={disabled}
                  onMouseDown={(event) => event.preventDefault()}
                  onClear={() => {
                    if (!disabled) {
                      onChange(null)
                      close()
                    }
                  }}
                />
              ) : (
                <Combobox.Chevron />
              )
            }
            rightSectionPointerEvents={clearable && value ? 'auto' : 'none'}
            onFocus={() => {
              if (!returningFocus.current) combobox.openDropdown()
            }}
            onClick={() => combobox.openDropdown()}
            onChange={(event) => {
              onSearchChange(event.currentTarget.value)
              combobox.resetSelectedOption()
              combobox.openDropdown()
            }}
          />
        </Combobox.Target>
        <Combobox.Dropdown
          ref={dropdown}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              close()
            }
          }}
        >
          <div role="status" aria-live="polite">
            {loading
              ? 'Caricamento…'
              : error
                ? 'Ricerca non disponibile.'
                : page
                  ? `${page.total} risultati`
                  : ''}
            {outside && ` · Selezionato fuori dai risultati: ${selectionText}`}
          </div>
          {error && onRetry && (
            <Button
              size="compact-xs"
              variant="default"
              disabled={disabled || loading}
              onClick={onRetry}
            >
              Riprova
            </Button>
          )}
          <ScrollArea.Autosize mah={240} type="auto">
            <Combobox.Options aria-label={label}>
              {data.map((item) => (
                <Combobox.Option
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                  active={item.value === value}
                >
                  {item.label}
                </Combobox.Option>
              ))}
              {!loading && !error && page?.total === 0 && (
                <Combobox.Empty>Nessun risultato</Combobox.Empty>
              )}
            </Combobox.Options>
          </ScrollArea.Autosize>
          {page && (
            <Combobox.Footer>
              <PageControls
                page={page}
                disabled={disabled || loading}
                onPage={(next) => {
                  combobox.resetSelectedOption()
                  onPage(next)
                  target.current?.focus()
                }}
              />
            </Combobox.Footer>
          )}
        </Combobox.Dropdown>
      </Combobox>
    </div>
  )
}
