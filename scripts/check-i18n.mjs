#!/usr/bin/env node
// Translation completeness gate (run in CI via `npm run i18n:check`).
//
// Checks:
//  1. every locale has exactly the reference locale's keys (missing / extra);
//  2. no empty values;
//  3. interpolation variables ({{name}}) match across locales;
//  4. plural nodes provide every CLDR category the locale needs;
//  5. every static t('key') / rich('key') / labelKey used in src exists;
//  6. no hardcoded Cyrillic UI text outside allow-listed data/mock files
//     (the source language was Russian, so this catches untranslated strings).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const LOCALES_DIR = join(ROOT, 'src/locales');
const SRC = join(ROOT, 'src');
const LOCALES = ['ru', 'kk', 'en'];
const REFERENCE = 'ru';
const PLURAL_KEYS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);
const INTL_TAG = { ru: 'ru-RU', kk: 'kk-KZ', en: 'en-US' };

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);

function isPlural(node) {
  return node && typeof node === 'object' && typeof node.other === 'string' && Object.keys(node).every((k) => PLURAL_KEYS.has(k));
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string' || isPlural(v)) out[path] = v;
    else if (v && typeof v === 'object') flatten(v, path, out);
    else err(`[${path}] invalid value type`);
  }
  return out;
}

function vars(value) {
  const texts = typeof value === 'string' ? [value] : Object.values(value);
  const set = new Set();
  for (const t of texts) for (const m of t.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) set.add(m[1]);
  return set;
}

// --- 1-4: catalogue checks -------------------------------------------------
const catalogues = {};
for (const loc of LOCALES) {
  const dir = join(LOCALES_DIR, loc);
  if (!existsSync(dir)) {
    err(`locale directory missing: src/locales/${loc}`);
    continue;
  }
  const flat = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const ns = file.replace(/\.json$/, '');
    let json;
    try {
      json = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    } catch (e) {
      err(`${loc}/${file}: invalid JSON (${e.message})`);
      continue;
    }
    flatten(json, ns, flat);
  }
  catalogues[loc] = flat;
}

const ref = catalogues[REFERENCE] || {};
for (const loc of LOCALES) {
  const cat = catalogues[loc];
  if (!cat) continue;
  const required = new Set(new Intl.PluralRules(INTL_TAG[loc]).resolvedOptions().pluralCategories);
  for (const key of Object.keys(ref)) {
    if (!(key in cat)) err(`[${loc}] missing key: ${key}`);
  }
  for (const [key, value] of Object.entries(cat)) {
    if (!(key in ref)) err(`[${loc}] unexpected extra key: ${key}`);
    const texts = typeof value === 'string' ? [value] : Object.values(value);
    if (texts.some((t) => !t || !t.trim())) err(`[${loc}] empty value: ${key}`);
    if (isPlural(value)) {
      for (const cat of required) if (!(cat in value)) err(`[${loc}] plural "${key}" lacks category "${cat}"`);
    }
    if (key in ref) {
      const a = [...vars(ref[key])].sort().join(',');
      const b = [...vars(value)].sort().join(',');
      if (a !== b) err(`[${loc}] interpolation mismatch in ${key}: expected {${a}} got {${b}}`);
    }
  }
}

// --- 5-6: source scan ------------------------------------------------------
const CYRILLIC_ALLOW = [
  'src/locales/',
  'src/mocks/',
  'src/demo/',
  'src/kit/auth/demo.ts', // demo account display names (personal names are data)
  'src/kit/forms/validation.ts', // alphabet ranges in the password rule
  'src/kit/i18n/config.ts', // language endonyms
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(p);
  }
  return out;
}

const keyRe = /\b(?:t|rich|has)\(\s*(['"])([a-zA-Z0-9_.]+)\1/g;
const labelKeyRe = /\b(?:labelKey|titleKey|descKey|key)\s*:\s*(['"])([a-z][a-zA-Z0-9_]*\.[a-zA-Z0-9_.]+)\1/g;
let staticKeys = 0;
let dynamicKeys = 0;

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (rel.includes('__tests__') || /\.test\.tsx?$/.test(rel)) continue;
  const text = readFileSync(file, 'utf8');

  for (const re of [keyRe, labelKeyRe]) {
    for (const m of text.matchAll(re)) {
      const key = m[2];
      if (re === labelKeyRe && !(key.split('.')[0] in groupedNamespaces())) continue;
      staticKeys++;
      if (!(key in ref) && !Object.keys(ref).some((k) => k.startsWith(`${key}.`))) {
        err(`${rel}: unknown translation key "${key}"`);
      }
    }
  }
  dynamicKeys += (text.match(/\bt\(\s*`/g) || []).length;

  if (CYRILLIC_ALLOW.some((a) => rel.startsWith(a))) continue;
  text.split('\n').forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').replace(/^\s*\*.*$/, '');
    if (/[Ѐ-ӿ]/.test(code) && !line.includes('i18n-ignore')) {
      err(`${rel}:${i + 1}: hardcoded Cyrillic text (move it to src/locales): ${line.trim().slice(0, 100)}`);
    }
  });
}

function groupedNamespaces() {
  const set = {};
  for (const k of Object.keys(ref)) set[k.split('.')[0]] = true;
  return set;
}

// --- report ----------------------------------------------------------------
const counts = LOCALES.map((l) => `${l}: ${Object.keys(catalogues[l] || {}).length}`).join(', ');
console.log(`i18n keys — ${counts}`);
console.log(`static key references checked: ${staticKeys}; dynamic (template) references: ${dynamicKeys}`);
for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} i18n problem(s) found.`);
  process.exit(1);
}
console.log('✓ translations complete and consistent for ru, kk, en');
