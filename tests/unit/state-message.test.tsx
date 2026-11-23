import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'
import { expect, it, vi } from 'vitest'
import { StateMessage } from '../../src/renderer/src/app/StateMessage'

it.each(['info', 'success'] as const)(
  'feedback %s espone una chiusura nominata e delega al chiamante',
  (kind) => {
    const onClose = vi.fn()
    const message = StateMessage({ kind, title: 'Esito verificato', onClose })
    const markup = renderToStaticMarkup(createElement(MantineProvider, null, message))
    expect(markup).toContain('aria-label="Chiudi messaggio"')
    expect(markup).toContain('<button')
    expect(onClose).not.toHaveBeenCalled()
    message.props.onClose()
    expect(onClose).toHaveBeenCalledOnce()
  },
)

it.each(['warning', 'error', 'info', 'success'] as const)(
  'messaggio %s persistente non acquisisce una chiusura implicita',
  (kind) => {
    const message = StateMessage({
      kind,
      title: 'Condizione persistente',
      children: 'Recupero necessario',
    })
    const markup = renderToStaticMarkup(createElement(MantineProvider, null, message))
    expect(markup).not.toContain('aria-label="Chiudi messaggio"')
    expect(markup).toContain('Recupero necessario')
  },
)
