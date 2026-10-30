# ChemBody Explorer

A cross-platform desktop app (Windows / macOS / Linux) that shows **what a
chemical, vitamin, mineral or biomolecule does to the human body**. Search a
substance, set **age** and **gender**, and a **transparent 3D human figure**
lights up the affected organs. A plain-language **conclusion** beneath the model
states which part is affected and why, classified as *morphological*,
*anatomical*, *physiological*, *biochemical* or *disease* change — the same
dimensions used by toxicogenomic resources such as the CTD.

> **Educational tool — not medical advice.** Content is a curated summary of
> well-established physiology with cited sources. It is not a diagnosis,
> prognosis or treatment recommendation.

---

## Features

- **Universal search** — matches names, synonyms/aliases, type and CAS number.
- **Transparent 3D body** (Three.js) with ~20 highlightable organs/tissues,
  rotate (drag), zoom (scroll), auto-spin, and floating labels on affected parts.
- **Age & gender aware** — infant / child / adolescent / adult / older-adult
  bands and male/female modifiers refine the conclusion (e.g. rickets in
  children vs osteomalacia in adults; teratogenicity for pregnancy).
- **Deficiency vs toxicity scenarios** per substance, switchable in one click.
- **Severity-graded glow** (high / moderate / low) and a colour-coded conclusion.
- **Cited sources** (NIH ODS, WHO, CDC, StatPearls, CTD) opened in the system browser.
- **Fully extensible** — add a substance by dropping one JSON file in a folder.

## Built-in library (12 substances)

Vitamin D · Vitamin C · Vitamin A · Vitamin B12 · Vitamin B1 (Thiamine) ·
Folate (B9) · Iron · Iodine · Calcium · Dietary Protein · Lead · Mercury

---

## Run it

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm start
```

## Build a Windows installer (.exe)

Run on Windows (or cross-build with the right toolchain):

```bash
npm run dist:win
```

The installer is produced in `dist/` as `ChemBodyExplorer-Setup-<version>.exe`
(NSIS installer, lets the user choose the install directory and adds a desktop
shortcut). `npm run dist:all` targets Windows, macOS and Linux.

## Validate the data

```bash
npm run validate
```

Checks every substance file against the schema and the organ vocabulary.
Exit code is non-zero on any error, so you can wire it into CI or a pre-commit hook.

---

## Adding a new chemical / biomolecule (the extensibility contract)

1. Copy any file in `src/data/substances/` to `src/data/substances/<your-id>.json`.
2. Fill it in following **`src/data/schema.md`** (the full schema + field reference).
3. Use only organ keys from the **ORGAN VOCABULARY** in that doc so they light up
   in 3D. Unknown keys still appear in the written conclusion as text.
4. `npm run validate`, then `npm start`. The new substance appears automatically —
   no code changes.

Minimal example:

```json
{
  "id": "zinc",
  "name": "Zinc (Zn)",
  "type": "mineral",
  "category": "Essential trace mineral",
  "aliases": ["zn"],
  "defaultMode": "deficiency",
  "conditions": [{
    "mode": "deficiency",
    "label": "Deficiency",
    "description": "Impairs growth, immunity and wound healing.",
    "affects": [{
      "organ": "skin",
      "system": "Integumentary system",
      "effectType": "morphological",
      "severity": "medium",
      "effect": "Dermatitis and impaired wound healing",
      "detail": "...",
      "ageModifiers": { "child": "Growth retardation and delayed puberty." }
    }],
    "references": [{ "title": "Zinc Fact Sheet", "source": "NIH ODS", "url": "https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/" }]
  }]
}
```

### Adding a brand-new organ mesh

If you need an organ the 3D model doesn't have yet, register it in
`src/body3d.js` (`_buildOrgans` + `ORGAN_LABEL`) and document the key in
`src/data/schema.md`.

---

## About the data and CTD

The app's data model mirrors the "chemical → affected organ/system →
morphological/anatomical/physiological/disease outcome" structure used by the
**Comparative Toxicogenomics Database (CTD)**. The bundled entries are curated
and individually cited.

CTD's full dataset is very large and its bulk downloads carry licensing and
attribution terms, so it is **not** redistributed inside this app. To integrate
CTD at scale, use their official batch-query / API within their terms and map
results into this schema:

- CTD: <https://ctdbase.org/> · downloads: <https://ctdbase.org/downloads/>

Each substance file keeps its own `references[]` so provenance stays attached to
the data.

## Architecture

```
chembody-explorer/
├─ electron/
│  ├─ main.js            Main process, window, external-link handling
│  └─ preload.js         Secure bridge: reads src/data/substances/*.json
├─ src/
│  ├─ index.html         UI shell + Three.js import map
│  ├─ styles.css         Theme
│  ├─ renderer.js        Search, filters, conclusion rendering
│  ├─ body3d.js          Transparent 3D body + organ highlighting (Three.js)
│  └─ data/
│     ├─ schema.md       Data schema + organ vocabulary
│     └─ substances/     One JSON file per substance  ← add here
├─ scripts/validate-data.js
└─ package.json
```

Security: the renderer runs with `contextIsolation: true` and
`nodeIntegration: false`; file access is mediated by the preload bridge, and
external reference links open in the system browser.

## License

MIT.
