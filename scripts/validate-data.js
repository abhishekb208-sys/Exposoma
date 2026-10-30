#!/usr/bin/env node
'use strict';

/**
 * Validates every substance JSON file against the ChemBody schema.
 * Run with:  npm run validate
 * Exits non-zero if any file is invalid, so it can gate a build/commit.
 */

const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'src', 'data', 'substances');

const KNOWN_ORGANS = new Set([
  'brain', 'eyes', 'teeth', 'thyroid', 'heart', 'lungs', 'liver', 'stomach',
  'pancreas', 'spleen', 'kidneys', 'intestines', 'bladder', 'reproductive',
  'spine', 'skin', 'muscles', 'skeleton', 'blood', 'nerves', 'hair'
]);
const TYPES = new Set(['vitamin', 'mineral', 'protein', 'biomolecule', 'metal', 'chemical', 'drug']);
const EFFECT_TYPES = new Set(['morphological', 'anatomical', 'physiological', 'biochemical', 'disease']);
const SEVERITIES = new Set(['low', 'medium', 'high']);
const AGE_KEYS = new Set(['infant', 'child', 'adolescent', 'adult', 'elderly']);
const GENDER_KEYS = new Set(['male', 'female']);

let errorCount = 0;
let warnCount = 0;
const ids = new Set();

function err(file, msg) { console.error(`  ✗ [${file}] ${msg}`); errorCount++; }
function warn(file, msg) { console.warn(`  ! [${file}] ${msg}`); warnCount++; }

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'));
console.log(`Validating ${files.length} substance file(s) in ${DIR}\n`);

for (const file of files) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  } catch (e) {
    err(file, `invalid JSON: ${e.message}`);
    continue;
  }

  if (!data.id) err(file, 'missing "id"');
  else if (ids.has(data.id)) err(file, `duplicate id "${data.id}"`);
  else ids.add(data.id);

  if (!data.name) err(file, 'missing "name"');
  if (!data.type) err(file, 'missing "type"');
  else if (!TYPES.has(data.type)) warn(file, `unusual type "${data.type}"`);

  if (!Array.isArray(data.conditions) || data.conditions.length === 0) {
    err(file, 'must have at least one condition');
    continue;
  }

  const modes = [];
  data.conditions.forEach((c, ci) => {
    const where = `conditions[${ci}]`;
    if (!c.mode) err(file, `${where} missing "mode"`);
    else modes.push(c.mode);
    if (!c.label) warn(file, `${where} missing "label"`);
    if (!Array.isArray(c.affects) || c.affects.length === 0) {
      err(file, `${where} must have at least one "affects" entry`);
      return;
    }
    c.affects.forEach((a, ai) => {
      const w2 = `${where}.affects[${ai}]`;
      if (!a.organ) err(file, `${w2} missing "organ"`);
      else if (!KNOWN_ORGANS.has(a.organ)) warn(file, `${w2} organ "${a.organ}" has no 3D mesh (text only)`);
      if (!a.effect) err(file, `${w2} missing "effect"`);
      if (!a.effectType) err(file, `${w2} missing "effectType"`);
      else if (!EFFECT_TYPES.has(a.effectType)) warn(file, `${w2} unusual effectType "${a.effectType}"`);
      if (!a.severity) err(file, `${w2} missing "severity"`);
      else if (!SEVERITIES.has(a.severity)) err(file, `${w2} severity "${a.severity}" must be low|medium|high`);
      if (a.ageModifiers) {
        Object.keys(a.ageModifiers).forEach((k) => { if (!AGE_KEYS.has(k)) warn(file, `${w2} unknown ageModifier "${k}"`); });
      }
      if (a.genderModifiers) {
        Object.keys(a.genderModifiers).forEach((k) => { if (!GENDER_KEYS.has(k)) warn(file, `${w2} unknown genderModifier "${k}"`); });
      }
    });
  });

  if (data.defaultMode && !modes.includes(data.defaultMode)) {
    err(file, `defaultMode "${data.defaultMode}" is not among this file's modes [${modes.join(', ')}]`);
  }

  if (errorCount === 0) console.log(`  ✓ ${file} (${data.name})`);
}

console.log(`\nDone. ${ids.size} valid id(s), ${errorCount} error(s), ${warnCount} warning(s).`);
process.exit(errorCount > 0 ? 1 : 0);
