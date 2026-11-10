import React from 'react'
import ReactDOM from 'react-dom/client'
import { createTheme, MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import './styles.css'
import { App } from './app/App'

const theme = createTheme({
  primaryColor: 'teal',
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
