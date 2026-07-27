/* AlerTT — live community alerts against the official crime record.
   Two data layers, deliberately kept apart:
     · the community layer  (this file's SEED array + whatever the user files)
     · the official layer   (CRIME, generated from the alertt-data SQLite pipeline)
   Nothing in the community layer is ever presented as verified fact, and nothing
   in the official layer is ever adjusted, smoothed, or estimated. */

// ─── CATEGORIES ─────────────────────────────────────────────
// Carried over from the app's src/theme.js so the two stay in step.
const CAT = {
  shooting:   { label: 'Shooting / gun violence', color: 'var(--cat-red)',   bg: '#FCEDED', icon: 'warn'   },
  kidnapping: { label: 'Kidnapping',              color: 'var(--cat-red)',   bg: '#FCEDED', icon: 'alert'  },
  gang:       { label: 'Gang-related activity',   color: 'var(--cat-red)',   bg: '#FCEDED', icon: 'people' },
  assault:    { label: 'Physical assault',        color: 'var(--cat-red)',   bg: '#FCEDED', icon: 'hand'   },
  robbery:    { label: 'Robbery / theft',         color: 'var(--cat-amber)', bg: '#FDF3E3', icon: 'bag'    },
  suspicious: { label: 'Suspicious activity',     color: 'var(--cat-amber)', bg: '#FDF3E3', icon: 'eye'    },
  police:     { label: 'Police activity',         color: 'var(--cat-blue)',  bg: '#E8F0F8', icon: 'shield' },
  traffic:    { label: 'Traffic / roadblock',     color: 'var(--cat-blue)',  bg: '#E8F0F8', icon: 'car'    },
  all_clear:  { label: 'All clear',               color: 'var(--cat-green)', bg: '#EDF4E4', icon: 'check'  },
  other:      { label: 'Other',                   color: 'var(--cat-gray)',  bg: '#F0F0EC', icon: 'query'  },
};

const ICON = {
  warn:   'M12 3 2 20h20L12 3Z M12 10v4 M12 17.2v.1',
  alert:  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 8v5 M12 16.2v.1',
  people: 'M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M22 19v-2a4 4 0 0 0-3-3.8 M16 2.2a3.5 3.5 0 0 1 0 6.6',
  hand:   'M18 11V6.5a1.5 1.5 0 0 0-3 0V11 M15 11V4.5a1.5 1.5 0 0 0-3 0V11 M12 11V6a1.5 1.5 0 0 0-3 0v8 M9 12.5 7.4 10a1.6 1.6 0 0 0-2.4 2l3.6 5.4A6 6 0 0 0 13.6 20h1A3.5 3.5 0 0 0 18 16.5V11',
  bag:    'M4 8h16l-1.2 12.5a1 1 0 0 1-1 .9H6.2a1 1 0 0 1-1-.9L4 8Z M8.5 11V6a3.5 3.5 0 1 1 7 0v5',
  eye:    'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  shield: 'M12 2.5 20 6v6c0 4.6-3.3 8.3-8 9.5-4.7-1.2-8-4.9-8-9.5V6l8-3.5Z M9 12l2.2 2.2L15.5 10',
  car:    'M4 16.5h16 M5.5 16.5V19a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2.5 M21.5 16.5V19a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-2.5 M2.5 16.5v-4l2-5.2a1.5 1.5 0 0 1 1.4-1h12.2a1.5 1.5 0 0 1 1.4 1l2 5.2v4 M2.5 12.5h19 M6.5 14.5h.1 M17.5 14.5h.1',
  check:  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M8 12.2l2.7 2.7L16 9.5',
  query:  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M9.6 9.2a2.5 2.5 0 0 1 4.9.8c0 1.7-2.5 2.5-2.5 2.5 M12 16.8v.1',
};

const svgIcon = (name, color) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
  ICON[name].split(' M').map((d, i) => `<path d="${i ? 'M' + d : d}"/>`).join('') + `</svg>`;

// ─── GEOGRAPHY ──────────────────────────────────────────────
// Reporting locations, each mapped to the TTPS division that polices it.
const LOCATIONS = [
  { label: 'Port-of-Spain',       division: 'Port of Spain', lat: 10.6549, lng: -61.5019 },
  { label: 'Diego Martin',        division: 'Western',       lat: 10.7167, lng: -61.5667 },
  { label: 'Chaguanas',           division: 'Central',       lat: 10.5167, lng: -61.4111 },
  { label: 'Arima',               division: 'Northern',      lat: 10.6371, lng: -61.2825 },
  { label: 'Tunapuna',            division: 'Northern',      lat: 10.6469, lng: -61.3897 },
  { label: 'Sangre Grande',       division: 'North Eastern', lat: 10.5853, lng: -61.1306 },
  { label: 'San Fernando',        division: 'Southern',      lat: 10.2796, lng: -61.4589 },
  { label: 'Point Fortin',        division: 'South Western', lat: 10.1700, lng: -61.6833 },
  { label: 'Rio Claro',           division: 'Eastern',       lat: 10.3050, lng: -61.1750 },
  { label: 'Scarborough, Tobago', division: 'Tobago',        lat: 11.1817, lng: -60.7378 },
  { label: 'Somewhere else',      division: null,            lat: null,    lng: null, custom: true },
];

const DIV_ORDER = ['Port of Spain','Northern','Central','Southern','North Eastern','Eastern','Western','South Western','Tobago'];

// The three northwestern divisions sit almost on top of each other. Nudge their
// labels apart rather than letting them collide.
const LABEL_NUDGE = {
  'Western':       { dx: -26, dy: -14 },
  'Port of Spain': { dx: -14, dy:  14 },
  'Northern':      { dx:  26, dy:  -2 },
};

// Simplified coastlines, in [lng, lat]. Schematic, not survey-accurate; the
// division markers are placed from real coordinates so they sit correctly.
// Real coastlines, from Natural Earth 1:10m (public domain), simplified to
// 0.004 degrees and shipped in data.js alongside the crime figures.
const TRINIDAD = CRIME.coast.trinidad;
const TOBAGO = CRIME.coast.tobago;

const BOUNDS = { lngMin: -62.0, lngMax: -60.45, latMin: 9.98, latMax: 11.40 };
const MAP_W = 760;
const MAP_H = Math.round(MAP_W * ((BOUNDS.latMax - BOUNDS.latMin) /
              ((BOUNDS.lngMax - BOUNDS.lngMin) * Math.cos(10.7 * Math.PI / 180))));
const proj = (lng, lat) => [
  (lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin) * MAP_W,
  (BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin) * MAP_H,
];

// ─── SEED ALERTS ────────────────────────────────────────────
// A demonstration set. Realistic in shape and distribution, invented in content.
const MIN = 60000;
const SEED = [
  { cat:'shooting',   loc:'Laventille',              div:'Port of Spain', lat:10.6520, lng:-61.4900, ago:14,   status:'verified',
    desc:'Gunfire reported near Picton Road. Police on scene.',
    full:'Multiple rounds heard shortly after 7pm near the Picton Road junction. Two police units responded and the area was cordoned for roughly forty minutes. No casualties confirmed at the time of posting.', conf:31, flags:0 },
  { cat:'traffic',    loc:'Beetham Highway',         div:'Port of Spain', lat:10.6480, lng:-61.4780, ago:38,   status:'verified',
    desc:'Police checkpoint westbound. Expect delays.',
    full:'Routine checkpoint operating westbound approaching the Sea Lots interchange. Traffic backed up roughly two kilometres.', conf:88, flags:0 },
  { cat:'robbery',    loc:'Chaguanas Main Road',     div:'Central',       lat:10.5150, lng:-61.4090, ago:52,   status:'pending',
    desc:'Phone snatched outside the market. Two men on a bike.',
    full:'Filed by a member of the public. Reported as a snatch-and-ride outside the main market entrance around midday. Not yet confirmed by any second source.', conf:6, flags:1 },
  { cat:'suspicious', loc:'Tunapuna',                div:'Northern',      lat:10.6469, lng:-61.3897, ago:80,   status:'pending',
    desc:'Car circling the block repeatedly on Circular Road.',
    full:'Community report. A dark saloon described as passing the same stretch of Circular Road several times over about twenty minutes. No registration recorded.', conf:4, flags:2 },
  { cat:'all_clear',  loc:'San Juan',                div:'Northern',      lat:10.6500, lng:-61.4500, ago:126,  status:'all_clear',
    desc:'Earlier road closure lifted. Croisee clear.',
    full:'The closure reported this morning around the Croisee has been lifted and traffic is moving normally in both directions.', conf:52, flags:0 },
  { cat:'gang',       loc:'Enterprise',              div:'Central',       lat:10.5060, lng:-61.4300, ago:185,  status:'pending',
    desc:'Reports of a standoff near Sunrees Road.',
    full:'Several community reports describing a confrontation between groups near Sunrees Road. Details differ between accounts and none has been confirmed.', conf:18, flags:3 },
  { cat:'traffic',    loc:'Churchill Roosevelt Hwy', div:'Northern',      lat:10.6300, lng:-61.3400, ago:248,  status:'verified',
    desc:'Three-vehicle collision eastbound at Trincity. One lane open.',
    full:'Eastbound collision just past the Trincity overpass. Two lanes blocked, one moving. Emergency services on scene.', conf:64, flags:0 },
  { cat:'assault',    loc:'San Fernando High Street',div:'Southern',      lat:10.2796, lng:-61.4589, ago:310,  status:'pending',
    desc:'Fight outside a bar on High Street around closing.',
    full:'Community report of an altercation involving several people outside a High Street bar shortly after 2am. Unconfirmed.', conf:9, flags:0 },
  { cat:'kidnapping', loc:'Sangre Grande',           div:'North Eastern', lat:10.5853, lng:-61.1306, ago:495,  status:'verified',
    desc:'Police confirm an abduction investigation is under way.',
    full:'Police have confirmed they are investigating the reported abduction of an adult male on Tuesday evening. No further operational detail released.', conf:120, flags:0 },
  { cat:'police',     loc:'Scarborough',             div:'Tobago',        lat:11.1817, lng:-60.7378, ago:640,  status:'verified',
    desc:'Increased patrols around Milford Road this week.',
    full:'Division has advised of increased foot and vehicle patrols along Milford Road and the Bacolet stretch for the remainder of the week.', conf:41, flags:0 },
  { cat:'robbery',    loc:'Diego Martin',            div:'Western',       lat:10.7167, lng:-61.5667, ago:820,  status:'pending',
    desc:'Break-in reported overnight on Morne Coco Road.',
    full:'Community report of a residential break-in overnight. Entry reportedly through a rear window. Not confirmed.', conf:11, flags:0 },
  { cat:'suspicious', loc:'Point Fortin',            div:'South Western', lat:10.1700, lng:-61.6833, ago:1180, status:'pending',
    desc:'Someone testing car doors in the Mahaica car park.',
    full:'Filed anonymously. Describes a person moving between parked vehicles trying door handles in the early evening.', conf:7, flags:1 },
  { cat:'shooting',   loc:'Morvant',                 div:'Port of Spain', lat:10.6650, lng:-61.4700, ago:1560, status:'verified',
    desc:'Fatal shooting on Never Dirty Road. Investigation open.',
    full:'Police have confirmed one fatality following a shooting on Never Dirty Road. Homicide investigators are on the case and no arrests have been announced.', conf:203, flags:0 },
  { cat:'traffic',    loc:'Rio Claro',               div:'Eastern',       lat:10.3050, lng:-61.1750, ago:1790, status:'pending',
    desc:'Flooding on the Naparima-Mayaro Road near Poole.',
    full:'Community report of standing water making one lane impassable near the Poole junction after heavy overnight rain.', conf:14, flags:0 },
];

// ─── STATE ──────────────────────────────────────────────────
const LS_KEY = 'alertt_web_reports';
const T0 = Date.now();
let userReports = [];
try { userReports = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { userReports = []; }

const state = { tab: 'feed', division: 'all', status: 'all', mapLayer: 'live', mapSel: 'Port of Spain' };

const allAlerts = () => [
  ...userReports.map(r => ({ ...r, at: r.at })),
  ...SEED.map(s => ({ ...s, at: T0 - s.ago * MIN, mine: false })),
].sort((a, b) => b.at - a.at);

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => n == null ? '—' : n.toLocaleString('en-US');

function ago(ts) {
  const m = Math.max(0, Math.round((Date.now() - ts) / MIN));
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// ─── TOOLTIP ────────────────────────────────────────────────
const tipEl = $('#tip');
function showTip(html, x, y) {
  tipEl.innerHTML = html;
  tipEl.classList.add('on');
  const r = tipEl.getBoundingClientRect();
  let left = x + 14, top = y - r.height - 12;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top < 8) top = y + 18;
  tipEl.style.left = left + 'px';
  tipEl.style.top = top + 'px';
}
const hideTip = () => tipEl.classList.remove('on');

// ─── OFFICIAL-LAYER HELPERS ─────────────────────────────────
const divData = name => CRIME.divisions[name];
const sum = a => a.reduce((x, y) => x + (y || 0), 0);

function divStats(name) {
  const d = divData(name);
  const rep = sum(d.reported), det = sum(d.detected);
  return {
    region: d.region, years: d.years, reported: d.reported, detected: d.detected,
    latest: d.reported[d.reported.length - 1],
    latestDet: d.detected[d.detected.length - 1],
    first: d.reported[0], total: rep, totalDet: det,
    pct: rep ? +(100 * det / rep).toFixed(1) : 0,
  };
}
const nationalStats = () => {
  const n = CRIME.national, i = n.years.length - 1;
  return { year: n.years[i], reported: n.reported[i], detected: n.detected[i], pct: n.detectionPct[i] };
};

// Sparkline: one series, de-emphasised, current period in the accent.
function sparkline(values, w = 108, h = 30, color = 'var(--official)') {
  const max = Math.max(...values), min = Math.min(...values, 0);
  const x = i => (i / (values.length - 1)) * (w - 6) + 3;
  const y = v => h - 4 - ((v - min) / ((max - min) || 1)) * (h - 8);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lx = x(values.length - 1), ly = y(values[values.length - 1]);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="display:block">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6"
      stroke-linejoin="round" stroke-linecap="round" opacity="0.5"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3" fill="${color}"
      stroke="var(--surface)" stroke-width="2"/></svg>`;
}

// ════════════════════════════════════════════════════════════
// FEED
// ════════════════════════════════════════════════════════════
function renderDivList() {
  const alerts = allAlerts();
  const count = d => alerts.filter(a => d === 'all' || a.div === d).length;
  const row = (key, label) => {
    const n = count(key);
    return `<button class="div-btn" data-div="${key}" aria-pressed="${state.division === key}">
      <span>${label}</span><span class="div-count${n ? '' : ' zero'}">${n}</span></button>`;
  };
  $('#div-list').innerHTML = row('all', 'All divisions') +
    DIV_ORDER.map(d => row(d, d)).join('');
}

function renderBaseline() {
  const el = $('#baseline');
  if (state.division === 'all') {
    const n = nationalStats(), ml = CRIME.murderLong;
    el.innerHTML = `<div class="baseline">
      <div class="baseline-head">
        <span class="baseline-title">National baseline &middot; the official record</span>
        <span class="baseline-src">CSO / TTPS &middot; ${ml.years[0]}&ndash;${n.year}</span>
      </div>
      <div class="baseline-row">
        <div><div class="bstat-num">${fmt(n.reported)}</div><div class="bstat-label">murders recorded in ${n.year}</div></div>
        <div><div class="bstat-num">${n.pct}%</div><div class="bstat-label">detected &middot; about one in seven</div></div>
        <div><div class="bstat-num">${Math.round(n.reported / ml.reported[0])}&times;</div><div class="bstat-label">the ${ml.years[0]} figure of ${ml.reported[0]}</div></div>
        <div class="baseline-spark">${sparkline(CRIME.national.reported, 120, 34)}
          <div class="bstat-label" style="text-align:right">2015&ndash;${n.year}</div></div>
      </div></div>`;
    return;
  }
  const s = divStats(state.division), y = s.years;
  el.innerHTML = `<div class="baseline">
    <div class="baseline-head">
      <span class="baseline-title">${esc(state.division)} Division &middot; the official record</span>
      <span class="baseline-src">CSO / TTPS &middot; ${y[0]}&ndash;${y[y.length - 1]}</span>
    </div>
    <div class="baseline-row">
      <div><div class="bstat-num">${fmt(s.latest)}</div><div class="bstat-label">murders in ${y[y.length - 1]}</div></div>
      <div><div class="bstat-num">${fmt(s.total)}</div><div class="bstat-label">over the ten years</div></div>
      <div><div class="bstat-num">${s.pct}%</div><div class="bstat-label">of those detected</div></div>
      <div class="baseline-spark">${sparkline(s.reported, 120, 34)}
        <div class="bstat-label" style="text-align:right">${y[0]}&ndash;${y[y.length - 1]}</div></div>
    </div></div>`;
}

function contextLine(div) {
  const s = divStats(div), y = s.years, last = y.length - 1;
  const dir = s.latest > s.first ? 'up from' : s.latest < s.first ? 'down from' : 'level with';
  return `<b>${esc(div)} Division, officially:</b> ${s.latest} murders in ${y[last]}, ${dir}
    ${s.first} in ${y[0]}. Across the ten years ${fmt(s.total)} were recorded and ${fmt(s.totalDet)}
    were detected, a rate of ${s.pct}%.`;
}

function renderFeed() {
  let list = allAlerts();
  if (state.division !== 'all') list = list.filter(a => a.div === state.division);
  if (state.status !== 'all') list = list.filter(a => a.status === state.status);

  const scope = state.division === 'all' ? 'across all nine divisions' : 'in ' + state.division;
  const mine = list.filter(a => a.mine).length;
  const noun = list.length === 1 ? 'alert' : 'alerts';
  // Only call them sample alerts when they all are — the user's own are not.
  $('#feed-count').innerHTML = mine
    ? `<strong>${list.length}</strong> ${noun} ${esc(scope)} &middot; ${list.length - mine} sample, ${mine} filed by you`
    : `<strong>${list.length}</strong> sample ${noun} ${esc(scope)}`;

  if (!list.length) {
    $('#alert-list').innerHTML = `<div class="empty">No alerts match this filter.</div>`;
    return;
  }

  $('#alert-list').innerHTML = list.map((a, i) => {
    const c = CAT[a.cat] || CAT.other;
    const statusLabel = a.status === 'pending' ? 'community' : a.status === 'all_clear' ? 'all clear' : 'verified';
    return `<button class="alert" data-i="${i}" aria-expanded="false">
      <span class="alert-icon" style="background:${c.bg}">${svgIcon(c.icon, c.color)}</span>
      <span>
        <span class="alert-top">
          <span class="alert-type">${esc(c.label)}</span>
          <span class="status ${a.status}">${statusLabel}</span>
          ${a.mine ? '<span class="status pending">yours</span>'
                   : '<span class="demo-tag" title="Invented content, not a real incident">sample</span>'}
          <span class="alert-time">${ago(a.at)}</span>
        </span>
        <span class="alert-loc">${esc(a.loc)} <span class="div-name">&middot; ${esc(a.div || 'Unassigned')} Division</span></span>
        <span class="alert-desc">${esc(a.desc)}</span>
        <span class="alert-detail" hidden>
          ${esc(a.full || a.desc)}
          <span class="alert-meta">
            <span>${a.conf ?? 0} confirmations</span><span>${a.flags ?? 0} flags</span>
            <span>${new Date(a.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </span>
          ${a.div ? `<span class="alert-ctx">${contextLine(a.div)}</span>` : ''}
        </span>
      </span></button>`;
  }).join('');

  $('#alert-list').querySelectorAll('.alert').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.querySelector('.alert-detail');
      const open = !d.hidden;
      d.hidden = open;
      btn.setAttribute('aria-expanded', String(!open));
    });
  });
}

const renderFeedPanel = () => { renderDivList(); renderBaseline(); renderFeed(); };

// ════════════════════════════════════════════════════════════
// MAP
// Leaflet with real tiles when it is available; the self-contained SVG
// renderer below is the fallback if the CDN cannot be reached.
// ════════════════════════════════════════════════════════════
const hasLeaflet = () => typeof L !== 'undefined';
const renderMap = () => (hasLeaflet() ? renderLeafletMap() : renderSvgMap());

const TT_CENTER = [10.69, -61.22];
let lmap = null, liveLayer = null, officialLayer = null, legendCtl = null;

function catOf(a) { return CAT[a.cat] || CAT.other; }

// Resolve a CSS custom property to a real colour — Leaflet writes these into
// inline styles and SVG attributes, where var() would not resolve.
const CSSVAR = {};
function colour(v) {
  const m = /^var\((--[\w-]+)\)$/.exec(v);
  if (!m) return v;
  if (!CSSVAR[m[1]]) CSSVAR[m[1]] = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
  return CSSVAR[m[1]];
}

function pinIcon(a) {
  const c = catOf(a), col = colour(c.color);
  const fresh = Date.now() - a.at < 90 * MIN;
  const unver = a.status === 'pending';
  return L.divIcon({
    className: '',
    html: `<div class="pin ${unver ? 'unverified' : ''}" style="color:${col}">
             ${fresh ? '<span class="pin-pulse"></span>' : ''}
             <div class="pin-body" style="background:${unver ? '#fff' : col};
               ${unver ? `border-color:${col}` : ''}">
               ${svgIcon(c.icon, unver ? col : '#fff')}
             </div></div>`,
    iconSize: [30, 38], iconAnchor: [15, 38], popupAnchor: [0, -34],
  });
}

function alertPopup(a) {
  const c = catOf(a);
  const label = a.status === 'pending' ? 'community' : a.status === 'all_clear' ? 'all clear' : 'verified';
  return `<div class="pop">
    <div class="pop-top">
      <span class="pop-type">${esc(c.label)}</span>
      <span class="status ${a.status}">${label}</span>
      ${a.mine ? '<span class="status pending">yours</span>'
               : '<span class="demo-tag">sample</span>'}
    </div>
    <div class="pop-loc">${esc(a.loc)} &middot; ${esc(a.div || 'Unassigned')} Division &middot; ${ago(a.at)}</div>
    <div class="pop-desc">${esc(a.full || a.desc)}</div>
    ${a.div ? `<div class="pop-ctx">${contextLine(a.div)}</div>` : ''}
    <div class="pop-meta"><span>${a.conf ?? 0} confirmations</span><span>${a.flags ?? 0} flags</span></div>
    ${a.div ? `<button class="pop-btn" data-goto="${esc(a.div)}">See ${esc(a.div)} in the feed</button>` : ''}
  </div>`;
}

function divisionPopup(d) {
  const s = divStats(d), y = s.years;
  return `<div class="pop">
    <div class="pop-top"><span class="pop-type">${esc(d)} Division</span></div>
    <div class="pop-loc">${esc(s.region)} &middot; official record, ${y[0]}&ndash;${y[y.length - 1]}</div>
    <div class="pop-desc">${fmt(s.total)} murders recorded over the ten years, ${fmt(s.totalDet)} of them
      detected &mdash; a rate of ${s.pct}%. In ${y[y.length - 1]} there were ${fmt(s.latest)}.</div>
    ${sparkline(s.reported, 236, 40)}
    <button class="pop-btn" data-goto="${esc(d)}">See ${esc(d)} in the feed</button>
  </div>`;
}

function buildLegend() {
  const div = L.DomUtil.create('div', 'map-legend');
  const rows = state.mapLayer === 'official'
    ? [['var(--official)', 'Murders 2015&ndash;2024, circle sized by total']]
    : [['var(--cat-red)', 'Violent incident'], ['var(--cat-amber)', 'Property or suspicious'],
       ['var(--cat-blue)', 'Police or traffic'], ['var(--cat-green)', 'All clear']];
  div.innerHTML = `<h4>${state.mapLayer === 'official' ? 'Official layer' : 'Community layer'}</h4>` +
    rows.map(([c, t]) => `<div class="row"><span class="sw" style="background:${colour(c)}"></span>${t}</div>`).join('') +
    (state.mapLayer === 'official' ? '' :
      '<div class="row" style="margin-top:5px;color:var(--text-tertiary)">Hollow pin = unverified</div>');
  L.DomEvent.disableClickPropagation(div);
  return div;
}

function initLeaflet() {
  lmap = L.map('leaflet-map', {
    center: TT_CENTER, zoom: 9, minZoom: 8, maxZoom: 17,
    scrollWheelZoom: true, zoomControl: true,
    maxBounds: L.latLngBounds([9.7, -62.3], [11.7, -60.1]), maxBoundsViscosity: 0.7,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
                 'contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd', maxZoom: 20,
  }).addTo(lmap);

  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(lmap);

  // Bottom right, so it never sits over Tobago in the north east.
  legendCtl = L.control({ position: 'bottomright' });
  legendCtl.onAdd = buildLegend;
  legendCtl.addTo(lmap);

  // "See X in the feed" inside a popup.
  lmap.on('popupopen', e => {
    const btn = e.popup.getElement()?.querySelector('[data-goto]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.division = btn.dataset.goto;
      state.status = 'all';
      state.mapSel = btn.dataset.goto;
      lmap.closePopup();
      switchTab('feed');
      renderFeedPanel();
    });
  });

  // Official-layer symbols are sized against the zoom, so redraw when it changes.
  lmap.on('zoomend', () => { if (state.mapLayer === 'official') renderLeafletMap(); });
}

// Both islands, with a little air around them.
const TT_BOUNDS = () => L.latLngBounds([10.02, -61.95], [11.36, -60.50]);
let mapFitted = false;

// `hidden` is an HTMLElement property — assigning it on an SVG element sets a
// stray JS property and leaves the attribute in place, so toggle the attribute.
const showEl = (sel, show) =>
  show ? $(sel).removeAttribute('hidden') : $(sel).setAttribute('hidden', '');

function renderLeafletMap() {
  showEl('#leaflet-map', true);
  showEl('#map-svg', false);
  if (!lmap) initLeaflet();

  if (liveLayer) { lmap.removeLayer(liveLayer); liveLayer = null; }
  if (officialLayer) { lmap.removeLayer(officialLayer); officialLayer = null; }

  const totals = Object.fromEntries(DIV_ORDER.map(d => [d, sum(divData(d).reported)]));
  const maxTotal = Math.max(...Object.values(totals));

  if (state.mapLayer === 'official') {
    // Western and Port of Spain sit about 8km apart, so at country zoom no
    // readable badge can avoid overlapping. Circles scale with the zoom level:
    // proportional symbols when zoomed out, labelled badges once there is room.
    const zf = Math.min(1.35, Math.max(0.5, Math.pow(1.3, lmap.getZoom() - 10)));
    officialLayer = L.layerGroup(DIV_ORDER.map(d => {
      const dd = divData(d);
      const size = Math.round(Math.max(14, (18 + 30 * Math.sqrt(totals[d] / maxTotal)) * zf));
      const label = size >= 30 ? fmt(totals[d]) : '';
      const icon = L.divIcon({
        className: '',
        html: `<div class="divpin ${state.mapSel === d ? 'sel' : ''}"
                 style="width:${size}px;height:${size}px;background:${colour('var(--official)')};
                        opacity:0.85;font-size:${size < 38 ? 9.5 : 11}px">${label}</div>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2],
      });
      return L.marker([dd.lat, dd.lng], {
        icon, zIndexOffset: 400 - size,   // smaller badges stay clickable on top
        title: `${d} Division — ${totals[d]} murders 2015–2024`,
      })
        .bindPopup(divisionPopup(d))
        .bindTooltip(`<b>${d}</b> — ${fmt(totals[d])} murders, ${divStats(d).pct}% detected`,
                     { direction: 'top', offset: [0, -size / 2] })
        .on('click', () => { state.mapSel = d; renderMapSide(); renderLeafletMap(); });
    })).addTo(lmap);
  } else {
    const alerts = allAlerts().filter(a => a.lat != null);
    liveLayer = L.layerGroup([
      // Division reference points sit under the alert pins.
      ...DIV_ORDER.map(d => {
        const dd = divData(d);
        return L.circleMarker([dd.lat, dd.lng], {
          radius: state.mapSel === d ? 8 : 5,
          color: '#fff', weight: 2,
          fillColor: state.mapSel === d ? colour('var(--accent)') : '#9A9A93',
          fillOpacity: 0.95, interactive: true,
        }).bindTooltip(`${d} Division`, { direction: 'top' })
          .bindPopup(divisionPopup(d))
          .on('click', () => { state.mapSel = d; renderMapSide(); });
      }),
      ...alerts.map(a => L.marker([a.lat, a.lng], {
        icon: pinIcon(a), riseOnHover: true,
        title: `${catOf(a).label} — ${a.loc}`,
      }).bindPopup(alertPopup(a))),
    ]).addTo(lmap);
  }

  if (legendCtl) { legendCtl.remove(); legendCtl.addTo(lmap); }

  $('#map-scale').innerHTML = state.mapLayer === 'official'
    ? `<span>Circle size and label show murders recorded 2015&ndash;2024, from ${fmt(Math.min(...Object.values(totals)))} in Tobago to ${fmt(maxTotal)} in Northern. Click a division for its record.</span>`
    : `<span>Sample pins, not real incidents. Filled = verified &middot; hollow = unverified community report &middot; pulsing = last 90 minutes. Click any pin for detail.</span>`;

  // The container has no size until its tab is visible, so measure first and
  // only then frame the islands — otherwise Tobago lands outside the viewport.
  setTimeout(() => {
    lmap.invalidateSize();
    if (!mapFitted) { lmap.fitBounds(TT_BOUNDS(), { padding: [24, 24] }); mapFitted = true; }
  }, 0);
}

// ─── SVG fallback (no dependencies) ───
function renderSvgMap() {
  showEl('#leaflet-map', false);
  showEl('#map-svg', true);
  const path = c => c.map(([lng, lat], i) => (i ? 'L' : 'M') + proj(lng, lat).map(v => v.toFixed(1)).join(' ')).join(' ') + ' Z';
  const alerts = allAlerts();
  const totals = Object.fromEntries(DIV_ORDER.map(d => [d, sum(divData(d).reported)]));
  const maxTotal = Math.max(...Object.values(totals));

  let marks = '';
  if (state.mapLayer === 'official') {
    // Magnitude → area of one hue. Radius scales with sqrt so area is proportional.
    marks = DIV_ORDER.map(d => {
      const dd = divData(d), [x, y] = proj(dd.lng, dd.lat);
      const r = 7 + 21 * Math.sqrt(totals[d] / maxTotal);
      const on = state.mapSel === d;
      return `<g class="div-marker" data-div="${d}" tabindex="0" role="button"
        aria-label="${d} Division, ${totals[d]} murders 2015 to 2024">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"
          fill="var(--official)" fill-opacity="${on ? 0.42 : 0.2}"
          stroke="var(--official)" stroke-width="${on ? 2.5 : 1.5}"/>
        <circle class="hit" fill="none" pointer-events="all" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(r, 22).toFixed(1)}"/>
        <text class="div-label" x="${(x + (LABEL_NUDGE[d]?.dx || 0)).toFixed(1)}"
          y="${(y + r + 13 + (LABEL_NUDGE[d]?.dy || 0)).toFixed(1)}" text-anchor="middle">${d}</text>
      </g>`;
    }).join('');
  } else {
    marks = DIV_ORDER.map(d => {
      const dd = divData(d), [x, y] = proj(dd.lng, dd.lat);
      const on = state.mapSel === d;
      return `<g class="div-marker" data-div="${d}" tabindex="0" role="button" aria-label="${d} Division">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${on ? 6 : 4}"
          fill="${on ? 'var(--accent)' : '#C9C9C2'}" stroke="var(--surface)" stroke-width="2"/>
        <circle class="hit" fill="none" pointer-events="all" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="22"/>
        <text class="div-label" x="${(x + (LABEL_NUDGE[d]?.dx || 0)).toFixed(1)}"
          y="${(y + 18 + (LABEL_NUDGE[d]?.dy || 0)).toFixed(1)}" text-anchor="middle">${d}</text>
      </g>`;
    }).join('') +
    alerts.filter(a => a.lat != null).map((a, i) => {
      const c = CAT[a.cat] || CAT.other, [x, y] = proj(a.lng, a.lat);
      const fresh = Date.now() - a.at < 90 * MIN;
      return `<g class="alert-pin" data-alert="${i}" tabindex="0" role="button"
        aria-label="${esc(c.label)} at ${esc(a.loc)}, ${ago(a.at)}">
        ${fresh ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="${c.color}" opacity="0.15"/>` : ''}
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${c.color}"
          fill-opacity="${a.status === 'verified' ? 1 : 0.45}"
          stroke="var(--surface)" stroke-width="2"/>
        <circle class="hit" fill="none" pointer-events="all" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15"/>
      </g>`;
    }).join('');
  }

  const svg = $('#map-svg');
  svg.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);
  svg.innerHTML = `<path class="coast" d="${path(TRINIDAD)}"/><path class="coast" d="${path(TOBAGO)}"/>${marks}`;

  // Scale legend
  $('#map-scale').innerHTML = state.mapLayer === 'official'
    ? `<span>Circle area is murders recorded 2015&ndash;2024</span>
       <span class="scale-dots">
         <svg width="70" height="30" aria-hidden="true">
           <circle cx="10" cy="15" r="7" fill="var(--official)" fill-opacity="0.2" stroke="var(--official)"/>
           <circle cx="34" cy="15" r="13" fill="var(--official)" fill-opacity="0.2" stroke="var(--official)"/>
           <circle cx="60" cy="15" r="9.5" fill="none" stroke="none"/>
         </svg></span>
       <span>${fmt(Math.min(...Object.values(totals)))} to ${fmt(maxTotal)}</span>`
    : `<span>Sample pins, not real incidents. Solid = verified &middot; faded = unverified community report &middot; halo = last 90 minutes</span>`;

  svg.querySelectorAll('.div-marker').forEach(g => {
    const d = g.dataset.div;
    const pick = () => { state.mapSel = d; renderMap(); renderMapSide(); };
    g.addEventListener('click', pick);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    g.addEventListener('mousemove', e => {
      const s = divStats(d);
      showTip(`<span class="tip-t">${esc(d)} Division</span>
        <span class="tip-r"><span>Murders 2015&ndash;24</span><span>${fmt(s.total)}</span></span>
        <span class="tip-r"><span>Detected</span><span>${fmt(s.totalDet)} (${s.pct}%)</span></span>`, e.clientX, e.clientY);
    });
    g.addEventListener('mouseleave', hideTip);
  });

  svg.querySelectorAll('.alert-pin').forEach(g => {
    const a = alerts.filter(x => x.lat != null)[+g.dataset.alert];
    g.addEventListener('mousemove', e => {
      showTip(`<span class="tip-t">${esc((CAT[a.cat] || CAT.other).label)}</span>
        ${esc(a.loc)} &middot; ${ago(a.at)}<br>
        <span style="color:rgba(255,255,255,0.72)">${a.status === 'pending' ? 'Unverified community report' : a.status === 'all_clear' ? 'Resolved' : 'Verified'}</span>`,
        e.clientX, e.clientY);
    });
    g.addEventListener('mouseleave', hideTip);
    g.addEventListener('click', () => {
      state.division = a.div; state.status = 'all';
      switchTab('feed'); renderFeedPanel();
    });
  });
}

function renderMapSide() {
  const d = state.mapSel, s = divStats(d), y = s.years;
  const live = allAlerts().filter(a => a.div === d);
  const unver = live.filter(a => a.status === 'pending').length;

  $('#map-side').innerHTML = `
    <div class="side-card">
      <div class="side-title">${esc(d)} Division</div>
      <div class="side-region">${esc(s.region)}</div>
      <div class="side-stats">
        <div><div class="side-stat-num" style="color:var(--official)">${fmt(s.latest)}</div>
             <div class="side-stat-label">murders in ${y[y.length - 1]}</div></div>
        <div><div class="side-stat-num" style="color:var(--official)">${s.pct}%</div>
             <div class="side-stat-label">detected, ten-year rate</div></div>
        <div><div class="side-stat-num" style="color:var(--live)">${live.length}</div>
             <div class="side-stat-label">alerts in the feed now</div></div>
        <div><div class="side-stat-num" style="color:var(--live)">${unver}</div>
             <div class="side-stat-label">of those unverified</div></div>
      </div>
      ${sparkline(s.reported, 250, 46)}
      <div class="side-stat-label" style="display:flex;justify-content:space-between;margin-top:3px">
        <span>${y[0]}</span><span>murders per year</span><span>${y[y.length - 1]}</span></div>
    </div>
    <div class="side-card">
      <div class="side-title" style="font-size:13px;margin-bottom:0.5rem">Ten-year record</div>
      <table><thead><tr><th>Year</th><th>Murders</th><th>Detected</th></tr></thead><tbody>
        ${y.map((yr, i) => `<tr><td>${yr}</td><td>${fmt(s.reported[i])}</td><td>${fmt(s.detected[i])}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
}

const renderMapPanel = () => { renderMap(); renderMapSide(); };

// ════════════════════════════════════════════════════════════
// REPORT
// ════════════════════════════════════════════════════════════
const WORD_LIMIT = 15;
let pickedCat = null;

function initReport() {
  $('#type-grid').innerHTML = Object.entries(CAT)
    .filter(([k]) => k !== 'all_clear')
    .map(([k, c]) => `<button type="button" class="type-btn" data-cat="${k}" aria-pressed="false">
      <span class="type-dot" style="background:${c.color}"></span>${esc(c.label)}</button>`).join('');

  $('#f-location').innerHTML = '<option value="">Choose a location</option>' +
    LOCATIONS.map((l, i) => `<option value="${i}">${esc(l.label)}</option>`).join('');

  $('#type-grid').addEventListener('click', e => {
    const b = e.target.closest('.type-btn'); if (!b) return;
    pickedCat = b.dataset.cat;
    $('#type-grid').querySelectorAll('.type-btn').forEach(x =>
      x.setAttribute('aria-pressed', String(x === b)));
    validate();
  });

  $('#f-location').addEventListener('change', e => {
    $('#custom-loc-field').hidden = !LOCATIONS[e.target.value]?.custom;
    validate();
  });

  $('#f-desc').addEventListener('input', () => {
    const n = words($('#f-desc').value).length;
    const c = $('#word-counter');
    c.textContent = `${n} / ${WORD_LIMIT} words`;
    c.classList.toggle('over', n > WORD_LIMIT);
    validate();
  });

  $('#f-custom-loc').addEventListener('input', validate);
  $('#report-form').addEventListener('submit', submitReport);
  $('#btn-clear').addEventListener('click', clearMine);
  updateClearBtn();
}

const words = s => s.trim().split(/\s+/).filter(Boolean);

function validate() {
  const li = $('#f-location').value;
  const loc = LOCATIONS[li];
  const n = words($('#f-desc').value).length;
  const okLoc = loc && (!loc.custom || $('#f-custom-loc').value.trim().length > 2);
  $('#btn-submit').disabled = !(pickedCat && okLoc && n > 0 && n <= WORD_LIMIT);
}

function submitReport(e) {
  e.preventDefault();
  const loc = LOCATIONS[$('#f-location').value];
  const custom = $('#f-custom-loc').value.trim();
  const desc = $('#f-desc').value.trim();

  userReports.unshift({
    cat: pickedCat,
    loc: loc.custom ? custom : loc.label,
    div: loc.division,
    lat: loc.lat, lng: loc.lng,
    at: Date.now(),
    status: 'pending',          // never anything else, for a public submission
    desc,
    // The detail view adds provenance, not a second copy of the description.
    full: `Filed by you from ${esc(loc.custom ? custom : loc.label)}` +
          ($('#f-anon').checked ? ', anonymously' : '') +
          '. Unverified: it stays marked community until moderation confirms it.',
    conf: 0, flags: 0, mine: true,
  });
  localStorage.setItem(LS_KEY, JSON.stringify(userReports));

  $('#report-form').reset();
  pickedCat = null;
  $('#type-grid').querySelectorAll('.type-btn').forEach(x => x.setAttribute('aria-pressed', 'false'));
  $('#custom-loc-field').hidden = true;
  $('#word-counter').textContent = '0 / 15 words';
  $('#word-counter').classList.remove('over');
  $('#btn-submit').disabled = true;
  $('#f-anon').checked = true;
  $('#form-msg').textContent = 'Filed. It is in the feed now, marked community.';
  setTimeout(() => { $('#form-msg').textContent = ''; }, 6000);
  updateClearBtn();
  renderFeedPanel();
  if (state.tab === 'map') renderMapPanel();
}

function clearMine() {
  userReports = [];
  localStorage.removeItem(LS_KEY);
  updateClearBtn();
  renderFeedPanel();
  $('#form-msg').textContent = 'Your reports have been removed.';
  setTimeout(() => { $('#form-msg').textContent = ''; }, 4000);
}

function updateClearBtn() {
  const b = $('#btn-clear');
  b.hidden = userReports.length === 0;
  b.textContent = `Clear my ${userReports.length} report${userReports.length === 1 ? '' : 's'}`;
}

// ════════════════════════════════════════════════════════════
// CONTEXT — charts
// ════════════════════════════════════════════════════════════
const PAD = { l: 46, r: 56, t: 14, b: 30 };
const CW = 720, CH = 260;

// Axis ticks land on round numbers (0 / 100 / 200 …), never on 487.5, and the
// ceiling sits just above the data rather than a magnitude above it.
function niceScale(maxValue, maxIntervals = 7) {
  const mag = Math.pow(10, Math.floor(Math.log10(maxValue)) - 1);
  const steps = [1, 2, 2.5, 5, 10, 20, 25, 50, 100].map(m => m * mag);
  const step = steps.find(s => Math.ceil(maxValue / s) <= maxIntervals) || steps[steps.length - 1];
  const max = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(+t.toFixed(6));
  return { max, ticks };
}

function axes(maxY, ticks, xLabels, xAt) {
  const py = v => PAD.t + (1 - v / maxY) * (CH - PAD.t - PAD.b);
  let s = '';
  for (const t of ticks) {
    s += `<line class="gridline" x1="${PAD.l}" y1="${py(t).toFixed(1)}" x2="${CW - PAD.r}" y2="${py(t).toFixed(1)}"/>
          <text class="axis-text" x="${PAD.l - 8}" y="${(py(t) + 3.5).toFixed(1)}" text-anchor="end">${fmt(t)}</text>`;
  }
  s += `<line class="axis-line" x1="${PAD.l}" y1="${CH - PAD.b}" x2="${CW - PAD.r}" y2="${CH - PAD.b}"/>`;
  for (const l of xLabels) {
    s += `<text class="axis-text" x="${xAt(l).toFixed(1)}" y="${CH - PAD.b + 16}" text-anchor="middle">${l}</text>`;
  }
  return s;
}

function chartCard(el, { title, sub, legend, svg, src, table }) {
  el.innerHTML = `
    <div class="chart-head"><h2 class="chart-title">${title}</h2>
      ${legend ? `<div class="chart-legend">${legend}</div>` : ''}</div>
    <p class="chart-sub">${sub}</p>
    ${svg}
    <div class="chart-foot">
      <span class="chart-src">${src}</span>
      <button class="btn-ghost" data-table>Show table</button>
    </div>
    <div class="table-wrap" hidden>${table}</div>`;
  const btn = el.querySelector('[data-table]'), wrap = el.querySelector('.table-wrap');
  btn.addEventListener('click', () => {
    wrap.hidden = !wrap.hidden;
    btn.textContent = wrap.hidden ? 'Show table' : 'Hide table';
  });
}

// Crosshair + tooltip shared by the two time-series charts.
function attachCrosshair(el, { years, px, series }) {
  const svg = el.querySelector('.chart-svg');
  const line = svg.querySelector('.crosshair');
  const dots = [...svg.querySelectorAll('.ch-dot')];
  svg.addEventListener('mousemove', e => {
    const r = svg.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width * CW;
    let best = 0, bd = Infinity;
    years.forEach((y, i) => { const d = Math.abs(px(i) - sx); if (d < bd) { bd = d; best = i; } });
    const x = px(best);
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    line.setAttribute('opacity', '1');
    dots.forEach((d, k) => {
      d.setAttribute('cx', x);
      d.setAttribute('cy', series[k].py(series[k].values[best]));
      d.setAttribute('opacity', '1');
    });
    showTip(`<span class="tip-t">${years[best]}</span>` + series.map(s =>
      `<span class="tip-r"><span>${s.name}</span><span>${fmt(s.values[best])}${s.suffix || ''}</span></span>`).join(''),
      e.clientX, e.clientY);
  });
  svg.addEventListener('mouseleave', () => {
    line.setAttribute('opacity', '0');
    dots.forEach(d => d.setAttribute('opacity', '0'));
    hideTip();
  });
}

// ── Chart 1: the long murder series ─────────────────────────
function chartLong() {
  const { years, reported } = CRIME.murderLong;
  const { max: maxY, ticks } = niceScale(Math.max(...reported));
  const px = i => PAD.l + (i / (years.length - 1)) * (CW - PAD.l - PAD.r);
  const py = v => PAD.t + (1 - v / maxY) * (CH - PAD.t - PAD.b);
  const pts = reported.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const area = `${PAD.l},${CH - PAD.b} ${pts} ${(CW - PAD.r)},${CH - PAD.b}`;
  const xl = [1975, 1985, 1995, 2005, 2015, 2024];
  const last = years.length - 1;

  chartCard($('#cc-long'), {
    title: 'Murders recorded, 1975 to 2024',
    sub: 'Sixty in 1975, six hundred and twenty-five in 2024 — the highest figure in the fifty-year series. The dip in 2020 coincides with pandemic movement restrictions.',
    svg: `<svg class="chart-svg" viewBox="0 0 ${CW} ${CH}" role="img"
        aria-label="Line chart of murders recorded in Trinidad and Tobago from 1975 to 2024, rising from 60 to 625">
      ${axes(maxY, ticks, xl, y => px(years.indexOf(y)))}
      <polygon points="${area}" fill="var(--series-reported)" opacity="0.1"/>
      <polyline points="${pts}" fill="none" stroke="var(--series-reported)" stroke-width="2"
        stroke-linejoin="round" stroke-linecap="round"/>
      <line class="crosshair" y1="${PAD.t}" y2="${CH - PAD.b}" stroke="var(--text-tertiary)"
        stroke-width="1" opacity="0"/>
      <circle class="ch-dot" r="4.5" fill="var(--series-reported)" stroke="var(--surface)"
        stroke-width="2" opacity="0"/>
      <circle cx="${px(last).toFixed(1)}" cy="${py(reported[last]).toFixed(1)}" r="4"
        fill="var(--series-reported)" stroke="var(--surface)" stroke-width="2"/>
      <text class="end-label" x="${(px(last) + 9).toFixed(1)}" y="${(py(reported[last]) + 4).toFixed(1)}"
        fill="var(--text-primary)">625</text>
      <text class="end-label" x="${(px(0) + 6).toFixed(1)}" y="${(py(reported[0]) - 9).toFixed(1)}"
        fill="var(--text-secondary)" style="font-weight:500">60</text>
    </svg>`,
    src: 'CSO crime by type of offence 1975&ndash;2022; TTPS murders by division 2015&ndash;2024',
    table: `<table><thead><tr><th>Year</th><th>Murders</th></tr></thead><tbody>${
      years.map((y, i) => `<tr><td>${y}</td><td>${fmt(reported[i])}</td></tr>`).join('')}</tbody></table>`,
  });

  attachCrosshair($('#cc-long'), { years, px, series: [{ name: 'Murders', values: reported, py }] });
}

// ── Chart 2: reported against detected ──────────────────────
function chartGap() {
  const { years, reported, detected } = CRIME.national;
  const { max: maxY, ticks } = niceScale(Math.max(...reported));
  const px = i => PAD.l + (i / (years.length - 1)) * (CW - PAD.l - PAD.r);
  const py = v => PAD.t + (1 - v / maxY) * (CH - PAD.t - PAD.b);
  const line = a => a.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const last = years.length - 1;

  chartCard($('#cc-gap'), {
    title: 'Reported murders against detected murders, 2015 to 2024',
    sub: 'Both series are counts of murders on one axis. Reported rose from 420 to 625. Detected stayed between 65 and 89 the whole time. The denominator grew and the numerator did not.',
    legend: `<span class="legend-key"><span class="legend-line" style="background:var(--series-reported)"></span>Reported</span>
             <span class="legend-key"><span class="legend-line" style="background:var(--series-detected)"></span>Detected</span>`,
    svg: `<svg class="chart-svg" viewBox="0 0 ${CW} ${CH}" role="img"
        aria-label="Two line series: reported murders rising from 420 to 625 while detected murders stay flat between 65 and 89">
      ${axes(maxY, ticks, years.filter((y, i) => i % 2 === 0 || i === last), y => px(years.indexOf(y)))}
      <polyline points="${line(reported)}" fill="none" stroke="var(--series-reported)" stroke-width="2"
        stroke-linejoin="round" stroke-linecap="round"/>
      <polyline points="${line(detected)}" fill="none" stroke="var(--series-detected)" stroke-width="2"
        stroke-linejoin="round" stroke-linecap="round"/>
      <line class="crosshair" y1="${PAD.t}" y2="${CH - PAD.b}" stroke="var(--text-tertiary)"
        stroke-width="1" opacity="0"/>
      <circle class="ch-dot" r="4.5" fill="var(--series-reported)" stroke="var(--surface)" stroke-width="2" opacity="0"/>
      <circle class="ch-dot" r="4.5" fill="var(--series-detected)" stroke="var(--surface)" stroke-width="2" opacity="0"/>
      <circle cx="${px(last).toFixed(1)}" cy="${py(reported[last]).toFixed(1)}" r="4"
        fill="var(--series-reported)" stroke="var(--surface)" stroke-width="2"/>
      <text class="end-label" x="${(px(last) + 9).toFixed(1)}" y="${(py(reported[last]) + 4).toFixed(1)}"
        fill="var(--text-primary)">625</text>
      <circle cx="${px(last).toFixed(1)}" cy="${py(detected[last]).toFixed(1)}" r="4"
        fill="var(--series-detected)" stroke="var(--surface)" stroke-width="2"/>
      <text class="end-label" x="${(px(last) + 9).toFixed(1)}" y="${(py(detected[last]) + 4).toFixed(1)}"
        fill="var(--text-primary)">86</text>
    </svg>`,
    src: 'TTPS murders by police division 2015&ndash;2024, summed to national',
    table: `<table><thead><tr><th>Year</th><th>Reported</th><th>Detected</th><th>Rate</th></tr></thead><tbody>${
      years.map((y, i) => `<tr><td>${y}</td><td>${fmt(reported[i])}</td><td>${fmt(detected[i])}</td><td>${CRIME.national.detectionPct[i]}%</td></tr>`).join('')}</tbody></table>`,
  });

  attachCrosshair($('#cc-gap'), {
    years, px,
    series: [{ name: 'Reported', values: reported, py }, { name: 'Detected', values: detected, py }],
  });
}

// ── Chart 3: divisions ──────────────────────────────────────
function chartDiv() {
  const rows = DIV_ORDER.map(d => ({ d, ...divStats(d) })).sort((a, b) => b.total - a.total);
  const { max: maxV, ticks } = niceScale(rows[0].total, 5);
  const BAR = 22, GAP = 12, LBL = 108, VAL = 74;
  const W = 720, plotW = W - LBL - VAL;
  const H = rows.length * (BAR + GAP) + 26;
  const bx = v => (v / maxV) * plotW;

  const bars = rows.map((r, i) => {
    const y = i * (BAR + GAP), w = Math.max(bx(r.total), 2);
    return `<g class="bar-g" data-div="${r.d}">
      <text class="axis-text" x="${LBL - 10}" y="${y + BAR / 2 + 3.5}" text-anchor="end"
        style="font-size:11px;fill:var(--text-secondary)">${r.d}</text>
      <rect x="${LBL}" y="${y}" width="${w.toFixed(1)}" height="${BAR}" rx="4"
        fill="var(--series-reported)" fill-opacity="0.85"/>
      <rect x="${LBL}" y="${y}" width="4" height="${BAR}" fill="var(--series-reported)" fill-opacity="0.85"/>
      <text class="end-label" x="${(LBL + w + 9).toFixed(1)}" y="${y + BAR / 2 + 4}"
        fill="var(--text-primary)" style="font-size:11.5px">${fmt(r.total)}</text>
      <text class="axis-text" x="${(LBL + w + 9 + 34).toFixed(1)}" y="${y + BAR / 2 + 4}"
        style="fill:var(--text-tertiary)">${r.pct}%</text>
      <rect x="0" y="${y - GAP / 2}" width="${W}" height="${BAR + GAP}" fill="transparent"/>
    </g>`;
  }).join('');

  const grid = ticks.map(t => `<line class="gridline" x1="${LBL + bx(t)}" y1="-6"
      x2="${LBL + bx(t)}" y2="${rows.length * (BAR + GAP) - GAP + 4}"/>
    <text class="axis-text" x="${LBL + bx(t)}" y="${rows.length * (BAR + GAP) + 12}"
      text-anchor="middle">${fmt(t)}</text>`).join('');

  chartCard($('#cc-div'), {
    title: 'Murders by police division, 2015 to 2024',
    sub: 'Ten-year totals, with each division’s detection rate beside its bar. Northern carries the largest total. Port of Spain has the lowest detection rate of the nine at 9%, and Tobago the highest at 34.5% on much smaller numbers.',
    svg: `<svg class="chart-svg" viewBox="0 -10 ${W} ${H}" role="img"
        aria-label="Bar chart of murders by police division 2015 to 2024, led by Northern and Port of Spain">
      ${grid}${bars}</svg>`,
    src: 'TTPS murders by police division 2015&ndash;2024',
    table: `<table><thead><tr><th>Division</th><th>Murders</th><th>Detected</th><th>Rate</th><th>2024</th></tr></thead><tbody>${
      rows.map(r => `<tr><td>${r.d}</td><td>${fmt(r.total)}</td><td>${fmt(r.totalDet)}</td><td>${r.pct}%</td><td>${fmt(r.latest)}</td></tr>`).join('')}</tbody></table>`,
  });

  $('#cc-div').querySelectorAll('.bar-g').forEach(g => {
    const r = rows.find(x => x.d === g.dataset.div);
    g.addEventListener('mousemove', e => showTip(
      `<span class="tip-t">${esc(r.d)} Division</span>
       <span class="tip-r"><span>Murders 2015&ndash;24</span><span>${fmt(r.total)}</span></span>
       <span class="tip-r"><span>Detected</span><span>${fmt(r.totalDet)}</span></span>
       <span class="tip-r"><span>Detection rate</span><span>${r.pct}%</span></span>
       <span class="tip-r"><span>In 2024</span><span>${fmt(r.latest)}</span></span>`, e.clientX, e.clientY));
    g.addEventListener('mouseleave', hideTip);
  });
}

function renderHeroStats() {
  const n = nationalStats(), ml = CRIME.murderLong;
  const pcts = CRIME.national.detectionPct;
  const stats = [
    { num: fmt(n.reported), label: `murders recorded in ${n.year}`, sub: 'the highest in the fifty-year series' },
    { num: n.pct + '%', label: 'of those were detected', sub: `between ${Math.min(...pcts)}% and ${Math.max(...pcts)}% every year since 2015`, alarm: true },
    { num: Math.round(n.reported / ml.reported[0]) + '×', label: `the ${ml.years[0]} figure`, sub: `${ml.reported[0]} murders in ${ml.years[0]}, ${fmt(n.reported)} in ${n.year}` },
    { num: '9', label: 'police divisions in the record', sub: 'each one tracked separately since 2015' },
  ];
  $('#hero-stats').innerHTML = stats.map(s => `<div class="hstat">
    <div class="hstat-num${s.alarm ? ' alarm' : ''}">${s.num}</div>
    <div class="hstat-label">${s.label}</div>
    <div class="hstat-sub">${s.sub}</div></div>`).join('');
}

let contextDone = false;
function renderContext() {
  if (contextDone) return;
  renderHeroStats(); chartLong(); chartGap(); chartDiv();
  contextDone = true;
}

// ════════════════════════════════════════════════════════════
// TABS + WIRING
// ════════════════════════════════════════════════════════════
const RENDER = { feed: renderFeedPanel, map: renderMapPanel, report: () => {}, context: renderContext };

function switchTab(name) {
  state.tab = name;
  ['feed', 'map', 'report', 'context'].forEach(t => {
    $('#tab-' + t).setAttribute('aria-selected', String(t === name));
    $('#panel-' + t).hidden = t !== name;
  });
  // Context holds no invented content, and its own copy covers provenance.
  $('#demo-banner').hidden = name === 'context';
  hideTip();
  RENDER[name]();
  if (location.hash.slice(1) !== name) history.replaceState(null, '', location.search + '#' + name);
}

document.querySelectorAll('.tab').forEach(t =>
  t.addEventListener('click', () => switchTab(t.id.replace('tab-', ''))));

$('#div-list').addEventListener('click', e => {
  const b = e.target.closest('.div-btn'); if (!b) return;
  state.division = b.dataset.div;
  if (state.division !== 'all') state.mapSel = state.division;
  renderFeedPanel();
});

$('#status-chips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  state.status = b.dataset.status;
  $('#status-chips').querySelectorAll('.chip').forEach(x =>
    x.setAttribute('aria-pressed', String(x === b)));
  renderFeed();
});

$('#ml-live').addEventListener('click', () => { state.mapLayer = 'live'; syncMapToggle(); });
$('#ml-official').addEventListener('click', () => { state.mapLayer = 'official'; syncMapToggle(); });
function syncMapToggle() {
  $('#ml-live').setAttribute('aria-pressed', String(state.mapLayer === 'live'));
  $('#ml-official').setAttribute('aria-pressed', String(state.mapLayer === 'official'));
  // Keep the chosen layer in the URL so a particular view can be linked to.
  const q = state.mapLayer === 'official' ? '?layer=official' : '';
  history.replaceState(null, '', q + '#' + state.tab);
  renderMap();
}
if (new URLSearchParams(location.search).get('layer') === 'official') {
  state.mapLayer = 'official';
  $('#ml-live').setAttribute('aria-pressed', 'false');
  $('#ml-official').setAttribute('aria-pressed', 'true');
}

initReport();
const start = ['feed', 'map', 'report', 'context'].includes(location.hash.slice(1))
  ? location.hash.slice(1) : 'feed';
switchTab(start);

// Keep relative timestamps honest without a full re-render storm.
setInterval(() => { if (state.tab === 'feed') renderFeed(); }, 60000);
