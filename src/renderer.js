import { BodyModel } from './body3d.js';

const EFFECT_TYPE_LABEL = {
  morphological: 'Morphological',
  anatomical: 'Anatomical',
  physiological: 'Physiological',
  biochemical: 'Biochemical',
  disease: 'Disease'
};

const AGE_BANDS = [
  { key: 'infant', label: 'Infant', max: 1 },
  { key: 'child', label: 'Child', max: 12 },
  { key: 'adolescent', label: 'Adolescent', max: 17 },
  { key: 'adult', label: 'Adult', max: 64 },
  { key: 'elderly', label: 'Older adult', max: 200 }
];

const state = {
  substances: [],
  current: null,
  currentMode: null,
  body: null
};

const el = (id) => document.getElementById(id);

function ageToBand(age) {
  const n = Number(age);
  if (Number.isNaN(n)) return AGE_BANDS[3];
  return AGE_BANDS.find((b) => n <= b.max) || AGE_BANDS[AGE_BANDS.length - 1];
}

function init() {
  const { substances, errors } = window.api.getSubstances();
  state.substances = substances;

  if (errors && errors.length) {
    const box = el('loadErrors');
    box.hidden = false;
    box.innerHTML = '<strong>Data load warnings:</strong><br>' + errors.map(escapeHtml).join('<br>');
  }

  el('libCount').textContent = `(${substances.length})`;
  renderBrowseList();
  wireEvents();

  // Instantiate the 3D model once the viewport has a size.
  state.body = new BodyModel(el('viewport'));
}

function wireEvents() {
  const search = el('search');
  search.addEventListener('input', onSearchInput);
  search.addEventListener('keydown', onSearchKey);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) hideSuggestions();
  });

  el('age').addEventListener('input', () => {
    el('ageBand').textContent = ageToBand(el('age').value).label;
    if (state.current) renderCondition();
  });
  el('gender').addEventListener('change', () => { if (state.current) renderCondition(); });
  el('resetView').addEventListener('click', () => state.body && state.body.resetView());
}

/* ---------- Search / suggestions ---------- */

function matches(sub, q) {
  const hay = [sub.name, sub.id, sub.type, sub.category, ...(sub.aliases || [])]
    .filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

let activeSuggestion = -1;

function onSearchInput() {
  const q = el('search').value.trim().toLowerCase();
  if (!q) return hideSuggestions();
  const hits = state.substances.filter((s) => matches(s, q)).slice(0, 8);
  const box = el('suggestions');
  if (!hits.length) {
    box.innerHTML = '<div class="suggestion"><span class="s-alias">No match found</span></div>';
    box.hidden = false;
    return;
  }
  activeSuggestion = -1;
  box.innerHTML = hits.map((s, i) => `
    <div class="suggestion" data-id="${s.id}" data-i="${i}">
      <span class="s-name">${escapeHtml(s.name)}</span>
      <span class="s-alias">${escapeHtml(s.category || s.type || '')}</span>
    </div>`).join('');
  box.hidden = false;
  box.querySelectorAll('.suggestion').forEach((node) => {
    node.addEventListener('click', () => selectById(node.dataset.id));
  });
}

function onSearchKey(e) {
  const box = el('suggestions');
  if (box.hidden) return;
  const items = [...box.querySelectorAll('.suggestion[data-id]')];
  if (e.key === 'ArrowDown') { e.preventDefault(); activeSuggestion = Math.min(activeSuggestion + 1, items.length - 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeSuggestion = Math.max(activeSuggestion - 1, 0); }
  else if (e.key === 'Enter') {
    const pick = items[activeSuggestion] || items[0];
    if (pick) selectById(pick.dataset.id);
    return;
  } else if (e.key === 'Escape') { hideSuggestions(); return; }
  items.forEach((n, i) => n.classList.toggle('active', i === activeSuggestion));
}

function hideSuggestions() {
  el('suggestions').hidden = true;
  activeSuggestion = -1;
}

/* ---------- Library ---------- */

function renderBrowseList() {
  const list = el('browseList');
  list.innerHTML = state.substances.map((s) => `
    <div class="browse-item" data-id="${s.id}">
      <span class="b-name">${escapeHtml(s.name)}</span>
      <span class="type-tag">${escapeHtml(s.type || '')}</span>
    </div>`).join('');
  list.querySelectorAll('.browse-item').forEach((node) => {
    node.addEventListener('click', () => selectById(node.dataset.id));
  });
}

function markActiveInLibrary(id) {
  document.querySelectorAll('.browse-item').forEach((n) =>
    n.classList.toggle('active', n.dataset.id === id));
}

/* ---------- Selection + rendering ---------- */

function selectById(id) {
  const sub = state.substances.find((s) => s.id === id);
  if (!sub) return;
  state.current = sub;
  hideSuggestions();
  el('search').value = sub.name;
  markActiveInLibrary(id);

  // Choose default mode/condition
  const modes = sub.conditions.map((c) => c.mode);
  state.currentMode = modes.includes(sub.defaultMode) ? sub.defaultMode : modes[0];

  renderModeChips();
  renderHeader();
  renderCondition();
}

function renderModeChips() {
  const sub = state.current;
  const panel = el('modePanel');
  if (sub.conditions.length <= 1) {
    panel.hidden = false;
  } else {
    panel.hidden = false;
  }
  const wrap = el('modeChips');
  wrap.innerHTML = sub.conditions.map((c) => `
    <div class="chip ${c.mode === state.currentMode ? 'active' : ''}" data-mode="${escapeHtml(c.mode)}">
      ${escapeHtml(c.label || c.mode)}
    </div>`).join('');
  wrap.querySelectorAll('.chip').forEach((node) => {
    node.addEventListener('click', () => {
      state.currentMode = node.dataset.mode;
      renderModeChips();
      renderCondition();
    });
  });
}

function renderHeader() {
  const sub = state.current;
  const aliases = (sub.aliases || []).slice(0, 6).join(' · ');
  el('substanceTitle').innerHTML = `
    <h2>${escapeHtml(sub.name)}</h2>
    ${sub.category ? `<span class="cat-chip">${escapeHtml(sub.category)}</span>` : ''}
    ${aliases ? `<p class="sub-aliases">Also: ${escapeHtml(aliases)}</p>` : ''}
    ${sub.summary ? `<p class="sub-summary">${escapeHtml(sub.summary)}</p>` : ''}
  `;
}

function currentCondition() {
  return state.current.conditions.find((c) => c.mode === state.currentMode) || state.current.conditions[0];
}

function renderCondition() {
  const sub = state.current;
  const cond = currentCondition();
  const band = ageToBand(el('age').value);
  const gender = el('gender').value;

  // Hide empty hint, show legend
  el('emptyHint').style.display = 'none';
  el('legend').hidden = false;

  // 3D highlight
  const affected = cond.affects.map((a) => ({
    organ: a.organ,
    severity: a.severity,
    text: a.effect
  }));
  state.body.highlight(affected);

  // Conclusion
  renderConclusion(sub, cond, band, gender);
}

function renderConclusion(sub, cond, band, gender) {
  const box = el('conclusion');
  box.hidden = false;

  const findings = cond.affects.map((a) => {
    const typeLabel = EFFECT_TYPE_LABEL[a.effectType] || a.effectType || '';
    const ageMod = a.ageModifiers && a.ageModifiers[band.key];
    const genderMod = a.genderModifiers && gender && a.genderModifiers[gender];
    const mods = [ageMod, genderMod].filter(Boolean);

    return `
      <div class="finding">
        <div class="bar ${a.severity}"></div>
        <div>
          <div class="f-head">
            <span class="f-organ">${escapeHtml(organName(a.organ))}</span>
            ${a.system ? `<span class="tag">${escapeHtml(a.system)}</span>` : ''}
            ${typeLabel ? `<span class="tag">${escapeHtml(typeLabel)}</span>` : ''}
          </div>
          <p class="f-effect">${escapeHtml(a.effect)}</p>
          ${a.detail ? `<p class="f-detail">${escapeHtml(a.detail)}</p>` : ''}
          ${mods.length ? `<p class="f-mod">${mods.map(escapeHtml).join(' ')}</p>` : ''}
        </div>
      </div>`;
  }).join('');

  const organsAffected = [...new Set(cond.affects.map((a) => organName(a.organ)))];
  const scenarioWord = (cond.label || cond.mode).toLowerCase();
  const genderWord = gender ? `${gender} ` : '';
  const headline = `In a ${genderWord}${band.label.toLowerCase()}, ${scenarioWord} of ${sub.name} primarily affects the ${listToSentence(organsAffected)}.`;

  const refs = (cond.references || []);
  const refsHtml = refs.length ? `
    <div class="refs">
      <h4>Scientific sources</h4>
      <ul>
        ${refs.map((r) => `<li><a href="${escapeAttr(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.title)}</a> — ${escapeHtml(r.source)}</li>`).join('')}
      </ul>
    </div>` : '';

  box.innerHTML = `
    <h3>Conclusion — ${escapeHtml(cond.label || cond.mode)}</h3>
    <p class="scenario-note">${escapeHtml(headline)}${cond.description ? ' ' + escapeHtml(cond.description) : ''}</p>
    ${findings}
    ${refsHtml}
    <p class="foot-note">${escapeHtml(sub.disclaimer || 'Educational summary of established physiology. Not a diagnosis, prognosis or treatment recommendation.')}</p>
  `;
}

/* ---------- helpers ---------- */

const ORGAN_DISPLAY = {
  brain: 'Brain', eyes: 'Eyes', teeth: 'Teeth / gums', thyroid: 'Thyroid gland',
  heart: 'Heart', lungs: 'Lungs', liver: 'Liver', stomach: 'Stomach',
  pancreas: 'Pancreas', spleen: 'Spleen', kidneys: 'Kidneys', intestines: 'Intestines',
  bladder: 'Bladder', reproductive: 'Reproductive organs', spine: 'Spine',
  skin: 'Skin', muscles: 'Muscles', skeleton: 'Skeleton (bone)', blood: 'Blood',
  nerves: 'Nervous system', hair: 'Hair'
};
function organName(key) { return ORGAN_DISPLAY[key] || key; }

function listToSentence(arr) {
  if (arr.length === 0) return 'body';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

window.addEventListener('DOMContentLoaded', init);
