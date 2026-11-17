import { renameSync, writeFileSync } from 'node:fs'

// Il JSON nativo non include progetto, ID e tentativi. Solo API pubbliche del runner.
export default class VerificationContext {
  modules = new Map()
  expectedModules = []

  onTestRunStart(specifications) {
    this.expectedModules = specifications.map((s) => ({
      id: s.taskId,
      file: s.moduleId,
      project: s.project.name,
      pool: s.pool,
    }))
    this.save(false)
  }

  onTestModuleCollected(module) {
    this.modules.set(module.id, module)
    this.save(false)
  }

  onTestModuleEnd(module) {
    this.modules.set(module.id, module)
    this.save(false)
  }

  onTestRunEnd(modules, errors, reason) {
    for (const module of modules) this.modules.set(module.id, module)
    this.save(true, errors, reason)
  }

  save(completed, errors = [], reason = null) {
    const path = process.env.PORTO_VERIFICATION_CONTEXT
    if (!path) throw new Error('Percorso del contesto di verifica assente')
    const modules = [...this.modules.values()].map((module) => ({
      id: module.id,
      file: module.moduleId,
      project: module.project.name,
      state: module.state(),
      errors: [module, ...module.children.allSuites()].flatMap((s) => s.errors()),
      cases: [...module.children.allTests()].map((test) => ({
        runnerId: test.id,
        project: test.project.name,
        file: module.moduleId,
        titlePath: titles(test),
        location: test.location ?? null,
        options: test.options,
        meta: test.meta(),
        state: test.result().state,
        errors: test.result().errors ?? [],
        durationMs: test.diagnostic()?.duration ?? 0,
        attempts: test.attempts(),
      })),
    }))
    writeFileSync(
      `${path}.tmp`,
      JSON.stringify({
        version: 1,
        completed,
        reason,
        runtime: process.versions,
        expectedModules: this.expectedModules,
        modules,
        errors,
      }),
      'utf8',
    )
    renameSync(`${path}.tmp`, path)
  }
}

function titles(test) {
  const result = [test.name]
  for (let parent = test.parent; parent?.type === 'suite'; parent = parent.parent)
    result.unshift(parent.name)
  return result
}
