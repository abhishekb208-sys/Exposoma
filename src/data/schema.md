# ChemBody Explorer — Substance Data Schema

Every substance is one JSON file in `src/data/substances/`. The file name is
free-form but should match the `id` (e.g. `vitamin-d.json`). Add a new file and
it appears in the app automatically on next launch.

## Top-level object

| Field         | Type     | Required | Notes |
|---------------|----------|----------|-------|
| `id`          | string   | yes      | Unique slug, e.g. `"vitamin-d"`. |
| `name`        | string   | yes      | Display name, e.g. `"Vitamin D (Cholecalciferol)"`. |
| `type`        | string   | yes      | One of: `vitamin`, `mineral`, `protein`, `biomolecule`, `metal`, `chemical`, `drug`. |
| `category`    | string   | no       | Short human label shown as a chip, e.g. `"Fat-soluble vitamin"`. |
| `aliases`     | string[] | no       | Alternate names / synonyms used by search. |
| `casRN`       | string   | no       | CAS Registry Number when applicable. |
| `summary`     | string   | no       | One or two sentences describing the substance. |
| `defaultMode` | string   | no       | Which condition `mode` to select first. Defaults to the first condition. |
| `conditions`  | object[] | yes      | See below. At least one. |
| `disclaimer`  | string   | no       | Optional per-substance note. |

## Condition object

A "condition" is a scenario — typically `deficiency` for nutrients or
`toxicity`/`exposure` for chemicals and metals.

| Field         | Type     | Required | Notes |
|---------------|----------|----------|-------|
| `mode`        | string   | yes      | `deficiency`, `excess`, `toxicity`, `exposure`, `insufficiency`. |
| `label`       | string   | yes      | UI label, e.g. `"Deficiency"`. |
| `description` | string   | no       | Overview of this scenario. |
| `affects`     | object[] | yes      | Affected body parts (see below). |
| `references`  | object[] | no       | `{ "title", "source", "url" }`. |

## Affect object

| Field            | Type   | Required | Notes |
|------------------|--------|----------|-------|
| `organ`          | string | yes      | Must be a key from the ORGAN VOCABULARY below. |
| `system`         | string | no       | Body system label, e.g. `"Skeletal system"`. |
| `effectType`     | string | yes      | `morphological`, `anatomical`, `physiological`, `biochemical`, `disease`. |
| `severity`       | string | yes      | `low`, `medium`, `high`. Drives glow colour/intensity. |
| `effect`         | string | yes      | Short effect title shown as the 3D label + conclusion headline. |
| `detail`         | string | no       | Longer explanation for the conclusion panel. |
| `ageModifiers`   | object | no       | Keys: `infant`, `child`, `adolescent`, `adult`, `elderly`. |
| `genderModifiers`| object | no       | Keys: `male`, `female`. |

`ageModifiers` / `genderModifiers` values are extra sentences appended to the
conclusion when the user selects that age band or gender.

## ORGAN VOCABULARY (keys that light up in the 3D model)

Discrete organs:
`brain`, `eyes`, `teeth`, `thyroid`, `heart`, `lungs`, `liver`, `stomach`,
`pancreas`, `spleen`, `kidneys`, `intestines`, `bladder`, `reproductive`,
`spine`

Whole-body / tissue fields (tint the body shell or skeleton):
`skin`, `muscles`, `skeleton`, `blood`, `nerves`, `hair`

Any `organ` value outside this list is still shown in the written conclusion,
but will not highlight a mesh. To add a new organ mesh, register it in
`src/body3d.js` (`ORGAN_SPECS`) and document the key here.
