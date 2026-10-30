'use strict';

/**
 * Secure bridge between the sandboxed renderer and the file system.
 *
 * The entire substance catalogue lives as individual JSON files in
 * src/data/substances/. Dropping a new, schema-valid JSON file into that
 * folder makes a new chemical/biomolecule available on next launch -- no code
 * changes required. This is the extensibility contract of the app.
 */

const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');

const SUBSTANCE_DIR = path.join(__dirname, '..', 'src', 'data', 'substances');

function loadSubstances() {
  let files = [];
  try {
    files = fs.readdirSync(SUBSTANCE_DIR).filter((f) => f.toLowerCase().endsWith('.json'));
  } catch (err) {
    return { substances: [], errors: [`Cannot read substance directory: ${err.message}`] };
  }

  const substances = [];
  const errors = [];

  for (const file of files) {
    const full = path.join(SUBSTANCE_DIR, file);
    try {
      const raw = fs.readFileSync(full, 'utf8');
      const parsed = JSON.parse(raw);
      parsed.__file = file;
      substances.push(parsed);
    } catch (err) {
      errors.push(`${file}: ${err.message}`);
    }
  }

  substances.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  return { substances, errors };
}

contextBridge.exposeInMainWorld('api', {
  getSubstances: () => loadSubstances()
});
