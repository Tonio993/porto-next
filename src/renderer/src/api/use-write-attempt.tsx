import { useLayoutEffect, useRef, useState } from 'react'
import { Button, Modal } from '@mantine/core'
import {
  WriteAttempt,
  readWriteReceipt,
  recoverWriteAttempt,
  type RecoveryBarrier,
} from './write-attempt'
import { useProtectedDraft } from '../app/DraftProtection'
import type { useArchives } from './use-archives'

/** For families without an identity-based outcome query (including identical services). */
export function useWriteAttempt(
  archives: ReturnType<typeof useArchives>,
  onApplied: () => void,
  barrier?: RecoveryBarrier,
) {
  const [, render] = useState(0)
  const alive = useRef(true)
  const latest = useRef(archives.state.context)
  latest.current = archives.state.context
  const [attempt] = useState(
    () =>
      new WriteAttempt(() => {
        if (alive.current) render((n) => n + 1)
      }),
  )
  useLayoutEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  const [opened, setOpened] = useState(false)
  const [message, setMessage] = useState('')
  function openRecovery() {
    setMessage('')
    setOpened(true)
  }
  useProtectedDraft({
    get state() {
      return attempt.busy ? 'BUSY' : attempt.uncertain ? 'UNCERTAIN' : 'CLEAN'
    },
    discard: () => {},
    recover: openRecovery,
  })
  const verify = async () => {
    const session = latest.current?.sessionId
    const outcome = await recoverWriteAttempt(
      attempt,
      (attemptId, context) =>
        readWriteReceipt(
          context,
          () =>
            window.writeOutcomes.get({
              context: { sessionId: context.sessionId },
              query: { attemptId },
            }),
          async () => (await archives.update(() => window.archives.getState()))?.context ?? null,
          () => (alive.current ? latest.current : null),
        ),
      () => {
        if (alive.current && latest.current?.sessionId === session) onApplied()
      },
      barrier,
    )
    if (!alive.current || latest.current?.sessionId !== session) return
    if (outcome === 'APPLIED') {
      setOpened(false)
      archives.setNotice('Scrittura applicata: esito verificato senza ripetere il comando.')
    } else if (outcome === 'REJECTED') {
      setMessage(
        'Il tentativo è stato rifiutato. I valori sono conservati; ricarica esplicitamente la bozza prima di continuare.',
      )
    } else setMessage('Esito ancora ignoto. La bozza rimane protetta; ripeti soltanto la verifica.')
  }
  const recovery = (
    <>
      {attempt.uncertain && (
        <Button variant="default" onClick={openRecovery}>
          Verifica esito della scrittura
        </Button>
      )}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Verifica esito della scrittura"
        centered
        closeOnClickOutside={false}
      >
        <p>
          {message ||
            'La risposta alla scrittura non è disponibile. Verifica il tentativo originale prima di proseguire.'}
        </p>
        <Button disabled={attempt.busy || !attempt.uncertain} onClick={() => void verify()}>
          Verifica esito
        </Button>
      </Modal>
    </>
  )
  const control = attempt.uncertain ? (
    <Button variant="default" onClick={openRecovery}>
      Verifica esito della scrittura
    </Button>
  ) : null
  return { attempt, recovery, control, verify, openRecovery }
}
