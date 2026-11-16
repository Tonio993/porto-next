import type { AssignmentTarget, SpecifiedSubjectsDto } from '../../../shared/contracts/assignments'

export interface AssignmentLayer {
  target: AssignmentTarget
  specified: SpecifiedSubjectsDto
}
const priority = [
  'SERVICE_ACTIVITY',
  'VESSEL_OPERATION',
  'BERTH_STAY',
  'PORT_CALL',
  'VOYAGE',
] as const
/** Ogni ricerca si interrompe soltanto per il proprio soggetto. Null significa ereditarietà. */
export function resolveSubjects(layers: readonly AssignmentLayer[]) {
  const resolve = (field: keyof SpecifiedSubjectsDto) => {
    for (const kind of priority) {
      const layer = layers.find((l) => l.target.kind === kind)
      const id = layer?.specified[field]
      if (id) return { id, source: layer!.target }
    }
    return null
  }
  return { customer: resolve('customerId'), agency: resolve('agencyId') }
}
