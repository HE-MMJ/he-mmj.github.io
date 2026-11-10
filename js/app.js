// Dashboard Timesheet HE - MMJ November 2026
// Data berasal dari js/data.js (const DATA dan const DAILY) - tidak perlu server.

// ---------- pilihan perbandingan ----------
let CMP = 'MA'; // 'MA' | 'RATIO' | 'PA'

const CMP_CFG = {
  MA: {
    field: 'MA',
    judul: 'MA',
    satuan: 'MA (%)',
    warna: '#D97706',
    tetapMax: 100,
    tick: v => v.toFixed(0) + '%',
    nilai: v => v.toFixed(1) + '%',
    catatan: 'Batang biru = HM Total (skala kiri, jam). Garis amber = MA % (skala kanan 0-100%).'
  },
  RATIO: {
    field: 'FuelRatio',
    judul: 'Fuel Ratio',
    satuan: 'Fuel Ratio (L/Jam)',
    warna: '#0D9488',
    tetapMax: 30,
    tick: v => v.toFixed(2),
    nilai: v => v.toFixed(2),
    catatan: 'Batang biru = HM Total (skala kiri, jam). Garis teal = Fuel Ratio L/Jam (skala kanan 0-30).'
  },
  PA: {
    field: 'PAPct',
    judul: 'PA',
    satuan: 'PA (%)',
    warna: '#7C3AED',
    tetapMax: 100,
    tick: v => v.toFixed(0) + '%',
    nilai: v => v.toFixed(1) + '%',
    catatan: 'Batang biru = HM Total (skala kiri, jam). Garis ungu = PA % (Physical Availability) dari blok EFISIENSI Review Unit (skala kanan 0-100%).'
  }
};

// ikon garis (stroke) untuk kartu ringkasan
const CARD_ICO = {
  unit: '<rect x="2.5" y="6.5" width="11" height="8" rx="1.2"/><path d="M13.5 9.5h3.2l2.8 3v2h-6z"/><circle cx="6.5" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
  clock: '<circle cx="12" cy="12" r="8.2"/><path d="M12 7.6V12l3 1.8"/>',
  activity: '<path d="M3 12h3.6l2.4-6 3.4 12 2.4-6H21"/>',
  gauge: '<path d="M4 17.5a8.2 8.2 0 1 1 16 0"/><path d="M12 17.5 16 11"/>',
  fuel: '<path d="M12 3.5s5.6 5.7 5.6 9.3A5.6 5.6 0 0 1 6.4 12.8C6.4 9.2 12 3.5 12 3.5Z"/>',
  trend: '<path d="M3 16.5 9.2 10l3.3 3.3L21 5"/><path d="M15.6 5H21v5.4"/>'
};

// ---------- state grafik ----------
// Jatah minimum jam kerja (HM) per unit per bulan -> dasar perhitungan Sisa HM
const MIN_HOURS = 240;

let lastRows = [];   // data yang sedang tampil (untuk redraw saat hover)
let hoverIdx = -1;   // indeks batang yang disorot mouse
let GEO = null;      // geometri grafik terakhir (untuk hit-test mouse)
let animRAF = null;  // requestAnimationFrame animasi
let TITLE_BASE = 'Grafik HM & MA per Unit'; // judul grafik tanpa info rentang

function filtered() {
  const v = document.getElementById('fVendor').value;
  const area = document.getElementById('fArea').value;
  const jenis = document.getElementById('fJenis').value;
  return DATA.filter(d =>
    (v === 'ALL' || d.Vendor === v) &&
    (area === 'ALL' || (d.Area || '') === area) &&
    (jenis === 'ALL' || (d.Jenis || '-') === jenis)
  );
}

// ---------- rentang waktu (kalender) ----------
// DAILYUNIT: [{ Unit, Vendor, D: { "1": [hm, mohh, bd, idle, ops, q, fuel], ... } }]
const DU = (typeof DAILYUNIT !== 'undefined' && Array.isArray(DAILYUNIT)) ? DAILYUNIT : [];
const DU_MAP = {};
DU.forEach(r => { DU_MAP[unitKey(r.Unit)] = r.D || {}; });

function unitKey(s) { return String(s || '').replace(/\s+/g, ' ').trim().toUpperCase(); }

function dayOf(iso) {
  const p = String(iso || '').split('-');
  const n = parseInt(p[2], 10);
  return (n >= 1 && n <= 31) ? n : 0;
}

function rangeState() {
  const fEl = document.getElementById('fFrom');
  const tEl = document.getElementById('fTo');
  let from = fEl ? dayOf(fEl.value) : 0;
  let to = tEl ? dayOf(tEl.value) : 0;
  if (!from) from = 1;
  if (!to) to = 30;
  if (from > to) { const x = from; from = to; to = x; }
  const full = (from <= 1 && to >= 30);
  return { from, to, full };
}

// hitung ulang HM / MA / PA / Fuel sesuai rentang tanggal (dari input harian)
function applyRange(rows) {
  const rs = rangeState();
  if (rs.full) return rows.map(d => ({ ...d, _range: false }));
  return rows.map(d => {
    const D = DU_MAP[unitKey(d.Unit)];
    if (!D || !Object.keys(D).length) {
      return { ...d, HMTotal: 0, MA: 0, PAPct: 0, Fuel: 0, FuelRatio: 0, _range: true, _noharian: true };
    }
    let hm = 0, mohh = 0, bd = 0, idle = 0, ops = 0, q = 0, fuel = 0;
    for (let hari = rs.from; hari <= rs.to; hari++) {
      const v = D[String(hari)];
      if (!v) continue;
      hm += Number(v[0]) || 0;
      mohh += Number(v[1]) || 0;
      bd += Number(v[2]) || 0;
      idle += Number(v[3]) || 0;
      ops += Number(v[4]) || 0;
      q += Number(v[5]) || 0;
      fuel += Number(v[6]) || 0;
    }
    const ma = (bd + q) > 0 ? (q / (bd + q)) * 100 : 0;
    const pa = mohh > 0 ? ((idle + ops + q) / mohh) * 100 : 0;
    return {
      ...d,
      HMTotal: +hm.toFixed(1),
      MA: +ma.toFixed(2),
      PAPct: +pa.toFixed(2),
      Fuel: +fuel.toFixed(1),
      FuelRatio: hm > 0 ? +(fuel / hm).toFixed(2) : 0,
      _range: true
    };
  });
}

function num(x) {
  if (x === null || x === undefined) return 0;
  const s = String(x).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// format angka gaya Indonesia: titik untuk ribuan, koma untuk desimal (mis. 1.190,5)
function fmt(v, dec = 1) {
  const n = Number(v) || 0;
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

// skala "bulat" untuk sumbu kanan (1, 2, 2.5, 5, 10 x 10^n)
function niceMax(v) {
  if (!(v > 0)) return 1;
  const exp = Math.floor(Math.log10(v));
  const f = v / Math.pow(10, exp);
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * Math.pow(10, exp);
}

// ---------- state sortir tabel ----------
let SORT = { col: null, dir: 1 }; // col: 'HMTotal' | 'MA' | 'Fuel' | 'FuelRatio'

function render() {
  const hb = hitungBelum();
  BMAP = hb.map;
  BBATAS = hb.batas;

  const rows = applyRange(filtered());
  rows.forEach(d => {
    const k = unitKey(d.Unit);
    if (BMAP[k]) { d._belum = true; d._kosong = BMAP[k]; }
  });
  updateTitle();

  // kartu ringkasan
  const sumHM = rows.reduce((s, d) => s + num(d.HMTotal), 0);
  const sumFuel = rows.reduce((s, d) => s + num(d.Fuel), 0);
  const sumPA = rows.filter(d => num(d.PAPct) > 0);
  const avgPA = sumPA.length ? sumPA.reduce((s, d) => s + num(d.PAPct), 0) / sumPA.length : 0;
  const avgMA = (() => {
    const f = rows.filter(d => num(d.MA) > 0);
    return f.length ? f.reduce((s, d) => s + num(d.MA), 0) / f.length : 0;
  })();
  const sumRatio = rows.filter(d => num(d.FuelRatio) > 0);
  const avgRatio = sumRatio.length ? sumRatio.reduce((s, d) => s + num(d.FuelRatio), 0) / sumRatio.length : 0;
  const totalUnit = (typeof DATA !== 'undefined' && Array.isArray(DATA)) ? DATA.length : rows.length;
  const cards = [
    ['Unit tampil', String(rows.length), '#1E40AF', 'unit', 'dari ' + totalUnit + ' unit'],
    ['Total HM (Jam)', sumHM.toFixed(1), '#2563EB', 'clock', 'jam operasi'],
    ['Rata-rata MA', avgMA.toFixed(1) + '%', '#D97706', 'activity', 'Mechanical Availability'],
    ['Rata-rata PA', avgPA.toFixed(1) + '%', '#7C3AED', 'gauge', 'Physical Availability'],
    ['Total Fuel (L)', fmt(sumFuel, 0), '#0D9488', 'fuel', 'liter terpakai'],
    ['Rata-rata Fuel Ratio', fmt(avgRatio, 2), '#1D4ED8', 'trend', 'liter / jam']
  ];
  document.getElementById('cards').innerHTML = cards.map(([l, v, c, ic, sub]) =>
    `<div class="card" style="--c:${c}">
      <div class="card-top">
        <div class="label">${l}</div>
        <span class="card-ico" aria-hidden="true"><svg viewBox="0 0 24 24">${CARD_ICO[ic] || ''}</svg></span>
      </div>
      <div class="val">${v}</div>
      <div class="card-sub">${sub}</div>
    </div>`).join('');

  const cu = document.getElementById('countUnit');
  if (cu) cu.textContent = rows.length;

  // tabel (urutan sesuai sortir aktif; default = urutan data)
  const tabelRows = [...rows];
  if (SORT.col) {
    tabelRows.sort((a, b) => (num(a[SORT.col]) - num(b[SORT.col])) * SORT.dir);
  }
  document.getElementById('tbody').innerHTML = tabelRows.map(d => {
    const kosong = d._noharian ? '\u2014' : null;
    const hmNum = num(d.HMTotal);
    const hmTxt = kosong || hmNum.toFixed(1);
    const maTxt = kosong || num(d.MA).toFixed(1) + '%';
    const paTxt = kosong || num(d.PAPct).toFixed(1) + '%';
    const fuelTxt = kosong || fmt(d.Fuel, 1);
    const ratioTxt = kosong || fmt(d.FuelRatio, 2);
    // sisa jatah HM = min hours bulanan - HM bulan berjalan (tidak ikut menyempit saat rentang dipersempit)
    const hmBulan = (() => {
      if (!d._range) return hmNum;
      const asli = (typeof DATA !== 'undefined' ? DATA : []).find(x => unitKey(x.Unit) === unitKey(d.Unit));
      return asli ? num(asli.HMTotal) : hmNum;
    })();
    const sisa = MIN_HOURS - hmBulan;
    const sisaTxt = kosong || sisa.toFixed(1);
    const sisaCls = kosong ? '' : (sisa < 0 ? ' sisa-over' : (sisa <= MIN_HOURS * 0.1 ? ' sisa-warn' : ' sisa-ok'));
    // model + kapasitas unit (dari sheet Database List Unit)
    const modelTxt = d.Model ? (d.Capacity && d.Capacity !== '-' ? `${d.Model}/${d.Capacity}` : d.Model) : '-';
    return `<tr>
    <td><b>${d.Unit || '-'}</b></td>
    <td>${d.Jenis || '-'}</td>
    <td>${d.Area || '-'}</td>
    <td class="model-cell">${modelTxt}</td>
    <td class="num"><b>${hmTxt}</b></td>
    <td class="num min-h">${kosong || MIN_HOURS}</td>
    <td class="num${sisaCls}"><b>${sisaTxt}</b></td>
    <td class="num">${maTxt}</td>
    <td class="num">${paTxt}</td>
    <td class="num">${fuelTxt}</td>
    <td class="num">${ratioTxt}</td>
  </tr>`;
  }).join('');

  lastRows = rows;
  hoverIdx = -1;
  updateChartNote();
  animateChart();
  renderBelum();
}

// keterangan bawah grafik: jelaskan batang merah (timesheet belum lengkap)
function updateChartNote() {
  const el = document.getElementById('chartNote');
  if (!el) return;
  const dasar = CMP_CFG[CMP].catatan;
  const adaBelum = lastRows.some(d => d._belum);
  const dasarCap = dasar + ' Batang dikelompokkan per <b>capacity</b> unit (label di bawah sumbu X).';
  el.innerHTML = adaBelum
    ? `${dasarCap} <b style="color:#DC2626">Batang merah = timesheet belum lengkap.</b>`
    : dasarCap;
}

// ---------- tabel Timesheet Belum di Terima (grid Kode Unit | Area | 1..30 | Total) ----------
// ikut terfilter oleh Vendor, Area Kerja, dan Unit Type seperti tabel Review Unit

// status ceklis 30 hari untuk satu unit (true = timesheet sudah diterima)
function belumDays(d) {
  const days = d.Days || {};
  // data resmi: blok "Timesheet Belum di Terima" di sheet Review Unit (Src='review') -> pakai apa adanya
  // fallback: unit tanpa blok P di file -> pakai data harian sheet unit
  let pakaiHarian;
  if (d.Src === 'review') {
    pakaiHarian = false;
  } else {
    pakaiHarian = !Object.keys(days).length;
    if (!pakaiHarian) {
      pakaiHarian = true;
      for (let h = 1; h <= 30; h++) { if (num(days[String(h)] ?? days[h]) > 0) { pakaiHarian = false; break; } }
    }
  }
  const DUd = DU_MAP[unitKey(d.Unit)] || {};
  const out = [];
  for (let hari = 1; hari <= 30; hari++) {
    let ada;
    if (pakaiHarian) {
      const v = DUd[String(hari)];
      ada = !!v && ((Number(v[0]) || 0) > 0 || (Number(v[5]) || 0) > 0);
    } else {
      ada = num(days[String(hari)] ?? days[hari]) > 0;
    }
    out.push(ada);
  }
  return out;
}

// ---------- peringatan "timesheet belum lengkap" di header grafik ----------
const PERIODE = { y: 2026, m: 11, last: 30 };
const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// batas hari yang seharusnya sudah masuk = kemarin (dibatasi akhir periode)
function cutoffDay() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  if (y > PERIODE.y || (y === PERIODE.y && m > PERIODE.m)) return PERIODE.last;
  if (y < PERIODE.y || (y === PERIODE.y && m < PERIODE.m)) return 0;
  return Math.min(PERIODE.last, d - 1);
}

// peta unit -> hari kosong (dihitung dari SELURUH unit, tidak ikut filter)
let BMAP = {};        // unitKey -> [hari kosong]
let BBATAS = 0;       // hari jatuh tempo

function hitungBelum() {
  const raw = (typeof BELUM !== 'undefined') ? BELUM : [];
  const all = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const rs = rangeState();
  const maks = Math.min(rs.to, cutoffDay());
  const mulai = Math.max(1, rs.from);
  const sumber = all.filter(d => Object.keys(d.Days || {}).length || DU_MAP[unitKey(d.Unit)]);
  const rows = sumber.map(d => belumDays(d));
  // hari terakhir yang datanya sudah mayoritas masuk (>=50% unit) -> dianggap sudah jatuh tempo
  let batas = 0;
  for (let h = maks; h >= 1; h--) {
    const n = rows.filter(r => r[h - 1]).length;
    if (rows.length && n / rows.length >= 0.5) { batas = h; break; }
  }
  const map = {};
  if (batas >= mulai) {
    sumber.forEach((d, i) => {
      const kosong = [];
      for (let h = mulai; h <= batas; h++) { if (!rows[i][h - 1]) kosong.push(h); }
      if (kosong.length) map[unitKey(d.Unit)] = kosong;
    });
  }
  return { map, batas, mulai };
}

function labelHari(h) { return h + ' ' + BULAN_ID[PERIODE.m - 1]; }

function renderBelum() {
  const tb = document.getElementById('belumTbody');
  if (!tb) return;
  const raw = (typeof BELUM !== 'undefined') ? BELUM : [];
  const all = Array.isArray(raw) ? raw : (raw ? [raw] : []);

  const fV = document.getElementById('fVendor').value;
  const fA = document.getElementById('fArea').value;
  const fJ = document.getElementById('fJenis').value;
  const list = all.filter(d =>
    (fV === 'ALL' || d.Vendor === fV) &&
    (fA === 'ALL' || (d.Area || '') === fA) &&
    (fJ === 'ALL' || (d.Jenis || '-') === fJ)
  );

  tb.innerHTML = list.map(d => {
    const adaHari = belumDays(d);
    let total = 0;
    let cells = '';
    for (let hari = 1; hari <= 30; hari++) {
      const ada = adaHari[hari - 1];
      if (ada) total++;
      const telat = !ada && hari <= BBATAS;
      const cls = ada ? 'day-cell day-ok' : ('day-cell' + (telat ? ' day-miss' : ' day-none'));
      cells += `<td class="${cls}"><span class="chip">${ada ? '✓' : '-'}</span></td>`;
    }
    return `<tr>
      <td><b>${d.Unit || '-'}</b></td>
      <td>${d.Area || '-'}</td>
      ${cells}
      <td class="num"><b>${total}</b></td>
    </tr>`;
  }).join('');
}

// ---------- animasi: batang & garis tumbuh dari 0 ----------
function animateChart() {
  if (animRAF) cancelAnimationFrame(animRAF);
  const dur = 650;
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
    drawCombo(lastRows, e);
    if (p < 1) {
      animRAF = requestAnimationFrame(step);
    } else {
      animRAF = null;
      drawCombo(lastRows, 1);
    }
  };
  animRAF = requestAnimationFrame(step);
}

// batang dengan sudut membulat (fallback kalau roundRect tidak ada)
function barPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, Math.max(h, 0) / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- pengelompokan capacity ----------
// urutan kelas capacity: FT -> TON -> KL -> KVA -> PC -> lainnya -> tanpa capacity
const CAP_KELAS = ['FT', 'TON', 'KL', 'KVA', 'PC'];

function capInfo(s) {
  const raw = String(s == null ? '' : s).trim();
  if (!raw || raw === '-' || raw === '\u2014') {
    return { label: 'Tanpa capacity', cls: 99, num: 0, ada: false };
  }
  const mUnit = raw.match(/[A-Za-z]+/);
  const unit = mUnit ? mUnit[0].toUpperCase() : '';
  const mNum = raw.match(/(\d+(?:[.,]\d+)?)/);
  const num = mNum ? parseFloat(mNum[1].replace(',', '.')) : 0;
  let cls = CAP_KELAS.indexOf(unit);
  if (cls < 0) cls = 50;
  return { label: raw, cls, num: isNaN(num) ? 0 : num, ada: true };
}

// kelompokkan baris per capacity; tiap kelompok menyimpan item (urutan di dalam kelompok tetap)
function groupByCapacity(list) {
  const groups = [];
  const map = new Map();
  list.forEach(d => {
    const info = capInfo(d.Capacity);
    const key = info.cls + '|' + info.num + '|' + info.label.toUpperCase();
    let g = map.get(key);
    if (!g) {
      g = { label: info.label, cls: info.cls, num: info.num, ada: info.ada, items: [] };
      map.set(key, g);
      groups.push(g);
    }
    g.items.push(d);
  });
  groups.sort((a, b) =>
    (a.cls - b.cls) ||
    (a.num - b.num) ||
    a.label.localeCompare(b.label, 'id', { numeric: true })
  );
  return groups;
}

// ---- Grafik gabungan: BAR = HM Total, GARIS = metrik pembanding ----
// prog = 0..1 (progres animasi), 1 = tampil penuh
function drawCombo(rows, prog = 1) {
  const cfg = CMP_CFG[CMP];
  const c = document.getElementById('comboChart');
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const H = 360;
  c.width = c.clientWidth * dpr;
  c.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = c.clientWidth, h = H;
  ctx.clearRect(0, 0, w, h);
  // latar putih di seluruh area grafik
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const topN = window.innerWidth < 620 ? 8 : 15;
  const top15 = [...rows].sort((a, b) => num(b.HMTotal) - num(a.HMTotal)).slice(0, topN);
  // urutkan sesuai nomor unit lalu Unit ID (tidak acak)
  const nomorUnit = u => { const m = String(u || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; };
  top15.sort((a, b) =>
    (nomorUnit(a.Unit) - nomorUnit(b.Unit)) ||
    String(a.Unit).localeCompare(String(b.Unit), 'id', { numeric: true })
  );
  // kelompokkan per capacity, lalu ratakan lagi jadi urutan batang
  const groups = groupByCapacity(top15);
  const top = groups.flatMap(g => g.items);
  if (!top.length) {
    GEO = null;
    ctx.fillStyle = '#64748B';
    ctx.font = '13px "Fira Sans", Segoe UI, sans-serif';
    ctx.fillText('Tidak ada data untuk filter ini.', 20, 30);
    return;
  }

  const maxHM = Math.max(...top.map(d => num(d.HMTotal)), 1);
  const vals = top.map(d => num(d[cfg.field]));
  const maxCmp = cfg.tetapMax !== null ? cfg.tetapMax : niceMax(Math.max(...vals) * 1.15);

  const padL = 64, padR = 74, padT = 54;
  const plotW = w - padL - padR;
  const GAP = 0.6;                       // jarak antar kelompok (satuan slot)

  // hitung posisi slot: 1 unit per batang, GAP antar kelompok
  let cursor = 0;
  groups.forEach(g => {
    g.slotAwal = cursor;
    cursor += g.items.length;
    g.slotAkhir = cursor;
    cursor += GAP;
  });
  const totalSlot = Math.max(cursor - GAP, 1);
  const slotW = plotW / totalSlot;
  const bw = slotW;
  const centers = [];
  cursor = 0;
  groups.forEach(g => {
    g.items.forEach(() => { centers.push(padL + (cursor + 0.5) * slotW); cursor += 1; });
    cursor += GAP;
  });
  const xCenter = i => centers[i];

  // --- label kelompok: hitung lebar, susun per baris agar tidak tumpang tindih ---
  ctx.save();
  ctx.font = 'bold 9.5px "Fira Code", Consolas, monospace';
  const pillPx = 14;
  groups.forEach(g => {
    g.cx = padL + ((g.slotAwal + g.slotAkhir) / 2) * slotW;
    g.teks = g.label + (g.items.length > 1 ? ' (' + g.items.length + ')' : '');
    g.pw = Math.ceil(ctx.measureText(g.teks).width) + pillPx;
    g.baris = 0;
  });
  ctx.restore();
  const barisAkhir = [];
  groups.forEach(g => {
    let r = 0;
    while (barisAkhir[r] !== undefined && (g.cx - g.pw / 2) < barisAkhir[r] + 5) r++;
    g.baris = r;
    barisAkhir[r] = g.cx + g.pw / 2;
  });
  const barisMaks = Math.max(0, barisAkhir.length - 1);

  // tinggi bawah = label unit miring + baris label kelompok
  const padB = 102 + barisMaks * 16;
  const plotH = h - padB - padT;
  const baseY = h - padB;

  // simpan geometri untuk hit-test mouse
  GEO = { padL, padB, padT, bw, slotW, plotH, n: top.length, w, h, xCenter, centers };

  // --- pita latar + pemisah antar kelompok capacity ---
  groups.forEach((g, gi) => {
    const x0 = padL + g.slotAwal * slotW;
    const x1 = padL + g.slotAkhir * slotW;
    if (gi % 2 === 1) {
      ctx.fillStyle = 'rgba(30,64,175,0.035)';
      ctx.fillRect(x0, padT - 8, x1 - x0, plotH + 10);
    }
    if (gi > 0) {
      ctx.save();
      ctx.strokeStyle = '#DCE7F5';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x0 - (GAP * slotW) / 2, padT - 8);
      ctx.lineTo(x0 - (GAP * slotW) / 2, baseY);
      ctx.stroke();
      ctx.restore();
    }
  });

  // --- sorotan latar untuk batang yang di-hover ---
  if (hoverIdx >= 0 && hoverIdx < top.length) {
    ctx.fillStyle = 'rgba(59,130,246,0.10)';
    ctx.fillRect(centers[hoverIdx] - slotW / 2, padT, slotW, plotH + 6);
  }

  // --- grid + sumbu kiri (HM) + sumbu kanan (metrik) ---
  ctx.font = '11px "Fira Code", Consolas, monospace';
  for (let i = 0; i <= 4; i++) {
    const y = baseY - i * plotH / 4;
    ctx.strokeStyle = i === 0 ? '#CBD5E1' : '#EEF2F7';
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'right';
    ctx.fillText((maxHM * i / 4).toFixed(0), padL - 8, y + 4);
    ctx.fillStyle = cfg.warna;
    ctx.textAlign = 'left';
    ctx.fillText(cfg.tick(maxCmp * i / 4), w - padR + 8, y + 4);
  }

  // judul sumbu
  ctx.fillStyle = '#94A3B8';
  ctx.textAlign = 'center';
  ctx.fillText('HM (jam)', padL - 34, padT - 16);
  ctx.fillStyle = cfg.warna;
  ctx.fillText(cfg.satuan, w - padR + 36, padT - 16);

  // --- bar HM ---
  const barW = Math.max(6, bw * 0.64);
  top.forEach((d, i) => {
    const hm = num(d.HMTotal);
    const bh = plotH * (hm / maxHM) * prog;
    const x = centers[i] - barW / 2;
    const y = baseY - bh;
    const aktif = i === hoverIdx;

    if (bh > 0.5) {
      const grad = ctx.createLinearGradient(0, y, 0, baseY);
      if (d._belum) {
        grad.addColorStop(0, aktif ? '#FCA5A5' : '#F87171');
        grad.addColorStop(1, aktif ? '#B91C1C' : '#DC2626');
      } else if (aktif) {
        grad.addColorStop(0, '#60A5FA');
        grad.addColorStop(1, '#1D4ED8');
      } else {
        grad.addColorStop(0, '#7EB3F7');
        grad.addColorStop(1, '#1E40AF');
      }
      ctx.save();
      if (aktif) {
        ctx.shadowColor = d._belum ? 'rgba(220,38,38,0.35)' : 'rgba(30,64,175,0.35)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;
      }
      ctx.fillStyle = grad;
      barPath(ctx, x, y, barW, bh, 4);
      ctx.fill();
      ctx.restore();

      if (aktif) {
        ctx.strokeStyle = d._belum ? '#991B1B' : '#1E3A8A';
        ctx.lineWidth = 1.5;
        barPath(ctx, x, y, barW, bh, 4);
        ctx.stroke();
      }
    }

    // angka HM (fade in setelah animasi jalan)
    if (hm > 0 && prog > 0.55) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (prog - 0.55) / 0.45);
      ctx.font = 'bold 10px "Fira Code", Consolas, monospace';
      ctx.textAlign = 'center';
      if (bh > 22) {
        // angka ditaruh di bagian BAWAH bar (putih) supaya tidak tertutup garis
        ctx.fillStyle = '#ffffff';
        ctx.fillText(hm.toFixed(1), x + barW / 2, baseY - 6);
      } else {
        ctx.fillStyle = '#334155';
        ctx.fillText(hm.toFixed(1), x + barW / 2, y - 5);
      }
      ctx.restore();
    }

    // label unit
    ctx.save();
    ctx.translate(xCenter(i), baseY + 12);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = i === hoverIdx ? '#1E40AF' : '#475569';
    ctx.font = (i === hoverIdx ? 'bold ' : '') + '10px "Fira Sans", Segoe UI, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(d.Unit).replace(/ (GIP|JTU|BDK|SKN)( H[12])?$/, ''), 0, 0);
    ctx.restore();
  });

  // --- label kelompok capacity di bawah label unit ---
  const groupY = baseY + 76;
  groups.forEach(g => {
    const cy = groupY + g.baris * 16;
    ctx.save();
    ctx.font = 'bold 9.5px "Fira Code", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = g.ada ? '#EEF4FE' : '#F1F5F9';
    barPath(ctx, g.cx - g.pw / 2, cy - 8, g.pw, 16, 8);
    ctx.fill();
    ctx.strokeStyle = g.ada ? '#D6E4FA' : '#E2E8F0';
    ctx.lineWidth = 1;
    barPath(ctx, g.cx - g.pw / 2, cy - 8, g.pw, 16, 8);
    ctx.stroke();
    ctx.fillStyle = g.ada ? '#1E40AF' : '#64748B';
    ctx.fillText(g.teks, g.cx, cy + 0.5);
    ctx.restore();
  });

  // --- garis metrik pembanding (ikut animasi naik dari dasar) ---
  const cmpY = v => baseY - plotH * (Math.min(Math.max(v, 0), maxCmp) / maxCmp);
  const cmpYA = v => baseY - (baseY - cmpY(v)) * prog;

  ctx.save();
  ctx.globalAlpha = Math.min(1, prog * 1.6);
  ctx.strokeStyle = cfg.warna;
  ctx.lineWidth = 2;
  ctx.beginPath();
  top.forEach((d, i) => {
    const x = xCenter(i), y = cmpYA(num(d[cfg.field]));
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
  top.forEach((d, i) => {
    const x = xCenter(i), y = cmpYA(num(d[cfg.field]));
    const r = i === hoverIdx ? 6 : 4;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = cfg.warna;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.restore();

  // --- label angka pada tiap titik garis ---
  if (prog > 0.7) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (prog - 0.7) / 0.3);
    ctx.font = 'bold 9px "Fira Code", Consolas, monospace';
    ctx.textAlign = 'center';
    top.forEach((d, i) => {
      const v = num(d[cfg.field]);
      const x = xCenter(i), y = cmpY(v);
      const teks = cfg.nilai(v);
      const diAtas = y > padT + 16;
      const tw = ctx.measureText(teks).width;
      const ty = diAtas ? y - 7 : y + 13;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(x - tw / 2 - 2, ty - 8, tw + 4, 11);
      ctx.fillStyle = cfg.warna;
      ctx.fillText(teks, x, ty);
    });
    ctx.restore();
  }

  // --- legenda ---
  ctx.textAlign = 'left';
  ctx.font = '12px "Fira Sans", Segoe UI, sans-serif';
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(padL, 8, 12, 8);
  ctx.fillStyle = '#475569';
  ctx.fillText('HM Total (jam)', padL + 18, 16);
  ctx.strokeStyle = cfg.warna;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(padL + 140, 12); ctx.lineTo(padL + 168, 12); ctx.stroke();
  ctx.fillStyle = cfg.warna;
  ctx.beginPath(); ctx.arc(padL + 154, 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#475569';
  ctx.fillText(cfg.satuan, padL + 174, 16);

  // --- tooltip saat hover ---
  if (hoverIdx >= 0 && hoverIdx < top.length && prog >= 1) {
    drawTooltip(ctx, top[hoverIdx], hoverIdx, cfg, GEO, barW, maxHM, baseY, plotH);
  }
}

// kotak tooltip: nama unit, vendor/unit type, HM, dan nilai metrik pembanding
function drawTooltip(ctx, d, i, cfg, geo, barW, maxHM, baseY, plotH) {
  const barTop = baseY - plotH * (num(d.HMTotal) / maxHM);
  const cap = capInfo(d.Capacity);
  const lines = [
    { t: String(d.Unit), bold: true, warna: '#0F172A' },
    { t: [d.Vendor, d.Jenis, d.Area].filter(Boolean).join(' - '), bold: false, warna: '#64748B' },
    { t: 'Capacity: ' + (cap.ada ? cap.label : '-'), bold: false, warna: cap.ada ? '#1E40AF' : '#94A3B8' },
    { t: 'HM Total: ' + fmt(num(d.HMTotal), 1) + ' jam', bold: true, warna: '#1E40AF' },
    { t: cfg.judul + ': ' + cfg.nilai(num(d[cfg.field])), bold: true, warna: cfg.warna }
  ];
  if (d._belum) {
    lines.push({ t: 'Timesheet belum lengkap: ' + d._kosong.map(labelHari).join(', '), bold: true, warna: '#DC2626' });
  }

  ctx.save();
  ctx.font = '11px "Fira Sans", Segoe UI, sans-serif';
  let maxW = 0;
  lines.forEach(l => {
    ctx.font = (l.bold ? 'bold ' : '') + '11px "Fira Sans", Segoe UI, sans-serif';
    maxW = Math.max(maxW, ctx.measureText(l.t).width);
  });

  const padX = 10, padY = 8, lineH = 15;
  const boxW = maxW + padX * 2;
  const boxH = lines.length * lineH + padY * 2 - 4;
  let bx = geo.xCenter(i) - boxW / 2;
  bx = Math.max(4, Math.min(bx, geo.w - boxW - 4));
  let by = barTop - boxH - 12;
  if (by < 4) by = Math.min(barTop + 12, geo.h - boxH - 4);

  // bayangan + kotak
  ctx.shadowColor = 'rgba(15,23,42,0.25)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  barPath(ctx, bx, by, boxW, boxH, 6);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#DBE3EE';
  ctx.lineWidth = 1;
  barPath(ctx, bx, by, boxW, boxH, 6);
  ctx.stroke();

  // isi teks
  ctx.textAlign = 'left';
  lines.forEach((l, k) => {
    ctx.font = (l.bold ? 'bold ' : '') + '11px "Fira Sans", Segoe UI, sans-serif';
    ctx.fillStyle = l.warna;
    ctx.fillText(l.t, bx + padX, by + padY + k * lineH + 4);
  });
  ctx.restore();
}

// ---------- interaksi mouse: hover batang ----------
(function pasangHover() {
  const c = document.getElementById('comboChart');
  if (!c) return;

  // cari batang terdekat dari posisi x (batang tidak lagi berjarak seragam)
  function idxDi(x) {
    if (!GEO || !GEO.centers) return -1;
    const setengah = GEO.slotW * 0.5;
    let best = -1, bestD = Infinity;
    GEO.centers.forEach((cx, i) => {
      const d = Math.abs(x - cx);
      if (d <= setengah && d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  c.addEventListener('mousemove', e => {
    if (!GEO) return;
    const r = c.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const idx = idxDi(x);
    if (idx !== hoverIdx) {
      hoverIdx = idx;
      c.style.cursor = idx >= 0 ? 'pointer' : 'default';
      if (!animRAF) drawCombo(lastRows, 1);
    }
  });

  c.addEventListener('mouseleave', () => {
    if (hoverIdx !== -1) {
      hoverIdx = -1;
      c.style.cursor = 'default';
      if (!animRAF) drawCombo(lastRows, 1);
    }
  });

  // sentuh (HP): tap & geser menunjuk seperti hover
  function sentuh(e) {
    if (!GEO || !e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const r = c.getBoundingClientRect();
    const x = t.clientX - r.left;
    const idx = idxDi(x);
    if (idx !== hoverIdx) {
      hoverIdx = idx;
      if (!animRAF) drawCombo(lastRows, 1);
    }
  }
  c.addEventListener('touchstart', sentuh, { passive: true });
  c.addEventListener('touchmove', sentuh, { passive: true });

  window.addEventListener('resize', () => {
    if (!animRAF) drawCombo(lastRows, 1);
  });
})();

// ---------- isi dropdown Area Kerja sesuai vendor ----------
function fillAreas() {
  const v = document.getElementById('fVendor').value;
  const sel = document.getElementById('fArea');
  const prev = sel.value;

  const areas = [...new Set(
    DATA.filter(d => v === 'ALL' || d.Vendor === v)
        .map(d => (d.Area || '').trim())
        .filter(a => a)
  )].sort((a, b) => a.localeCompare(b));

  sel.innerHTML = '<option value="ALL">Semua Area</option>' +
    areas.map(a => `<option value="${a}">${a}</option>`).join('');

  sel.value = (prev === 'ALL' || areas.includes(prev)) ? prev : 'ALL';
}

// ---------- isi dropdown Unit Type (JENIS) sesuai vendor + area ----------
function fillJenis() {
  const v = document.getElementById('fVendor').value;
  const area = document.getElementById('fArea').value;
  const sel = document.getElementById('fJenis');
  const prev = sel.value;

  const rows = DATA.filter(d =>
    (v === 'ALL' || d.Vendor === v) &&
    (area === 'ALL' || (d.Area || '') === area)
  );

  const jenisList = [...new Set(rows.map(d => d.Jenis || '-'))].sort((a, b) => a.localeCompare(b));

  sel.innerHTML = '<option value="ALL">Semua Unit Type</option>' +
    jenisList.map(j => `<option value="${j}">${j}</option>`).join('');

  sel.value = (prev === 'ALL' || jenisList.includes(prev)) ? prev : 'ALL';
}

// ---------- sortir kolom tabel via klik header ----------
function refreshArrows() {
  document.querySelectorAll('.arrow').forEach(a => {
    a.textContent = (SORT.col === a.dataset.arrow) ? (SORT.dir === 1 ? '▲' : '▼') : '';
  });
}

function setSort(col) {
  if (SORT.col === col) {
    SORT.dir = -SORT.dir;          // klik kolom yang sama -> balik arah
  } else {
    SORT.col = col;
    SORT.dir = -1;                 // kolom baru -> terbesar dulu
  }
  refreshArrows();
  render();
}

document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => setSort(th.dataset.sort));
});

// ---------- menu perbandingan ----------
function setCmp(key) {
  CMP = key;
  const cfg = CMP_CFG[key];
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cmp === key);
  });
  const topN = window.innerWidth < 620 ? 8 : 15;
  TITLE_BASE = `Grafik HM (Bar) & ${cfg.judul} (Garis) per Unit - Top ${topN} · per Capacity`;
  updateTitle();
  document.getElementById('chartNote').textContent = cfg.catatan;
  render();
}

// judul grafik + info rentang waktu aktif
function updateTitle() {
  const el = document.getElementById('chartTitle');
  if (!el) return;
  const rs = rangeState();
  el.textContent = TITLE_BASE + (rs.full ? '' : ` · ${rs.from}\u2013${rs.to} Nov 2026`);
}

// ---------- kalender rentang: satu kalender, klik tanggal awal lalu tanggal akhir ----------
const CAL = { y: 2026, m: 11, pick: null };

function isoOf(day) { return `2026-11-${String(day).padStart(2, '0')}`; }

function rangeLabel() {
  const rs = rangeState();
  const nm = d => String(d).padStart(2, '0');
  return `${nm(rs.from)} Nov \u2013 ${nm(rs.to)} Nov 2026`;
}

function setRange(from, to) {
  const f = document.getElementById('fFrom');
  const t = document.getElementById('fTo');
  if (f) f.value = isoOf(from);
  if (t) t.value = isoOf(to);
  const lbl = document.getElementById('rangeVal');
  if (lbl) lbl.textContent = rangeLabel();
  render();
}

function pilihHari(d) {
  if (CAL.pick === null) {
    CAL.pick = d;             // klik pertama: tandai tanggal awal (belum mengubah grafik)
    renderKalender();
    return;
  }
  const a = Math.min(CAL.pick, d), b = Math.max(CAL.pick, d);
  CAL.pick = null;
  setRange(a, b);
  tutupKalender();
}

function renderKalender() {
  const pop = document.getElementById('calPop');
  if (!pop) return;
  const rs = rangeState();
  const pk = CAL.pick;
  const from = pk !== null ? pk : (rs.full ? 0 : rs.from);
  const to = pk !== null ? pk : (rs.full ? 0 : rs.to);
  const jml = new Date(CAL.y, CAL.m, 0).getDate();
  const mulai = new Date(CAL.y, CAL.m - 1, 1).getDay();
  const now = new Date();
  const hariIni = (now.getFullYear() === CAL.y && now.getMonth() === CAL.m - 1) ? now.getDate() : 0;
  const dow = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  let html = `<div class="cal-head"><span>November 2026</span><span class="cal-hint">${CAL.pick ? 'klik tanggal akhir' : 'klik tanggal awal'}</span></div><div class="cal-grid">`;
  html += dow.map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < mulai; i++) html += '<div></div>';
  for (let d = 1; d <= jml; d++) {
    const dalam = from && to && d > from && d < to;
    const tepi = !!from && !!to && (d === from || d === to);
    const cls = ['cal-day'];
    if (dalam) cls.push('in-range');
    if (tepi) cls.push('edge', from === to ? 'single' : (d === from ? 'start' : 'end'));
    if (d === hariIni) cls.push('today');
    html += `<button type="button" class="${cls.join(' ')}" data-day="${d}">${d}</button>`;
  }
  html += `</div><div class="cal-foot"><span class="cal-hint">Pilih 2 tanggal (awal &amp; akhir)</span><button type="button" class="btn-reset" id="fReset">Semua</button></div>`;
  pop.innerHTML = html;
  pop.querySelectorAll('.cal-day').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation();
    pilihHari(parseInt(b.dataset.day, 10));
  }));
  const rst = pop.querySelector('#fReset');
  if (rst) rst.addEventListener('click', ev => { ev.stopPropagation(); CAL.pick = null; setRange(1, 30); tutupKalender(); });
}

function bukaKalender() {
  const pop = document.getElementById('calPop');
  if (!pop) return;
  CAL.pick = null;
  renderKalender();
  pop.hidden = false;
}

function tutupKalender() {
  const pop = document.getElementById('calPop');
  if (pop) pop.hidden = true;
}

// pastikan tanggal awal tidak melewati tanggal akhir
function syncRange() {
  const f = document.getElementById('fFrom');
  const t = document.getElementById('fTo');
  if (!f || !t || !f.value || !t.value) return;
  if (f.value > t.value) { const x = f.value; f.value = t.value; t.value = x; }
}

document.querySelectorAll('.seg-btn').forEach(b => {
  b.addEventListener('click', () => setCmp(b.dataset.cmp));
});

document.getElementById('fVendor').addEventListener('change', () => { fillAreas(); fillJenis(); render(); });
document.getElementById('fArea').addEventListener('change', () => { fillJenis(); render(); });
document.getElementById('fJenis').addEventListener('change', () => render());

// tombol reset filter
const btnReset = document.getElementById('btnResetFilter');
if (btnReset) btnReset.addEventListener('click', () => {
  document.getElementById('fVendor').value = 'ALL';
  fillAreas();
  document.getElementById('fArea').value = 'ALL';
  fillJenis();
  document.getElementById('fJenis').value = 'ALL';
  render();
});

// kalender rentang waktu
const rangeBtn = document.getElementById('rangeBtn');
if (rangeBtn) rangeBtn.addEventListener('click', e => {
  e.stopPropagation();
  const pop = document.getElementById('calPop');
  if (pop && !pop.hidden) tutupKalender(); else bukaKalender();
});
document.addEventListener('click', e => {
  if (!e.target.closest('.range-wrap')) tutupKalender();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') tutupKalender(); });

fillAreas();
fillJenis();
setCmp('MA');
const lblAwal = document.getElementById('rangeVal');
if (lblAwal) lblAwal.textContent = rangeLabel();
