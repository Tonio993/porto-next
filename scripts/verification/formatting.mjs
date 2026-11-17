import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as prettier from 'prettier'

export const legacyFiles = [
  'doc/legacy/00-roadmap-progetto.md',
  'doc/legacy/01-analisi-dominio.md',
  'doc/legacy/02-requisiti-funzionali-e-casi-uso.md',
  'doc/legacy/03-modello-dati.md',
  'doc/legacy/04-sviluppo-evolutivo.md',
]

// Diagnosi aggiuntiva tramite API, senza reinterpretare il log o l'uscita Prettier.
export async function formattingDetails(cwd) {
  const differences = []
  async function visit(folder) {
    for (const entry of await readdir(resolve(cwd, folder), { withFileTypes: true })) {
      if (entry.name === '.git' || entry.isSymbolicLink()) continue
      const file = folder ? `${folder}/${entry.name}` : entry.name
      const path = resolve(cwd, file)
      const info = await prettier.getFileInfo(path, {
        ignorePath: [resolve(cwd, '.gitignore'), resolve(cwd, '.prettierignore')],
      })
      if (info.ignored) continue
      if (entry.isDirectory()) await visit(file)
      else if (info.inferredParser) {
        const options = (await prettier.resolveConfig(path)) ?? {}
        if (!(await prettier.check(await readFile(path, 'utf8'), { ...options, filepath: path })))
          differences.push(file)
      }
    }
  }
  await visit('')
  return {
    legacy: differences.filter((file) => legacyFiles.includes(file)),
    regressions: differences.filter((file) => !legacyFiles.includes(file)),
  }
}
