import { NumericSettings } from './NumericSettings'
import { useLayoutEffect, useRef, useState, type Ref } from 'react'
import { TextInput, type TextInputProps } from '@mantine/core'
import type { NumericFormat } from '../../../shared/contracts/numeric-preference'
import { useNumericFormat } from '../api/use-numeric-preference'
import {
  formatNumeric,
  NumericEditHistory,
  numericLogicalOffset,
  numericVisualOffset,
  parseLocalizedEditing,
  replaceNumericSelection,
  type NumericEdit,
} from '../api/numeric-input'

type Props = Omit<TextInputProps, 'value' | 'onChange'> & {
  value: string
  onChange: (event: { currentTarget: { value: string } }) => void
  format?: NumericFormat
  integer?: boolean
  unit?: string
  ref?: Ref<HTMLInputElement>
}
export function ExactNumericInput({
  value,
  onChange,
  format: captured,
  integer = false,
  unit,
  ref: forwarded,
  description,
  error,
  ...props
}: Props) {
  const preference = useNumericFormat()
  const [initial] = useState(() => ({ ...preference }))
  const format = captured ?? initial
  const input = useRef<HTMLInputElement | null>(null)
  const history = useRef(new NumericEditHistory())
  const composing = useRef(false)
  const compositionBefore = useRef<NumericEdit | null>(null)
  const compositionCommit = useRef<string | null>(null)
  const [composition, setComposition] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const pending = useRef<NumericEdit['selection'] | null>(null)
  useLayoutEffect(() => {
    // A newly created/reloaded draft must not inherit another draft's undo history.
    history.current = new NumericEditHistory()
    pending.current = null
    compositionBefore.current = null
    compositionCommit.current = null
    setLocalError(null)
    setComposition(null)
  }, [format])
  const display = formatNumeric(value, format)
  const current = (): NumericEdit => ({
    text: value,
    selection: {
      start: input.current?.selectionStart ?? 0,
      end: input.current?.selectionEnd ?? 0,
      direction: input.current?.selectionDirection ?? 'none',
    },
  })
  const apply = (next: NumericEdit | null | undefined, record = true) => {
    if (!next) {
      setLocalError('Inserisci un numero nel formato della bozza, senza segni o esponenti.')
      return
    }
    setLocalError(null)
    if (record) history.current.push(current())
    pending.current = next.selection
    onChange({ currentTarget: { value: next.text } })
    // Also restores the caret for accepted no-op edits, which need no parent render.
    if (input.current) {
      input.current.value = formatNumeric(next.text, format)
      input.current.setSelectionRange(
        next.selection.start,
        next.selection.end,
        next.selection.direction,
      )
    }
  }
  useLayoutEffect(() => {
    if (pending.current && input.current) {
      const s = pending.current
      input.current.setSelectionRange(s.start, s.end, s.direction)
      pending.current = null
    }
  })
  useLayoutEffect(() => {
    const element = input.current
    if (!element) return
    const before = (event: InputEvent) => {
      if (composing.current || event.isComposing || event.inputType.includes('Composition')) return
      if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
        event.preventDefault()
        const next =
          event.inputType === 'historyUndo'
            ? history.current.undo(current())
            : history.current.redo(current())
        if (next) apply(next, false)
      } else if (
        event.inputType.startsWith('delete') ||
        (event.inputType.startsWith('insert') && event.data !== null)
      ) {
        event.preventDefault()
        apply(
          replaceNumericSelection(
            value,
            current().selection,
            event.data ?? '',
            format,
            integer,
            event.inputType === 'deleteContentBackward'
              ? 'backward'
              : event.inputType === 'deleteContentForward'
                ? 'forward'
                : undefined,
          ),
        )
      }
    }
    element.addEventListener('beforeinput', before)
    return () => element.removeEventListener('beforeinput', before)
  })
  const oldFormat =
    format.decimalSeparator !== preference.decimalSeparator ||
    format.grouping !== preference.grouping ||
    format.groupSeparator !== preference.groupSeparator
  return (
    <TextInput
      {...props}
      ref={(element) => {
        input.current = element
        if (typeof forwarded === 'function') forwarded(element)
        else if (forwarded) forwarded.current = element
      }}
      inputMode={integer ? 'numeric' : 'decimal'}
      value={composition ?? display}
      rightSection={unit ? <span aria-label={`Unità ${unit}`}>{unit}</span> : undefined}
      description={
        <>
          {description} Formato della bozza: {formatNumeric('1234.56', format)}
          {oldFormat && <span> (preferenza precedente)</span>}. <NumericSettings />
        </>
      }
      error={localError ?? error}
      onPaste={(e) => {
        e.preventDefault()
        apply(
          replaceNumericSelection(
            value,
            current().selection,
            e.clipboardData.getData('text'),
            format,
            integer,
          ),
        )
      }}
      onCut={(e) => {
        const s = current().selection
        e.preventDefault()
        e.clipboardData.setData('text/plain', display.slice(s.start, s.end))
        apply(replaceNumericSelection(value, s, '', format, integer))
      }}
      onKeyDown={(e) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          !e.altKey &&
          ['z', 'y'].includes(e.key.toLowerCase()) &&
          !composing.current
        ) {
          e.preventDefault()
          const redo = e.key.toLowerCase() === 'y' || e.shiftKey
          const next = redo ? history.current.redo(current()) : history.current.undo(current())
          if (next) apply(next, false)
        }
      }}
      onCompositionStart={() => {
        compositionBefore.current = current()
        composing.current = true
        setComposition(display)
      }}
      onCompositionEnd={(e) => {
        composing.current = false
        setComposition(null)
        const text = parseLocalizedEditing(e.currentTarget.value, format, integer)
        if (text !== null && compositionBefore.current)
          history.current.push(compositionBefore.current)
        compositionCommit.current = text
        apply(
          text === null
            ? null
            : {
                text,
                selection: {
                  start: numericVisualOffset(
                    formatNumeric(text, format),
                    numericLogicalOffset(
                      e.currentTarget.value,
                      e.currentTarget.selectionStart ?? 0,
                      format,
                    ),
                    format,
                  ),
                  end: numericVisualOffset(
                    formatNumeric(text, format),
                    numericLogicalOffset(
                      e.currentTarget.value,
                      e.currentTarget.selectionEnd ?? 0,
                      format,
                    ),
                    format,
                  ),
                },
              },
          false,
        )
      }}
      onChange={(e) => {
        if (composing.current) {
          setComposition(e.currentTarget.value)
          return
        }
        const text = parseLocalizedEditing(e.currentTarget.value, format, integer)
        if (compositionCommit.current !== null && text === compositionCommit.current) {
          compositionCommit.current = null
          return
        }
        compositionCommit.current = null
        if (text === null) {
          apply(null)
          e.currentTarget.value = display
          return
        }
        const start = numericVisualOffset(
          formatNumeric(text, format),
          numericLogicalOffset(
            e.currentTarget.value,
            e.currentTarget.selectionStart ?? e.currentTarget.value.length,
            format,
          ),
          format,
        )
        const end = numericVisualOffset(
          formatNumeric(text, format),
          numericLogicalOffset(
            e.currentTarget.value,
            e.currentTarget.selectionEnd ?? e.currentTarget.value.length,
            format,
          ),
          format,
        )
        apply({
          text,
          selection: { start, end, direction: e.currentTarget.selectionDirection ?? 'none' },
        })
      }}
    />
  )
}
