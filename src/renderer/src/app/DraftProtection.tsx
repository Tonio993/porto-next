import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Group, Modal } from '@mantine/core'
import { DraftGuard, type DraftOwner } from '../api/draft-guard'

const Protection = createContext<DraftGuard | null>(null)
export function DraftProtection({ children }: { children: ReactNode }) {
  const [, render] = useState(0)
  const [guard] = useState(() => new DraftGuard(() => render((n) => n + 1)))
  useLayoutEffect(() => {
    guard.activate()
    return () => guard.dispose()
  }, [guard])
  return (
    <Protection.Provider value={guard}>
      {children}
      <Modal
        opened={!!guard.pending || !!guard.blocked}
        onClose={() => guard.cancel()}
        title={guard.pending ? 'Scartare la bozza?' : 'Bozza protetta'}
        centered
        closeOnClickOutside={false}
      >
        {guard.pending ? (
          <>
            <p>Per {guard.pending.label} occorre scartare la bozza e le sue anteprime.</p>
            <Group justify="flex-end">
              <Button data-autofocus variant="default" onClick={() => guard.cancel()}>
                Annulla
              </Button>
              <Button color="red" onClick={() => guard.discard()}>
                Scarta
              </Button>
            </Group>
          </>
        ) : (
          <>
            <p>
              {guard.blocked === 'UNCERTAIN'
                ? 'Verifica l’esito della scrittura prima di scartare la bozza o cambiare contesto.'
                : 'Attendi il completamento della scrittura.'}
            </p>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => guard.cancel()}>
                Chiudi
              </Button>
              {guard.blocked === 'UNCERTAIN' && (
                <Button data-autofocus onClick={() => guard.recover()}>
                  Verifica esito
                </Button>
              )}
            </Group>
          </>
        )}
      </Modal>
    </Protection.Provider>
  )
}
export function useDraftProtection() {
  const guard = useContext(Protection)
  if (!guard) throw new Error('Protezione bozze non disponibile')
  return guard
}
export function useProtectedDraft(owner: DraftOwner) {
  const guard = useDraftProtection()
  const latest = useRef(owner)
  latest.current = owner
  useLayoutEffect(() => guard.register(latest, () => latest.current), [guard])
  return guard
}
