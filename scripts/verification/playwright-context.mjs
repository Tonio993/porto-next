import { relative } from 'node:path'
import { renameSync, writeFileSync } from 'node:fs'

export default class VerificationContext {
  onBegin(config, suite) {
    this.data = {
      version: 1,
      completed: false,
      cases: suite.allTests().map((test) => ({
        runnerId: test.id,
        project: test.parent.project().name,
        file: relative(config.rootDir, test.location.file).replaceAll('\\', '/'),
        titlePath: test.titlePath().slice(3),
        repeatEachIndex: test.repeatEachIndex,
        location: test.location,
        expectedStatus: test.expectedStatus,
      })),
    }
    this.save()
  }

  onEnd(result) {
    this.data ??= { version: 1, cases: [] }
    this.data.completed = true
    this.data.status = result.status
    this.save()
  }

  save() {
    const path = process.env.PORTO_VERIFICATION_CONTEXT
    if (!path) throw new Error('Percorso del contesto di verifica assente')
    writeFileSync(`${path}.tmp`, JSON.stringify(this.data), 'utf8')
    renameSync(`${path}.tmp`, path)
  }
}
