#!/usr/bin/env node
'use strict';

/**
 * Builds a single self-contained HTML file (standalone.html) that runs the
 * whole app in a browser with NO install, NO server and NO Electron.
 *
 * It inlines the CSS, embeds all substance data, merges body3d.js + renderer.js
 * into one module script, and loads Three.js from a CDN (so no node_modules
 * is needed either). Just open the file in Chrome or Edge.
 *
 *   node scripts/build-standalone.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const SUB_DIR = path.join(SRC, 'data', 'substances');
const THREE_VERSION = require(path.join(ROOT, 'node_modules', 'three', 'package.json')).version;

function read(p) { return fs.readFileSync(p, 'utf8'); }

// 1. Load + sort substance data (same order the Electron preload uses).
const substances = fs.readdirSync(SUB_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(read(path.join(SUB_DIR, f))))
  .sort((a, b) => String(a.name).localeCompare(String(b.name)));

// Escape < and > so nothing inside the data can break out of <script>.
const dataLiteral = JSON.stringify(substances, null, 2)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e');

// 2. body3d.js: drop the import lines and the `export` keyword (imports are
//    hoisted to the top of the combined module below).
const body3d = read(path.join(SRC, 'body3d.js'))
  .replace(/^import .*$/gm, '')
  .replace(/export\s+class\s+BodyModel/, 'class BodyModel');

// 3. renderer.js: drop its import of BodyModel (now in the same scope).
const renderer = read(path.join(SRC, 'renderer.js'))
  .replace(/^import .*$/gm, '');

const css = read(path.join(SRC, 'styles.css'));

// 4. The HTML body (same structure as src/index.html, minus the module tags).
const bodyHtml = read(path.join(SRC, 'index.html'))
  .replace(/^[\s\S]*?<body>/, '')
  .replace(/<script[\s\S]*$/, '')
  .trim();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ChemBody Explorer</title>
<style>
${css}
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/"
  }
}
</script>
</head>
<body>
${bodyHtml}
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---- Embedded substance data (generated) ----
const EMBEDDED_SUBSTANCES = ${dataLiteral};
window.api = { getSubstances: () => ({ substances: EMBEDDED_SUBSTANCES, errors: [] }) };

// ---- 3D model (from body3d.js) ----
${body3d}

// ---- UI + logic (from renderer.js) ----
${renderer}
</script>
</body>
</html>
`;

const outPath = path.join(ROOT, 'standalone.html');
fs.writeFileSync(outPath, html, 'utf8');
const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
console.log(`Wrote ${outPath} (${kb} KB) with ${substances.length} substances, Three.js ${THREE_VERSION} via CDN.`);
