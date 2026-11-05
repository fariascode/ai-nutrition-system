import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractLabInput, readLabTextFile } from '../src/lib/labInput.ts'

test('PDF e imágenes no se leen como texto ni se reemplazan por estudios de ejemplo', async () => {
  for (const name of ['estudio.pdf', 'foto.PNG', 'imagen.jpg']) {
    let read = false
    await assert.rejects(readLabTextFile({ name, text: async () => { read = true; return 'Glucosa en ayuno: 109' } }), /no se han extraído/)
    assert.equal(read, false)
  }
})

test('TXT y CSV conservan el contenido suministrado y reportan errores de lectura', async () => {
  for (const name of ['estudio.TXT', 'valores.csv']) {
    assert.equal(await readLabTextFile({ name, text: async () => 'TSH: 2.3' }), 'TSH: 2.3')
  }
  await assert.rejects(readLabTextFile({ name: 'estudio.txt', text: async () => { throw new Error('Lectura fallida') } }), /Lectura fallida/)
})

test('el análisis exige resultados reconocibles sin suponer valores ni fecha del estudio', () => {
  assert.throws(() => extractLabInput('  '), /antes de analizar/)
  assert.throws(() => extractLabInput('Sin resultados numéricos'), /No se reconocieron/)
  const bio = extractLabInput('Glucosa en ayuno: 108 mg/dL\nTSH: 2.3 mUI/L')
  assert.equal(bio.fasting_glucose, 108)
  assert.equal(bio.tsh, 2.3)
  assert.equal(bio.fasting_insulin, undefined)
  assert.equal(bio.last_lab_date, undefined)
})
