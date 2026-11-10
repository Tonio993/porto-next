import React from 'react'
import ReactDOM from 'react-dom/client'
import { createTheme, MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import './styles.css'
import { App } from './app/App'

const theme = createTheme({
  primaryColor: 'teal',
  primaryShade: 8,
  colors: {
    teal: [
      '#e6fcf5',
      '#c3fae8',
      '#96f2d7',
      '#63e6be',
      '#38d9a9',
      '#20c997',
      '#12b886',
      '#0ca678',
      '#087f5b',
      '#066448',
    ],
  },
  defaultRadius: 'md',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  headings: { fontFamily: "'Segoe UI', system-ui, sans-serif", fontWeight: '650' },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </React.StrictMode>,
)
