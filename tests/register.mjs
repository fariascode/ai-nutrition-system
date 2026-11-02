import { registerHooks } from 'node:module'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      specifier = pathToFileURL(resolve(root, 'src', specifier.slice(2))).href
    }
    if (specifier.startsWith('.') || specifier.startsWith('file:')) {
      const url = new URL(specifier, context.parentURL)
      for (const suffix of ['', '.ts', '.tsx']) {
        if (existsSync(fileURLToPath(url) + suffix)) {
          return nextResolve(url.href + suffix, context)
        }
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (/\.tsx?$/.test(url)) {
      const source = readFileSync(new URL(url), 'utf8')
        .replaceAll('import.meta.env', '({ VITE_DEMO_MODE: "true" })')
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
      }).outputText }
    }
    return nextLoad(url, context)
  },
})
