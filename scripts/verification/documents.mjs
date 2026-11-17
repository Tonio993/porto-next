import { readFile, stat } from 'node:fs/promises'
import { dirname, resolve, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function checkDocuments(files, cwd = process.cwd()) {
  if (!files.length) throw new Error('Specificare almeno un documento con --document')
  const checked = []
  for (const file of files) {
    const path = resolve(cwd, file)
    const rel = relative(cwd, path)
    if (rel.startsWith('..') || isAbsolute(rel) || !file.endsWith('.md'))
      throw new Error(`Documento fuori ambito: ${file}`)
    const source = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path))
    // Collegamenti Markdown locali; non verifica disponibilità di servizi esterni.
    const prose = source.replace(/```[^]*?```/g, '')
    for (const match of prose.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1].replace(/^<|>$/g, '')
      if (/^[a-z][a-z\d+.-]*:/i.test(target)) continue
      const [name, anchor] = target.split('#')
      const destination = name ? resolve(dirname(path), decodeURIComponent(name)) : path
      await stat(destination)
      if (anchor && destination.endsWith('.md')) {
        const text = await readFile(destination, 'utf8')
        const headings = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) =>
          h[1]
            .toLowerCase()
            .replace(/[^\p{L}\p{N}_\s-]/gu, '')
            .trim()
            .replace(/\s/g, '-'),
        )
        if (!headings.includes(decodeURIComponent(anchor)))
          throw new Error(`${file}: ancora assente ${target}`)
      }
    }
    checked.push(file)
  }
  return checked
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    for (const file of await checkDocuments(process.argv.slice(2)))
      console.log(`UTF-8 e link: ${file}`)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
