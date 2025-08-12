// heal-and-run.mjs
import cypress from 'cypress';
import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';

const AGENT_URL = process.env.AI_AGENT_URL || 'http://127.0.0.1:8000/fix_locator';

function extractSelector(msg) {
  // Ej: "Timed out retrying after 4000ms: Expected to find element: 'button:contains(\"Enviar\")', but never found it."
  const m = msg.match(/Expected to find?\\s*'([^']+)'/i);
  return m?.[1] || null;
}

async function patchSpec(filePath, selectorOld, selectorNew) {
  const src = await fs.readFile(filePath, 'utf8');
  if (!src.includes(selectorOld)) return false;

  // REEMPLAZO SIMPLE (POC): sustituye solo la primera ocurrencia exacta del literal dentro de comillas
  const pat = new RegExp(`(['"\`])${selectorOld.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\1`);
  const out = src.replace(pat, (m, q) => `${q}${selectorNew}${q}`);

  if (out === src) return false;
  await fs.writeFile(filePath + '.bak', src);
  await fs.writeFile(filePath, out);
  return true;
}

function collectFailures(results) {
  const items = [];
  for (const run of results.runs || []) {
    const specPath = run.spec?.absolute || run.spec?.relative;
    for (const t of run.tests || []) {
      for (const a of t.attempts || []) {
        if (a.state === 'failed' && t.displayError) {
          items.push({
            specPath,
            title: t.title.join(' > '),
            message: t.displayError,
          });
        }
      }
    }
  }
  return items;
}

async function runOnce(specPattern) {
  const res = await cypress.run({
    spec: specPattern, // string o array
    config: { video: false },
  });
  return res;
}

async function main() {
  // 1) Primera corrida
  const first = await runOnce(process.argv[2] || 'cypress/e2e/**/*.cy.*');
  const fails = collectFailures(first);
  console.log('🔍 Fallos encontrados:', fails.length);
  if (!fails.length) {
    console.log('✅ Todo pasó en la primera corrida.');
    process.exit(0);
  }

  // 2) Curación fuera de banda (por cada fallo)
  const specsToRerun = new Set();
  for (const f of fails) {
    const sel = extractSelector(f.message);
    if (!sel) continue;
    console.log('🔍 Fallo encontrado:', f.message);
    console.log('🔍 Selector encontrado:', sel);
    // Llama a IA (envía contexto mínimo; puedes enriquecer con DOM si lo guardaste a disco en afterEach)
    const { data: fix } = await axios.post(AGENT_URL, {
      cmd: 'get',
      selector: sel,
      dom: '', // opcional: si registraste snapshot
      error: f.message
    });

    const newSelector = fix?.selector;
    if (!newSelector || newSelector === sel) continue;

    const ok = await patchSpec(f.specPath, sel, newSelector);
    if (ok) {
      console.log(`🔧 Parche aplicado en ${f.specPath}: '${sel}' → '${newSelector}'`);
      specsToRerun.add(f.specPath);
    }
  }

  if (!specsToRerun.size) {
    console.log('⚠️ No hubo parches aplicables. Saliendo con código de fallo.');
    process.exit(1);
  }

  // 3) Segunda corrida (solo los specs parchados)
  const second = await runOnce([...specsToRerun].join(','));
  const secondFails = collectFailures(second);
  if (secondFails.length) {
    console.log('❌ Aún hay fallos tras la curación.');
    process.exit(1);
  }
  console.log('🎉 Pasó en la segunda corrida (self-healed).');
}

main().catch((e) => { console.error(e); process.exit(1); });
