// =============================================
//  LOCKETOCKE — Pokémon SoulSilver PAL (ES)
//  PokéAPI REST + GraphQL para nombres en español
// =============================================

// ── Tabla de efectividad de tipos ──────────────────────────────────────────
const TYPE_CHART = {
  normal:   { fighting:2, ghost:0 },
  fire:     { water:2, rock:2, ground:2, fire:.5, grass:.5, ice:.5, bug:.5, steel:.5, fairy:.5 },
  water:    { electric:2, grass:2, fire:.5, water:.5, ice:.5, steel:.5 },
  electric: { ground:2, flying:.5, electric:.5, steel:.5 },
  grass:    { fire:2, ice:2, poison:2, flying:2, bug:2, water:.5, grass:.5, ground:.5, electric:.5 },
  ice:      { fire:2, fighting:2, rock:2, steel:2, ice:.5 },
  fighting: { flying:2, psychic:2, fairy:2, rock:.5, bug:.5, dark:.5 },
  poison:   { ground:2, psychic:2, fighting:.5, grass:.5, poison:.5, bug:.5, fairy:.5 },
  ground:   { water:2, grass:2, ice:2, electric:0, rock:.5, poison:.5 },
  flying:   { electric:2, ice:2, rock:2, ground:0, fighting:.5, bug:.5, grass:.5 },
  psychic:  { bug:2, ghost:2, dark:2, fighting:.5, psychic:.5 },
  bug:      { fire:2, flying:2, rock:2, fighting:.5, ground:.5, grass:.5 },
  rock:     { water:2, grass:2, fighting:2, ground:2, steel:2, fire:.5, flying:.5, normal:.5, poison:.5 },
  ghost:    { ghost:2, dark:2, normal:0, fighting:0, poison:.5, bug:.5 },
  dragon:   { ice:2, dragon:2, fairy:2, fire:.5, water:.5, grass:.5, electric:.5 },
  dark:     { fighting:2, bug:2, fairy:2, ghost:.5, dark:.5, psychic:0 },
  steel:    { fire:2, fighting:2, ground:2, normal:.5, grass:.5, ice:.5, flying:.5, psychic:.5,
              bug:.5, rock:.5, dragon:.5, steel:.5, fairy:.5, poison:0 },
  fairy:    { poison:2, steel:2, fighting:.5, bug:.5, dark:.5, dragon:0 },
};

const TYPE_COLORS = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', electric:'#F8D030',
  grass:'#78C850', ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0',
  ground:'#E0C068', flying:'#A890F0', psychic:'#F85888', bug:'#A8B820',
  rock:'#B8A038', ghost:'#705898', dragon:'#7038F8', dark:'#705848',
  steel:'#B8B8D0', fairy:'#EE99AC',
};

const TYPE_NAMES_ES = {
  normal:'Normal', fire:'Fuego', water:'Agua', electric:'Eléctrico',
  grass:'Planta', ice:'Hielo', fighting:'Lucha', poison:'Veneno',
  ground:'Tierra', flying:'Volador', psychic:'Psíquico', bug:'Bicho',
  rock:'Roca', ghost:'Fantasma', dragon:'Dragón', dark:'Siniestro',
  steel:'Acero', fairy:'Hada',
};

const ITEM_NAMES_ES = {
  'fire-stone':'Piedra Fuego', 'water-stone':'Piedra Agua',
  'thunder-stone':'Piedra Trueno', 'leaf-stone':'Piedra Hoja',
  'moon-stone':'Piedra Lunar', 'sun-stone':'Piedra Solar',
  'shiny-stone':'Piedra Brillo', 'dusk-stone':'Piedra Noche',
  'dawn-stone':'Piedra Alba', 'oval-stone':'Piedra Oval',
  'kings-rock':'Roca del Rey', 'metal-coat':'Capa Metal',
  'dragon-scale':'Escama Dragón', 'upgrade':'Mejora',
  'dubious-disc':'Disco Raro', 'electirizer':'Electrizador',
  'magmarizer':'Magmatizador', 'protector':'Protector',
  'reaper-cloth':'Tela Macabra', 'deep-sea-tooth':'Diente Marino',
  'deep-sea-scale':'Escama Marina', 'prism-scale':'Escama Prisma',
  'razor-fang':'Colmillo Filo', 'razor-claw':'Garra Filo',
  'linking-cord':'Cordón Unión',
};

const STAT_COLORS = {
  hp:'#FF5959', attack:'#F5AC78', defense:'#FAE078',
  'special-attack':'#9DB7F5', 'special-defense':'#A7DB8D', speed:'#FA92B2',
};
const STAT_LABELS = {
  hp:'PS', attack:'Ataque', defense:'Defensa',
  'special-attack':'At. Esp', 'special-defense':'Def. Esp', speed:'Velocidad',
};

// ── Estado ─────────────────────────────────────────────────────────────────
let currentPokemon = null;
let selectedTypes = [];

// Mapas de traducción español↔inglés (cargados al arrancar vía GraphQL)
const esNameToEn    = { pokemon: {} };
const enToEsDisplay = { pokemon: {} };
let allPokemonNamesEs = [];   // para autocompletado

// ── Utilidades ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

function typeTag(type, small = false) {
  const span = document.createElement('span');
  span.className = 'type-badge';
  span.textContent = TYPE_NAMES_ES[type] || capitalize(type);
  span.style.background = TYPE_COLORS[type] || '#888';
  span.style.fontSize = small ? '10px' : '11px';
  span.style.padding = small ? '3px 9px' : '5px 14px';
  span.style.borderRadius = '20px';
  span.style.fontWeight = '800';
  span.style.color = '#fff';
  span.style.textShadow = '0 1px 2px rgba(0,0,0,.4)';
  span.style.display = 'inline-block';
  return span;
}

function calcEffectiveness(typeList) {
  const mult = {};
  for (const t of typeList) {
    const chart = TYPE_CHART[t] || {};
    for (const [atk, val] of Object.entries(chart)) {
      mult[atk] = (mult[atk] || 1) * val;
    }
  }
  return mult;
}

function renderWeaknesses(types, containerId, resistId) {
  const mult = calcEffectiveness(types);
  const weak = $( containerId );
  const resist = $( resistId );
  weak.innerHTML = '';
  resist.innerHTML = '';
  for (const [type, val] of Object.entries(mult)) {
    if (val <= 0 || val === 1) continue;
    const chip = document.createElement('span');
    chip.className = 'weakness-chip';
    chip.style.background = TYPE_COLORS[type] || '#888';
    chip.innerHTML = `${TYPE_NAMES_ES[type] || capitalize(type)}<span class="chip-multiplier">×${val}</span>`;
    weak.appendChild(chip);
  }
  for (const [type, val] of Object.entries(mult)) {
    if (val >= 1 || val === 0) continue;
    const chip = document.createElement('span');
    chip.className = 'weakness-chip';
    chip.style.background = (TYPE_COLORS[type] || '#888') + 'cc';
    chip.innerHTML = `${TYPE_NAMES_ES[type] || capitalize(type)}<span class="chip-multiplier">×${val}</span>`;
    resist.appendChild(chip);
  }
  if (!weak.innerHTML) weak.innerHTML = '<span style="color:var(--text-muted);font-size:13px;">Ninguna</span>';
  if (!resist.innerHTML) resist.innerHTML = '<span style="color:var(--text-muted);font-size:13px;">Ninguna</span>';
}

// ── BUSCAR POKÉMON ──────────────────────────────────────────────────────────
async function searchPokemon() {
  const raw = $('pokemon-input').value.trim().toLowerCase();
  if (!raw) return;
  const query = esNameToEn.pokemon[raw] || raw;

  $('pokemon-card').classList.add('hidden');
  $('search-error').classList.add('hidden');
  $('search-loading').classList.remove('hidden');

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();

    // Especie para generación
    const specRes = await fetch(data.species.url);
    const specData = await specRes.json();

    // Cadena evolutiva
    const evoRes = await fetch(specData.evolution_chain.url);
    const evoData = await evoRes.json();

    currentPokemon = { data, specData, evoData };
    $('search-loading').classList.add('hidden');
    renderCard(data, evoData);
  } catch {
    $('search-loading').classList.add('hidden');
    $('search-error').classList.remove('hidden');
  }
}

function renderCard(data, evoData) {
  // Nombre y número
  $('card-name').textContent = enToEsDisplay.pokemon[data.name] || capitalize(data.name);
  $('card-number').textContent = `#${String(data.id).padStart(4,'0')}`;

  // Tipos
  const typesEl = $('card-types');
  typesEl.innerHTML = '';
  const typeNames = data.types.map(t => t.type.name);
  typeNames.forEach(t => typesEl.appendChild(typeTag(t)));

  // Sprites
  $('card-sprite').src = data.sprites.front_default || '';
  $('card-sprite-shiny').src = data.sprites.front_shiny || data.sprites.front_default || '';

  // Stats
  const statsEl = $('stats-bars');
  statsEl.innerHTML = '';
  let total = 0;
  for (const s of data.stats) {
    const name = s.stat.name;
    const val = s.base_stat;
    total += val;
    const max = 255;
    const pct = Math.min(100, (val / max) * 100);
    const color = STAT_COLORS[name] || '#aaa';
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-label">${STAT_LABELS[name] || name}</span>
      <span class="stat-val" style="color:${color}">${val}</span>
      <div class="stat-bar-bg">
        <div class="stat-bar-fill" style="width:0%;background:${color}" data-pct="${pct}"></div>
      </div>`;
    statsEl.appendChild(row);
  }
  $('total-stats').textContent = `Total: ${total}`;
  // Animar barras
  setTimeout(() => {
    document.querySelectorAll('.stat-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 50);

  // Debilidades y resistencias
  renderWeaknesses(typeNames, 'weaknesses-list', 'resistances-list');

  // Cadena evolutiva
  renderEvoChain(evoData.chain);

  $('pokemon-card').classList.remove('hidden');
}

// Convierte los detalles de evolución de la API en texto legible en español
function formatEvoTrigger(details) {
  if (!details || !details.length) return null;
  const d = details[0];
  const parts = [];

  if (d.trigger.name === 'trade') {
    if (d.held_item) parts.push(`Intercambio con ${ITEM_NAMES_ES[d.held_item.name] || capitalize(d.held_item.name.replace(/-/g,' '))}`);
    else parts.push('Intercambio');
  } else if (d.trigger.name === 'use-item') {
    const item = d.item?.name || '';
    parts.push(ITEM_NAMES_ES[item] || capitalize(item.replace(/-/g,' ')));
  } else if (d.trigger.name === 'level-up') {
    if (d.min_level)      parts.push(`Nv. ${d.min_level}`);
    else if (d.min_happiness) parts.push('Amistad');
    else if (d.min_affection) parts.push('Afecto');
    else if (d.known_move)    parts.push(`Conocer ${capitalize(d.known_move.name.replace(/-/g,' '))}`);
    else if (d.location)      parts.push(capitalize(d.location.name.replace(/-/g,' ')));
    else if (d.relative_physical_stats === 1)  parts.push('Atk > Def');
    else if (d.relative_physical_stats === -1) parts.push('Atk < Def');
    else if (d.relative_physical_stats === 0)  parts.push('Atk = Def');
    else parts.push('Subir nivel');

    if (d.held_item)             parts.push(`con ${ITEM_NAMES_ES[d.held_item.name] || capitalize(d.held_item.name.replace(/-/g,' '))}`);
    if (d.time_of_day === 'day')   parts.push('(día)');
    if (d.time_of_day === 'night') parts.push('(noche)');
    if (d.needs_overworld_rain)    parts.push('(lluvia)');
  } else if (d.trigger.name === 'shed') {
    parts.push('Muda');
  } else {
    parts.push(capitalize(d.trigger.name.replace(/-/g,' ')));
  }

  return parts.join(' ');
}

function makePokeBubble(node) {
  const poke = document.createElement('div');
  poke.className = 'evo-poke';
  const img = document.createElement('img');
  img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${getIdFromUrl(node.species.url)}.png`;
  img.alt = node.species.name;
  const name = document.createElement('span');
  name.textContent = enToEsDisplay.pokemon[node.species.name] || capitalize(node.species.name);
  poke.appendChild(img);
  poke.appendChild(name);
  poke.onclick = () => {
    $('pokemon-input').value = node.species.name;
    searchPokemon();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return poke;
}

function makeConnector(details) {
  const conn = document.createElement('div');
  conn.className = 'evo-connector';
  const label = formatEvoTrigger(details);
  if (label) {
    const pill = document.createElement('span');
    pill.className = 'evo-trigger';
    pill.textContent = label;
    conn.appendChild(pill);
  }
  const arrow = document.createElement('span');
  arrow.className = 'evo-arrow';
  arrow.textContent = '→';
  conn.appendChild(arrow);
  return conn;
}

function renderEvoChain(chain) {
  const container = $('evo-chain');
  container.innerHTML = '';
  flattenChain(chain, container);
}

function flattenChain(node, container) {
  container.appendChild(makePokeBubble(node));

  if (!node.evolves_to?.length) return;

  if (node.evolves_to.length > 1) {
    // Varias ramas: columna de ramificaciones
    const branchWrap = document.createElement('div');
    branchWrap.className = 'evo-branches';
    node.evolves_to.forEach(next => {
      const row = document.createElement('div');
      row.className = 'evo-branch-row';
      row.appendChild(makeConnector(next.evolution_details));
      flattenChain(next, row);
      branchWrap.appendChild(row);
    });
    container.appendChild(branchWrap);
  } else {
    const next = node.evolves_to[0];
    container.appendChild(makeConnector(next.evolution_details));
    flattenChain(next, container);
  }
}

function getIdFromUrl(url) {
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

// ── AUTOCOMPLETADO ──────────────────────────────────────────────────────────
function getSuggestions(query) {
  const pool = allPokemonNamesEs.length ? allPokemonNamesEs : allPokemonNames;
  if (!query || !pool.length) return [];
  const q = query.toLowerCase();
  const starts = pool.filter(n => n.startsWith(q));
  const contains = pool.filter(n => !n.startsWith(q) && n.includes(q));
  return [...starts, ...contains].slice(0, 8);
}

function showSuggestions(names) {
  const ul = $('suggestions');
  ul.innerHTML = '';
  if (!names.length) { ul.classList.add('hidden'); return; }
  names.forEach(name => {
    const li = document.createElement('li');
    li.textContent = capitalize(name.replace(/-/g, ' '));
    li.dataset.value = name;
    li.addEventListener('mousedown', e => {
      e.preventDefault(); // evita que el input pierda foco antes del click
      $('pokemon-input').value = name;
      ul.classList.add('hidden');
      searchPokemon();
    });
    ul.appendChild(li);
  });
  ul.classList.remove('hidden');
}

function initAutocomplete() {
  const input = $('pokemon-input');
  const ul = $('suggestions');

  input.addEventListener('input', () => {
    showSuggestions(getSuggestions(input.value.trim()));
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { ul.classList.add('hidden'); return; }
    if (e.key === 'Enter') { ul.classList.add('hidden'); return; }
    // Navegación con flechas
    const items = ul.querySelectorAll('li');
    if (!items.length) return;
    const active = ul.querySelector('li.ac-active');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = active ? active.nextElementSibling : items[0];
      if (next) { active?.classList.remove('ac-active'); next.classList.add('ac-active'); input.value = next.dataset.value; }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = active?.previousElementSibling;
      if (prev) { active.classList.remove('ac-active'); prev.classList.add('ac-active'); input.value = prev.dataset.value; }
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-input-wrap')) ul.classList.add('hidden');
  });
}

// ── TABLA DE TIPOS ──────────────────────────────────────────────────────────
function buildTypeButtons() {
  const container = $('type-buttons');
  Object.keys(TYPE_COLORS).forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'type-btn';
    btn.textContent = TYPE_NAMES_ES[type] || capitalize(type);
    btn.style.background = TYPE_COLORS[type];
    btn.dataset.type = type;
    btn.onclick = () => toggleType(type, btn);
    container.appendChild(btn);
  });
}

function toggleType(type, btn) {
  if (selectedTypes.includes(type)) {
    selectedTypes = selectedTypes.filter(t => t !== type);
    btn.classList.remove('selected');
  } else {
    if (selectedTypes.length >= 2) {
      // Deseleccionar el primero
      const old = selectedTypes.shift();
      document.querySelector(`.type-btn[data-type="${old}"]`)?.classList.remove('selected');
    }
    selectedTypes.push(type);
    btn.classList.add('selected');
  }
  updateTypeResult();
}

function updateTypeResult() {
  const res = $('type-result');
  if (!selectedTypes.length) { res.classList.add('hidden'); return; }
  res.classList.remove('hidden');

  const mult = calcEffectiveness(selectedTypes);
  const seEl = $('super-effective');
  const neEl = $('not-effective');
  const imEl = $('immune');
  seEl.innerHTML = ''; neEl.innerHTML = ''; imEl.innerHTML = '';

  Object.entries(mult).forEach(([type, val]) => {
    const chip = document.createElement('span');
    chip.className = 'weakness-chip';
    chip.style.background = TYPE_COLORS[type] || '#888';
    const nameEs = TYPE_NAMES_ES[type] || capitalize(type);
    if (val === 0) {
      chip.innerHTML = nameEs;
      imEl.appendChild(chip);
    } else if (val > 1) {
      chip.innerHTML = `${nameEs}<span class="chip-multiplier">×${val}</span>`;
      seEl.appendChild(chip);
    } else if (val < 1) {
      chip.innerHTML = `${nameEs}<span class="chip-multiplier">×${val}</span>`;
      neEl.appendChild(chip);
    }
  });

  // Tipos sin efecto especial => tampoco inmunes ni alterados (×1) no se muestran
  ['se','ne','im'].forEach(k => {
    const el = k==='se' ? seEl : k==='ne' ? neEl : imEl;
    if (!el.innerHTML) el.innerHTML = '<span style="color:var(--text-muted);font-size:13px;">Ninguno</span>';
  });
}

// ── TABLA DE TIPOS GEN 4 ────────────────────────────────────────────────────
const GEN4_TYPES = ['normal','fire','water','electric','grass','ice','fighting',
  'poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel'];

// Chart defensivo de Gen 4 (derivado de TYPE_CHART con corrección para Steel)
const GEN4_DEF_CHART = (() => {
  const c = {};
  for (const t of GEN4_TYPES) {
    c[t] = {};
    for (const [atk, m] of Object.entries(TYPE_CHART[t] || {})) {
      if (GEN4_TYPES.includes(atk)) c[t][atk] = m;
    }
  }
  // En Gen 4, Steel resistía Ghost y Dark (quitado en Gen 6)
  c.steel.ghost = 0.5;
  c.steel.dark  = 0.5;
  return c;
})();

// Chart atacante Gen 4: atacante → defensor → multiplicador
const GEN4_ATK_CHART = (() => {
  const c = {};
  for (const atk of GEN4_TYPES) {
    c[atk] = {};
    for (const def of GEN4_TYPES) {
      const m = GEN4_DEF_CHART[def][atk];
      if (m !== undefined) c[atk][def] = m;
    }
  }
  return c;
})();

function renderTypeTable() {
  const table = $('type-table');
  table.innerHTML = '';

  // Fila de cabecera (columnas = tipo defensor)
  const thead = table.createTHead();
  const hr = thead.insertRow();
  const corner = document.createElement('th');
  corner.className = 'ttc-corner';
  corner.innerHTML = 'ATQ&nbsp;↓&nbsp;&nbsp;DEF&nbsp;→';
  hr.appendChild(corner);
  for (const def of GEN4_TYPES) {
    const th = document.createElement('th');
    th.className = 'ttc-col';
    th.style.background = TYPE_COLORS[def];
    th.innerHTML = `<span>${TYPE_NAMES_ES[def]}</span>`;
    hr.appendChild(th);
  }

  // Filas (filas = tipo atacante)
  const tbody = table.createTBody();
  for (const atk of GEN4_TYPES) {
    const row = tbody.insertRow();
    const th = document.createElement('th');
    th.className = 'ttc-row';
    th.style.background = TYPE_COLORS[atk];
    th.textContent = TYPE_NAMES_ES[atk];
    row.appendChild(th);
    for (const def of GEN4_TYPES) {
      const td = row.insertCell();
      const m = GEN4_ATK_CHART[atk][def];
      if (m === 2)   { td.className = 'tc-2x';   td.textContent = '2'; }
      else if (m === 0.5) { td.className = 'tc-half'; td.textContent = '½'; }
      else if (m === 0)   { td.className = 'tc-0x';   td.textContent = '0'; }
      else td.className = 'tc-1x';
    }
    tbody.appendChild(row);
  }
}


// ── TABS ────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.classList.add('hidden');
      });
      tab.classList.add('active');
      const id = `tab-${tab.dataset.tab}`;
      $(id).classList.remove('hidden');
      $(id).classList.add('active');
    });
  });
}

// ── INIT ────────────────────────────────────────────────────────────────────
function init() {
  initTabs();
  buildTypeButtons();
  renderTypeTable();
  loadSpanishNames();
  renderNiveles();

  $('btn-search').addEventListener('click', searchPokemon);
  initAutocomplete();
  initOcr();
}

document.addEventListener('DOMContentLoaded', init);

// ── NIVELES ──────────────────────────────────────────────────────────────────
const NIVEL_COLORS = {
  gimnasio:'#3d7dca', altomando:'#705898', campeon:'#f08030', final:'#e53935',
};

const NIVELES_SECTIONS = [
  { titulo: 'Líderes de Johto', entries: [
    { tipo:'gimnasio', nombre:'Álvaro', subtitulo:'1.er Gimnasio · Ciudad Malva · Volador', nivelCap:13, spriteKey:'falkner',
      pokemon:[{n:'Pidgey',nv:9,id:16},{n:'Pidgeotto',nv:13,id:17}] },
    { tipo:'gimnasio', nombre:'Lino', subtitulo:'2.º Gimnasio · Ciudad Azalea · Bicho', nivelCap:16, spriteKey:'bugsy',
      pokemon:[{n:'Metapod',nv:14,id:11},{n:'Kakuna',nv:14,id:14},{n:'Scyther',nv:16,id:123}] },
    { tipo:'gimnasio', nombre:'Blanca', subtitulo:'3.er Gimnasio · Ciudad Trigal · Normal', nivelCap:19, spriteKey:'whitney',
      pokemon:[{n:'Clefairy',nv:17,id:35},{n:'Miltank',nv:19,id:241}] },
    { tipo:'gimnasio', nombre:'Fausto', subtitulo:'4.º Gimnasio · Ciudad Tilo · Fantasma', nivelCap:25, spriteKey:'morty',
      pokemon:[{n:'Gastly',nv:21,id:92},{n:'Haunter',nv:21,id:93},{n:'Haunter',nv:23,id:93},{n:'Gengar',nv:25,id:94}] },
    { tipo:'gimnasio', nombre:'Willy', subtitulo:'5.º Gimnasio · Ciudad Olivo · Lucha', nivelCap:30, spriteKey:'chuck',
      pokemon:[{n:'Primeape',nv:27,id:57},{n:'Poliwrath',nv:30,id:62}] },
    { tipo:'gimnasio', nombre:'Marina', subtitulo:'6.º Gimnasio · Ciudad Faro · Acero', nivelCap:35, spriteKey:'jasmine',
      pokemon:[{n:'Magnemite',nv:30,id:81},{n:'Magnemite',nv:30,id:81},{n:'Steelix',nv:35,id:208}] },
    { tipo:'gimnasio', nombre:'Arcadio', subtitulo:'7.º Gimnasio · Ciudad Caoba · Hielo', nivelCap:31, spriteKey:'pryce',
      pokemon:[{n:'Seel',nv:27,id:86},{n:'Dewgong',nv:29,id:87},{n:'Piloswine',nv:31,id:221}] },
    { tipo:'gimnasio', nombre:'Clara', subtitulo:'8.º Gimnasio · Ciudad Pétrea · Dragón', nivelCap:41, spriteKey:'clair',
      pokemon:[{n:'Gyarados',nv:38,id:130},{n:'Dragonair',nv:38,id:148},{n:'Dragonair',nv:38,id:148},{n:'Kingdra',nv:41,id:230}] },
  ]},
  { titulo: 'Alto Mando + Campeón · Johto', entries: [
    { tipo:'altomando', nombre:'Guille', subtitulo:'Alto Mando · Psíquico', nivelCap:42, spriteKey:'will',
      pokemon:[{n:'Xatu',nv:40,id:178},{n:'Jynx',nv:41,id:124},{n:'Slowbro',nv:41,id:80},{n:'Exeggutor',nv:41,id:103},{n:'Xatu',nv:42,id:178}] },
    { tipo:'altomando', nombre:'Koga', subtitulo:'Alto Mando · Veneno', nivelCap:44, spriteKey:'koga',
      pokemon:[{n:'Ariados',nv:40,id:168},{n:'Venomoth',nv:41,id:49},{n:'Forretress',nv:43,id:205},{n:'Muk',nv:42,id:89},{n:'Crobat',nv:44,id:169}] },
    { tipo:'altomando', nombre:'Bruno', subtitulo:'Alto Mando · Lucha', nivelCap:46, spriteKey:'bruno',
      pokemon:[{n:'Hitmontop',nv:42,id:237},{n:'Hitmonlee',nv:42,id:106},{n:'Hitmonchan',nv:42,id:107},{n:'Onix',nv:43,id:95},{n:'Machamp',nv:46,id:68}] },
    { tipo:'altomando', nombre:'Karen', subtitulo:'Alto Mando · Siniestro', nivelCap:47, spriteKey:'karen',
      pokemon:[{n:'Umbreon',nv:42,id:197},{n:'Vileplume',nv:42,id:45},{n:'Murkrow',nv:44,id:198},{n:'Gengar',nv:45,id:94},{n:'Houndoom',nv:47,id:229}] },
    { tipo:'campeon', nombre:'Lance', subtitulo:'Campeón Johto', nivelCap:50, spriteKey:'lance',
      pokemon:[{n:'Gyarados',nv:44,id:130},{n:'Dragonite',nv:47,id:149},{n:'Dragonite',nv:47,id:149},{n:'Aerodactyl',nv:46,id:142},{n:'Charizard',nv:46,id:6},{n:'Dragonite',nv:50,id:149}] },
  ]},
  { titulo: 'Líderes de Kanto', entries: [
    { tipo:'gimnasio', nombre:'Brock', subtitulo:'Ciudad Plateada · Roca', nivelCap:54, spriteKey:'brock',
      pokemon:[{n:'Graveler',nv:51,id:75},{n:'Rhyhorn',nv:51,id:111},{n:'Omastar',nv:52,id:139},{n:'Kabutops',nv:52,id:141},{n:'Onix',nv:54,id:95}] },
    { tipo:'gimnasio', nombre:'Misty', subtitulo:'Ciudad Celeste · Agua', nivelCap:54, spriteKey:'misty',
      pokemon:[{n:'Golduck',nv:49,id:55},{n:'Quagsire',nv:49,id:195},{n:'Lapras',nv:52,id:131},{n:'Starmie',nv:54,id:121}] },
    { tipo:'gimnasio', nombre:'Electro', subtitulo:'Ciudad Bermellón · Eléctrico', nivelCap:53, spriteKey:'lt-surge',
      pokemon:[{n:'Raichu',nv:51,id:26},{n:'Electrode',nv:51,id:101},{n:'Magneton',nv:53,id:82},{n:'Electabuzz',nv:53,id:125}] },
    { tipo:'gimnasio', nombre:'Erica', subtitulo:'Ciudad Carmín · Planta', nivelCap:54, spriteKey:'erika',
      pokemon:[{n:'Jumpluff',nv:51,id:189},{n:'Tangela',nv:52,id:114},{n:'Victreebel',nv:52,id:71},{n:'Bellossom',nv:54,id:182}] },
    { tipo:'gimnasio', nombre:'Sachiko', subtitulo:'Ciudad Azafrán · Veneno', nivelCap:54, spriteKey:'janine',
      pokemon:[{n:'Crobat',nv:52,id:169},{n:'Ariados',nv:53,id:168},{n:'Weezing',nv:53,id:110},{n:'Venomoth',nv:54,id:49},{n:'Weezing',nv:54,id:110}] },
    { tipo:'gimnasio', nombre:'Sabrina', subtitulo:'Ciudad Lavanda · Psíquico', nivelCap:55, spriteKey:'sabrina',
      pokemon:[{n:'Espeon',nv:53,id:196},{n:'Mr. Mime',nv:53,id:122},{n:'Jynx',nv:53,id:124},{n:'Alakazam',nv:55,id:65}] },
    { tipo:'gimnasio', nombre:'Telmo', subtitulo:'Monte Llamas · Fuego', nivelCap:55, spriteKey:'blaine',
      pokemon:[{n:'Magcargo',nv:54,id:219},{n:'Magmar',nv:54,id:126},{n:'Rapidash',nv:55,id:78}] },
    { tipo:'campeon', nombre:'Azul', subtitulo:'Ciudad Verde · Antiguo Campeón', nivelCap:58, spriteKey:'blue',
      pokemon:[{n:'Pidgeot',nv:56,id:18},{n:'Alakazam',nv:57,id:65},{n:'Rhydon',nv:58,id:112},{n:'Arcanine',nv:58,id:59},{n:'Exeggutor',nv:58,id:103},{n:'Gyarados',nv:58,id:130}] },
  ]},
  { titulo: 'Monte Plata', entries: [
    { tipo:'final', nombre:'Rojo', subtitulo:'El Maestro Pokémon', nivelCap:88, spriteKey:'red',
      pokemon:[{n:'Pikachu',nv:88,id:25},{n:'Espeon',nv:85,id:196},{n:'Snorlax',nv:82,id:143},{n:'Lapras',nv:80,id:131},{n:'Charizard',nv:84,id:6},{n:'Blastoise',nv:84,id:9}] },
  ]},
];

function renderNiveles() {
  const container = $('niveles-list');
  container.innerHTML = '';

  NIVELES_SECTIONS.forEach(section => {
    // Cabecera de sección
    const secDiv = document.createElement('div');
    secDiv.className = 'nivel-seccion';
    secDiv.textContent = section.titulo;
    container.appendChild(secDiv);

    // Tabla
    const wrap = document.createElement('div');
    wrap.className = 'nivel-table-wrap';
    const table = document.createElement('table');
    table.className = 'nivel-table';

    // Número de columnas Pokémon = máximo del equipo más grande de la sección
    const maxPoke = Math.max(...section.entries.map(e => e.pokemon.length));

    section.entries.forEach((entry, idx) => {
      const color = NIVEL_COLORS[entry.tipo] || '#3d7dca';
      const tr = document.createElement('tr');
      tr.className = idx % 2 === 0 ? 'nivel-tr-a' : 'nivel-tr-b';

      // Celda entrenador
      const tdT = document.createElement('td');
      tdT.className = 'nivel-td-trainer';
      tdT.style.borderLeftColor = color;

      const trainerImg = document.createElement('img');
      trainerImg.className = 'nivel-trainer-img';
      trainerImg.src = `https://img.pokemondb.net/sprites/trainers/heartgold-soulsilver/${entry.spriteKey}.png`;
      trainerImg.alt = entry.nombre;
      trainerImg.onerror = function() {
        this.replaceWith(makeFallbackCircle(entry.nombre[0], color));
      };
      tdT.appendChild(trainerImg);

      // ROL en grande (lo que es), nombre en pequeño
      const rolEl = document.createElement('div');
      rolEl.className = 'nivel-trainer-rol';
      rolEl.textContent = entry.subtitulo;
      tdT.appendChild(rolEl);

      const nameEl = document.createElement('div');
      nameEl.className = 'nivel-trainer-name';
      nameEl.textContent = entry.nombre;
      tdT.appendChild(nameEl);

      const capEl = document.createElement('div');
      capEl.className = 'nivel-cap-badge';
      capEl.style.background = color;
      capEl.innerHTML = `<span>Cap</span> Nv. ${entry.nivelCap}`;
      tdT.appendChild(capEl);

      tr.appendChild(tdT);

      // Celdas Pokémon — solo las columnas necesarias para esta sección
      for (let i = 0; i < maxPoke; i++) {
        const td = document.createElement('td');
        td.className = 'nivel-td-poke';
        const p = entry.pokemon[i];
        if (p) {
          const img = document.createElement('img');
          img.className = 'nivel-poke-sprite';
          img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
          img.alt = p.n;
          td.appendChild(img);
          const nameD = document.createElement('div');
          nameD.className = 'nivel-poke-name';
          nameD.textContent = p.n;
          td.appendChild(nameD);
          const lvlD = document.createElement('div');
          lvlD.className = 'nivel-poke-lvl';
          lvlD.textContent = `Nv. ${p.nv}`;
          td.appendChild(lvlD);
        } else {
          td.className += ' nivel-td-empty';
          td.textContent = '—';
        }
        tr.appendChild(td);
      }

      table.appendChild(tr);
    });

    wrap.appendChild(table);
    container.appendChild(wrap);
  });
}

function makeFallbackCircle(letter, color) {
  const d = document.createElement('div');
  d.className = 'nivel-trainer-fallback';
  d.style.background = color;
  d.textContent = letter;
  return d;
}

// ── OCR / CAPTURA DE PANTALLA ────────────────────────────────────────────────

// Nombres en inglés (fallback REST si GraphQL falla)
let allPokemonNames = [];
async function loadPokemonNames() {
  if (allPokemonNames.length) return;
  try {
    const r = await fetch('https://pokeapi.co/api/v2/pokemon?limit=500');
    allPokemonNames = (await r.json()).results.map(p => p.name);
  } catch {}
}

// Carga todos los nombres en español de una sola petición GraphQL
async function loadSpanishNames() {
  try {
    const gql = `{
      pokemon_v2_pokemonspeciesname(where:{language_id:{_eq:7}}) { name pokemon_v2_pokemonspecies{name} }
    }`;
    const r = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gql })
    });
    const { data } = await r.json();

    data.pokemon_v2_pokemonspeciesname.forEach(e => {
      const en = e.pokemon_v2_pokemonspecies.name;
      esNameToEn.pokemon[e.name.toLowerCase()]  = en;
      enToEsDisplay.pokemon[en]                 = e.name;
    });

    allPokemonNamesEs = Object.keys(esNameToEn.pokemon);
    allPokemonNames   = allPokemonNamesEs;
  } catch {
    await loadPokemonNames();
    allPokemonNamesEs = allPokemonNames;
  }
}

// Distancia de Levenshtein entre dos strings
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// Devuelve el nombre de Pokémon más cercano a `word` usando Levenshtein.
// Solo acepta si la distancia es <= umbral (evita falsos positivos).
function fuzzyMatch(word) {
  if (!allPokemonNames.length) return null;
  const q = word.toLowerCase();
  let best = null, bestDist = Infinity;
  for (const name of allPokemonNames) {
    const d = levenshtein(q, name);
    if (d < bestDist) { bestDist = d; best = name; }
  }
  // Umbral: hasta 2 caracteres de diferencia para nombres cortos, 3 para largos
  const threshold = q.length <= 6 ? 2 : 3;
  return bestDist <= threshold ? best : null;
}

function setOcrStatus(msg, type = '') {
  const el = $('ocr-status');
  el.textContent = msg;
  el.className = 'ocr-status' + (type ? ' ' + type : '');
  el.classList.remove('hidden');
}

function clearOcrStatus() {
  $('ocr-status').classList.add('hidden');
}

// Extrae palabras del texto OCR priorizando mayúsculas (como en DS)
function extractOcrWords(rawText) {
  return rawText
    .split(/[\s\n\r,.:;/\\\-_!?'"()[\]{}]+/)
    .map(w => w.replace(/[^a-zA-Z]/g, '').trim())
    .filter(w => w.length >= 3)
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .sort((a, b) => {
      const aUp = a === a.toUpperCase() ? 0 : 1;
      const bUp = b === b.toUpperCase() ? 0 : 1;
      if (aUp !== bUp) return aUp - bUp;
      return b.length - a.length;
    });
}

// 1ª pasada: coincidencia exacta vía API
// 2ª pasada: fuzzy contra lista local
async function findPokemonInOcrText(rawText) {
  const words = extractOcrWords(rawText);

  // Paso 1 — exacto
  for (const word of words) {
    const esKey = word.toLowerCase();
    const query = esNameToEn.pokemon[esKey] || esKey;
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${query}`);
      if (res.ok) return { name: query, exact: true };
    } catch { /* ignora */ }
  }

  // Paso 2 — fuzzy con Levenshtein
  await loadPokemonNames();
  let bestName = null, bestDist = Infinity;
  for (const word of words) {
    const candidate = fuzzyMatch(word);
    if (candidate) {
      const d = levenshtein(word.toLowerCase(), candidate);
      if (d < bestDist) { bestDist = d; bestName = candidate; }
    }
  }
  if (bestName) {
    const enName = esNameToEn.pokemon[bestName] || bestName;
    return { name: enName, exact: false, detected: words[0] };
  }

  return null;
}

async function processOcrImage(imageData) {
  const pasteZone = document.querySelector('.paste-zone');
  pasteZone.classList.add('active');
  setOcrStatus('Analizando imagen...');

  try {
    const result = await Tesseract.recognize(imageData, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          setOcrStatus(`Leyendo texto... ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text;
    if (!text.trim()) {
      setOcrStatus('No se detectó texto en la imagen.', 'error');
      pasteZone.classList.remove('active');
      return;
    }

    setOcrStatus('Buscando Pokémon...');
    const found = await findPokemonInOcrText(text);

    if (found) {
      $('pokemon-input').value = found.name;
      if (found.exact) {
        setOcrStatus(`Detectado: "${capitalize(found.name)}" — buscando stats...`, 'success');
      } else {
        setOcrStatus(`OCR leyó "${found.detected}" → similar a "${capitalize(found.name)}" — buscando stats...`, 'success');
      }
      await searchPokemon();
      setTimeout(clearOcrStatus, 4000);
    } else {
      const preview = text.replace(/\n/g, ' ').trim().slice(0, 80);
      setOcrStatus(`No se identificó ningún Pokémon. Texto detectado: "${preview}"`, 'error');
    }
  } catch (err) {
    setOcrStatus('Error al procesar la imagen. Inténtalo de nuevo.', 'error');
    console.error(err);
  }

  pasteZone.classList.remove('active');
}

function initOcr() {
  // Ctrl+V en cualquier parte de la página
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        const url = URL.createObjectURL(blob);
        await processOcrImage(url);
        URL.revokeObjectURL(url);
        return;
      }
    }
  });

  // Drag & drop sobre la zona
  const zone = document.querySelector('.paste-zone');
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', async (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      await processOcrImage(url);
      URL.revokeObjectURL(url);
    }
  });

  // Click para abrir selector de archivo
  zone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        await processOcrImage(url);
        URL.revokeObjectURL(url);
      }
    };
    input.click();
  });
}

