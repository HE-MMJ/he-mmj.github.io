/* assets/js/tab/he.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
(function(){
var _H = window.MMJ_HE || {}, _W = window.MMJ_WT || {};
var DATA = _H.DATA || [], DAILY = _H.DAILY || [], BELUM = _H.BELUM || [];
var WT_PERIODE = _W.PERIODE || null, WT_DATA = _W.DATA || [];

// Dashboard Timesheet HE - MMJ November 2026
// Data berasal dari js/data.js (const DATA dan const DAILY) - tidak perlu server.

// Unit Water Truck (WT SKN-01..04) sudah tampil di tabel Penyiraman (WT),
// jadi dikeluarkan dari dashboard HE supaya tidak dobel.
if (Array.isArray(DATA)) {
  const tanpaWT = DATA.filter(d => (d.Jenis || '') !== 'Water Truck');
  if (tanpaWT.length !== DATA.length) DATA.splice(0, DATA.length, ...tanpaWT);
}

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
  // Dropdown dipakai bersama HE & WT. Nilai yang hanya ada di data WT
  // (mis. vendor "WT TSA") tidak boleh mengosongkan tabel HE.
  const pakaiV = v !== 'ALL' && DATA.some(d => d.Vendor === v);
  const pakaiA = area !== 'ALL' && DATA.some(d => (d.Area || '') === area);
  const pakaiJ = jenis !== 'ALL' && DATA.some(d => (d.Jenis || '-') === jenis);
  return DATA.filter(d =>
    (!pakaiV || d.Vendor === v) &&
    (!pakaiA || (d.Area || '') === area) &&
    (!pakaiJ || (d.Jenis || '-') === jenis)
  );
}

// ---------- rentang waktu (kalender) ----------
// DAILYUNIT: [{ Unit, Vendor, D: { "1": [hm, mohh, bd, idle, ops, q, fuel], ... } }]
const DU = (typeof DAILYUNIT !== 'undefined' && Array.isArray(DAILYUNIT)) ? DAILYUNIT : [];

// data Water Truck (dipakai bersama: kartu ringkasan + dropdown filter)
const WTD = (typeof WT_DATA !== 'undefined' && Array.isArray(WT_DATA)) ? WT_DATA : [];

// helper filter WT (mirror dari js/wt.js) dipakai tabel Belum & dropdown
const WT_SHIFT1 = ['TLK', 'FBS', 'ASA'];
const CHK_OK = '<svg class="chk" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5 L5 9 L9.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function wtVendorKey(s) { return String(s || '').toUpperCase().replace(/^WT\s+/, '').trim(); }
function wtNormKey(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function wtJenisCocok(d, j) {
  if (!j || j === 'ALL') return true;
  if (wtNormKey(j) === 'watertruck') return true;
  return wtNormKey(d.Model) === wtNormKey(j);
}
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

// bulat tanpa desimal (pemisah ribuan gaya Indonesia)
function fmt0(v) {
  return Math.round(Number(v) || 0).toLocaleString('id-ID');
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

// ---------- running text (ticker) ----------
// Aturan warna tiap unit. Tambah aturan baru di sini:
//   { id, test(d) -> true bila kondisi terpenuhi, cls (kelas CSS) }
// cls "rt-alert" = merah (kritis), "rt-warn" = oranye, "rt-ok" = hijau.
const RUN_RULES = [
  { id: 'hm-gt-ma', test: d => num(d.HMTotal) > num(d.MA), cls: 'rt-alert' }
];

// kecepatan geser running text (px per detik) -越小 = lebih lambat
const RUN_TEXT_SPEED = 40;

// kelas kondisi yang ditampilkan di running text (unit normal disembunyikan)
const RUN_TEXT_SHOW = ['rt-alert', 'rt-warn'];

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// baris unit WT untuk running text (HM total & MA dari data WT)
function wtRunRows() {
  const fV = document.getElementById('fVendor').value;
  const fA = document.getElementById('fArea').value;
  const fJ = document.getElementById('fJenis').value;
  const pakaiV = fV !== 'ALL' && WTD.some(d => wtVendorKey(d.Vendor) === wtVendorKey(fV));
  const pakaiA = fA !== 'ALL' && WTD.some(d => wtNormKey(d.Area) === wtNormKey(fA));
  const pakaiJ = fJ !== 'ALL' && WTD.some(d => wtJenisCocok(d, fJ));
  return WTD.filter(d =>
    (!pakaiV || wtVendorKey(d.Vendor) === wtVendorKey(fV)) &&
    (!pakaiA || wtNormKey(d.Area) === wtNormKey(fA)) &&
    (!pakaiJ || wtJenisCocok(d, fJ))
  ).map(d => {
    let hm = 0, p = 0;
    const D = d.Days || {};
    for (const k in D) { hm += num(D[k].HM); p += num(D[k].P); }
    return { Unit: d.Unit, HMTotal: hm, MA: num(d.MA), P: p, Vendor: d.Vendor };
  });
}

// bangun isi ticker: hanya unit dengan kondisi alert/warn yang ditampilkan
function renderRunText() {
  const track = document.getElementById('runTextTrack');
  if (!track) return;
  const heRows = lastRows || [];
  const wtRows = wtRunRows();

  // bikin html 1 item + daftar kelas kondisinya
  const build = d => {
    const cls = RUN_RULES.filter(r => { try { return r.test(d); } catch (e) { return false; } })
      .map(r => r.cls).join(' ');
    const hm = fmt(num(d.HMTotal), 1);
    const ma = fmt(num(d.MA), 1) + '%';
    const peny = (d.P !== undefined) ? ' \u00b7 Penyiraman ' + fmt0(d.P) + ' rit' : '';
    const teks = escHtml(d.Unit || '-') + ' \u00b7 HM ' + hm + ' jam \u00b7 MA ' + ma + peny;
    const tampil = cls.split(' ').some(c => RUN_TEXT_SHOW.indexOf(c) >= 0);
    return { cls: cls, tampil: tampil, html: '<span class="running-text-item' + (cls ? ' ' + cls : '') + '">' + teks + '</span>' };
  };

  const heItems = heRows.map(build).filter(x => x.tampil);
  const wtItems = wtRows.map(build).filter(x => x.tampil);

  if (!heItems.length && !wtItems.length) {
    const pesan = (heRows.length || wtRows.length)
      ? 'Semua unit dalam kondisi baik \u2014 tidak ada peringatan.'
      : 'Tidak ada unit yang cocok dengan filter di atas.';
    track.innerHTML = '<span class="rt-set"><span class="running-text-item rt-ok">' + pesan + '</span></span>';
    track.style.animationDuration = '';
    return;
  }

  let items = heItems.map(x => x.html).join('');
  if (wtItems.length) {
    items += '<span class="running-text-item rt-sep">Water Truck \u00b7</span>';
    items += wtItems.map(x => x.html).join('');
  }

  // dua set identik supaya loop marquee tidak terputus
  track.innerHTML = '<span class="rt-set">' + items + '</span>' +
                    '<span class="rt-set" aria-hidden="true">' + items + '</span>';

  // kecepatan konstan: durasi animasi disesuaikan lebar isi (tidak ikut jumlah unit)
  requestAnimationFrame(() => {
    const w = track.scrollWidth / 2;           // lebar satu set = jarak satu putaran
    if (w > 0) track.style.animationDuration = Math.round(w / RUN_TEXT_SPEED) + 's';
  });
}

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
  const totalUnit = DATA.length + WTD.length;
  const wtInfo = (typeof window.WT_summary === 'function') ? window.WT_summary() : null;
  const wtPenyiraman = wtInfo ? wtInfo.total : WTD.reduce((s, d) => {
    const D = d.Days || {};
    let p = 0;
    for (const k in D) p += num(D[k].P);
    return s + p;
  }, 0);

  const cards = [
    ['Ketersediaan Unit', String(totalUnit), '#1E40AF', 'unit', 'unit HE + WT'],
    ['Total HM (Jam)', sumHM.toFixed(1), '#2563EB', 'clock', 'jam operasi'],
    ['Rata-rata MA', avgMA.toFixed(1) + '%', '#D97706', 'activity', 'Mechanical Availability'],
    ['Rata-rata PA', avgPA.toFixed(1) + '%', '#7C3AED', 'gauge', 'Physical Availability'],
    ['Total Fuel (L)', fmt(sumFuel, 0), '#0D9488', 'fuel', 'liter terpakai'],
    ['Rata-rata Fuel Ratio', fmt(avgRatio, 2), '#1D4ED8', 'trend', 'liter / jam'],
    ['Total Penyiraman (WT)', fmt(wtPenyiraman, 0), '#0891B2', 'fuel', 'rit penyiraman WT', 'total']
  ];
  document.getElementById('cards').innerHTML = cards.map(([l, v, c, ic, sub, key]) =>
    `<div class="card" style="--c:${c}"${key ? ` data-wt="${key}"` : ''}>
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
  renderRunText();
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
  const tbWt = document.getElementById('belumWtTbody');
  if (!tb) return;
  const raw = (typeof BELUM !== 'undefined') ? BELUM : [];
  const all = Array.isArray(raw) ? raw : (raw ? [raw] : []);

  const fV = document.getElementById('fVendor').value;
  const fA = document.getElementById('fArea').value;
  const fJ = document.getElementById('fJenis').value;
  const pakaiV = fV !== 'ALL' && all.some(d => d.Vendor === fV);
  const pakaiA = fA !== 'ALL' && all.some(d => (d.Area || '') === fA);
  const pakaiJ = fJ !== 'ALL' && all.some(d => (d.Jenis || '-') === fJ);
  const list = all.filter(d =>
    (!pakaiV || d.Vendor === fV) &&
    (!pakaiA || (d.Area || '') === fA) &&
    (!pakaiJ || (d.Jenis || '-') === fJ)
  );

  // WT units (shift S/M) ikut filter yang sama
  const wtPakaiV = fV !== 'ALL' && WTD.some(d => wtVendorKey(d.Vendor) === wtVendorKey(fV));
  const wtPakaiA = fA !== 'ALL' && WTD.some(d => wtNormKey(d.Area) === wtNormKey(fA));
  const wtPakaiJ = fJ !== 'ALL' && WTD.some(d => wtJenisCocok(d, fJ));
  const wtRows = WTD.filter(d =>
    (!wtPakaiV || wtVendorKey(d.Vendor) === wtVendorKey(fV)) &&
    (!wtPakaiA || wtNormKey(d.Area) === wtNormKey(fA)) &&
    (!wtPakaiJ || wtJenisCocok(d, fJ))
  ).map(d => {
    const single = WT_SHIFT1.indexOf(wtVendorKey(d.Vendor)) >= 0 || (d.Shift2 === false || d.Shift2 === 0);
      const S = (Array.isArray(d.BelumS) && d.BelumS.length === 30) ? d.BelumS.slice() : new Array(30).fill(0);
      const M = (Array.isArray(d.BelumM) && d.BelumM.length === 30) ? d.BelumM.slice() : new Array(30).fill(0);
    return { Unit: d.Unit, Area: d.Area || '-', single: single, S: S, M: M };
  });

  // ---- HE table (1 ceklis per hari) ----
  tb.innerHTML = list.map(d => {
    const adaHari = belumDays(d);
    let total = 0;
    let cells = '';
    for (let hari = 1; hari <= 30; hari++) {
      const ada = adaHari[hari - 1];
      if (ada) total++;
      const telat = !ada && hari <= BBATAS - 1;
      const cls = ada ? 'day-cell day-ok' : ('day-cell' + (telat ? ' day-miss' : ' day-none'));
      cells += `<td class="${cls}"><span class="chip">${ada ? CHK_OK : '-'}</span></td>`;
    }
    return `<tr>
      <td><b>${d.Unit || '-'}</b></td>
      <td>${d.Area || '-'}</td>
      ${cells}
      <td class="num"><b>${total}</b></td>
    </tr>`;
  }).join('') || '<tr><td colspan="33" class="wt-empty">Tidak ada unit HE yang cocok dengan filter di atas.</td></tr>';

  // ---- WT table (S/M per hari) ----
  if (tbWt) {
    tbWt.innerHTML = wtRows.map(d => {
      let total = 0;
      let cells = '';
      for (let hari = 1; hari <= 30; hari++) {
        const s = d.S[hari - 1], m = d.M[hari - 1];
        const telat = !s && hari <= BBATAS - 1;
        if (d.single) {
          const ada = !!(s || m);
          if (ada) total++;
          const cls = ada ? 'day-cell day-ok' : ('day-cell' + (telat && !(s || m) ? ' day-miss' : ' day-none'));
          cells += `<td class="${cls}" colspan="2"><span class="chip">${ada ? CHK_OK : '-'}</span></td>`;
        } else {
          if (s) total++;
          if (m) total++;
          const clsS = s ? 'day-cell day-ok' : ('day-cell' + (telat && !s ? ' day-miss' : ' day-none'));
          const clsM = m ? 'day-cell day-ok' : ('day-cell' + (telat && !m ? ' day-miss' : ' day-none'));
          cells += `<td class="${clsS}"><span class="chip">${s ? CHK_OK : '-'}</span></td>`;
          cells += `<td class="${clsM}"><span class="chip">${m ? CHK_OK : '-'}</span></td>`;
        }
      }
      return `<tr class="wt-row">
        <td><b>${d.Unit || '-'}</b></td>
        <td>${d.Area || '-'}</td>
        ${cells}
        <td class="num"><b>${total}</b></td>
      </tr>`;
    }).join('') || '<tr><td colspan="63" class="wt-empty">Tidak ada unit WT yang cocok dengan filter di atas.</td></tr>';
  }
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
// ---------- isi dropdown Area Kerja sesuai vendor (HE + WT) ----------
// WT memakai penulisan area yang sedikit berbeda ("Area B80" vs "Area B 80"),
// jadi digabung memakai kunci yang dinormalkan.
function normArea(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fillAreas() {
  const v = document.getElementById('fVendor').value;
  const sel = document.getElementById('fArea');
  const prev = sel.value;

  const map = new Map();
  const add = a => {
    const t = String(a || '').trim();
    if (!t) return;
    const k = normArea(t);
    if (!map.has(k)) map.set(k, t);
  };
  DATA.filter(d => v === 'ALL' || d.Vendor === v).forEach(d => add(d.Area));
  WTD.filter(d => v === 'ALL' || wtVendorKey(d.Vendor) === wtVendorKey(v)).forEach(d => add(d.Area));

  const areas = [...map.values()].sort((a, b) => a.localeCompare(b));

  sel.innerHTML = '<option value="ALL">Semua Area</option>' +
    areas.map(a => `<option value="${a}">${a}</option>`).join('');

  sel.value = (prev === 'ALL' || areas.includes(prev)) ? prev : 'ALL';
}

// ---------- isi dropdown Unit Type sesuai vendor + area (HE jenis + WT model) ----------
function fillJenis() {
  const v = document.getElementById('fVendor').value;
  const area = document.getElementById('fArea').value;
  const sel = document.getElementById('fJenis');
  const prev = sel.value;

  const heRows = DATA.filter(d =>
    (v === 'ALL' || d.Vendor === v) &&
    (area === 'ALL' || (d.Area || '') === area)
  );
  const wtRows = WTD.filter(d =>
    (v === 'ALL' || wtVendorKey(d.Vendor) === wtVendorKey(v)) &&
    (area === 'ALL' || wtNormKey(d.Area) === wtNormKey(area))
  );

  const jenisList = [...new Set(heRows.map(d => d.Jenis || '-'))].sort((a, b) => a.localeCompare(b));
  const modelList = [...new Set(wtRows.map(d => d.Model || '-'))]
    .filter(m => m && m !== '-')
    .sort((a, b) => a.localeCompare(b));

  const opt = (val, label) => `<option value="${val}">${label}</option>`;
  sel.innerHTML = '<option value="ALL">Semua Unit Type</option>' +
    (jenisList.length ? `<optgroup label="Heavy Equipment">${jenisList.map(j => opt(j, j)).join('')}</optgroup>` : '') +
    (modelList.length ? `<optgroup label="Water Truck">${modelList.map(m => opt(m, m)).join('')}</optgroup>` : '');

  const semua = jenisList.concat(modelList);
  sel.value = (prev === 'ALL' || semua.includes(prev)) ? prev : 'ALL';
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

/* Dashboard Water Truck (WT) — Penyiraman vs MA
 * Bagian WT di halaman yang sama dengan HE (index.html).
 * Sumber data: js/wt-data.js (dibuat oleh rebuild_wt_dashboard.ps1)
 *
 * Semua fungsi dibungkus IIFE agar tidak menimpa fungsi global app.js (HE).
 */
(function () {
  'use strict';

  // ---------- util ----------
  function num(x) { const n = parseFloat(x); return isFinite(n) ? n : 0; }
  function fmt(v, dec) {
    dec = dec == null ? 1 : dec;
    return num(v).toLocaleString('id-ID', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function fmt0(v) { return Math.round(num(v)).toLocaleString('id-ID'); }
  function niceMax(v) {
    if (!isFinite(v) || v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return m * p;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }
  const $ = id => document.getElementById(id);

  // ---------- state ----------
  const WTD = (typeof WT_DATA !== 'undefined' && Array.isArray(WT_DATA)) ? WT_DATA : [];
  const PERIODE = (typeof WT_PERIODE !== 'undefined') ? WT_PERIODE : { y: 2026, m: 11, last: 30, label: 'November 2026' };

  const VENDOR_ORDER = ['SKN', 'WT TSA', 'WT PBT', 'WT ASA', 'WT FBS', 'WT TJP', 'WT TLK'];
  const VENDOR_COLOR = {
    'SKN': '#1E40AF',
    'WT TSA': '#0D9488',
    'WT PBT': '#7C3AED',
    'WT ASA': '#DB2777',
    'WT FBS': '#0891B2',
    'WT TJP': '#D97706',
    'WT TLK': '#64748B'
  };
  const vColor = v => VENDOR_COLOR[v] || '#1E40AF';

  let WT_CMP = 'MA';
  const WT_CMP_CFG = {
    MA: { field: 'MA', judul: 'MA', satuan: 'MA (%)', warna: '#B91C1C', tetapMax: 100, tick: v => v.toFixed(0) + '%',
      catatan: 'Garis merah = <b>MA %</b> dari sheet Review Unit (skala kanan, bulanan &mdash; tidak ikut rentang tanggal). ' },
    RATIO: { field: 'FuelRatio', judul: 'Fuel Ratio', satuan: 'Fuel Ratio', warna: '#B91C1C', tetapMax: 30, tick: v => v.toFixed(2),
      catatan: 'Garis merah = <b>Fuel Ratio</b> (liter/jam) dari sheet Review Unit (skala kanan, bulanan &mdash; tidak ikut rentang tanggal). ' },
    PA: { field: 'PA', judul: 'PA', satuan: 'PA (%)', warna: '#B91C1C', tetapMax: 100, tick: v => v.toFixed(0) + '%',
      catatan: 'Garis merah = <b>PA %</b> dari sheet Review Unit (skala kanan, bulanan &mdash; tidakikut rentang tanggal). ' }
  };

  let WT_SORT = { col: null, dir: 1 };
  let WT_GEO = null;
  let wtHover = -1;
  let wtRows = [];
  let animRAF = null;
  const CAL = { pick: null };

  // ---------- rentang tanggal ----------
  function isoOf(day) { return PERIODE.y + '-' + String(PERIODE.m).padStart(2, '0') + '-' + String(day).padStart(2, '0'); }

  function rangeState() {
    const f = $('wtFrom'), t = $('wtTo');
    const from = f && f.value ? parseInt(f.value.slice(8, 10), 10) : 1;
    const to = t && t.value ? parseInt(t.value.slice(8, 10), 10) : PERIODE.last;
    return { from, to, full: from <= 1 && to >= PERIODE.last };
  }

  function rangeLabel() {
    const rs = rangeState();
    const nm = d => String(d).padStart(2, '0');
    return nm(rs.from) + ' Nov \u2013 ' + nm(rs.to) + ' Nov ' + PERIODE.y;
  }

  function hitung(rows) {
    const rs = rangeState();
    return rows.map(d => {
      let p = 0, hari = 0;
      const days = d.Days || {};
      for (const k in days) {
        const day = parseInt(k, 10);
        if (day < rs.from || day > rs.to) continue;
        const v = num(days[k].P);
        p += v;
        if (v > 0) hari++;
      }
      return Object.assign({}, d, { P: p, Hari: hari });
    });
  }

  // ---------- filter: memakai dropdown HE di atas halaman ----------
  // Dropdown Vendor / Area Kerja / Unit Type dipakai bersama HE & WT.
  // Nilai yang tidak ada di data WT (mis. vendor "GIP H2") diabaikan,
  // supaya tabel WT tidak kosong hanya karena filter milik HE.
  function normKey(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function vendorKey(s) {
    return String(s || '').toUpperCase().replace(/^WT\s+/, '').trim();
  }
  function jenisCocok(d, j) {
    if (!j || j === 'ALL') return true;
    if (normKey(j) === 'watertruck') return true; // semua unit WT = water truck
    return normKey(d.Model) === normKey(j);
  }

  function heFilters() {
    const v = $('fVendor'), a = $('fArea'), j = $('fJenis');
    return {
      v: v ? v.value : 'ALL',
      a: a ? a.value : 'ALL',
      j: j ? j.value : 'ALL'
    };
  }

  function filtered() {
    const f = heFilters();
    const pakaiV = f.v !== 'ALL' && WTD.some(d => vendorKey(d.Vendor) === vendorKey(f.v));
    const pakaiA = f.a !== 'ALL' && WTD.some(d => normKey(d.Area) === normKey(f.a));
    const pakaiJ = f.j !== 'ALL' && WTD.some(d => jenisCocok(d, f.j));
    return WTD.filter(d =>
      (!pakaiV || vendorKey(d.Vendor) === vendorKey(f.v)) &&
      (!pakaiA || normKey(d.Area) === normKey(f.a)) &&
      (!pakaiJ || jenisCocok(d, f.j))
    );
  }

  // ---------- tabel ----------
  function render() {
    const rows = hitung(filtered());
    wtRows = rows;

    const sumP = rows.reduce((s, d) => s + d.P, 0);
    syncHeCards(sumP);

    const cu = $('wtCountUnit');
    if (cu) cu.textContent = rows.length;

    const tabel = rows.slice();
    const cmpCfg = WT_CMP_CFG[WT_CMP] || WT_CMP_CFG.MA;
    const cmpField = cmpCfg.field;
    const isPct = (WT_CMP === 'MA' || WT_CMP === 'PA');
    if (WT_SORT.col === 'CMP') {
      tabel.sort((a, b) => (num(a[cmpField]) - num(b[cmpField])) * WT_SORT.dir);
    } else if (WT_SORT.col) {
      tabel.sort((a, b) => (num(a[WT_SORT.col]) - num(b[WT_SORT.col])) * WT_SORT.dir);
    } else {
      tabel.sort((a, b) => {
        const va = VENDOR_ORDER.indexOf(a.Vendor), vb = VENDOR_ORDER.indexOf(b.Vendor);
        return (va - vb) || (b.P - a.P) || String(a.Unit).localeCompare(String(b.Unit), 'id', { numeric: true });
      });
    }
    $('wtTbody').innerHTML = tabel.length ? tabel.map(d => {
      const cmpVal = num(d[cmpField]);
      const maTxt = cmpVal > 0 ? (isPct ? fmt(cmpVal, 1) + '%' : fmt(cmpVal, 2)) : '\u2013';
      const rata = d.Hari > 0 ? fmt(d.P / d.Hari, 1) : '\u2013';
      const pCls = d.P > 0 ? '' : ' sisa-over';
      return '<tr>' +
        '<td><b>' + (esc(d.Unit) || '-') + '</b></td>' +
        '<td class="col-optional">' + (esc(d.Vendor) || '-') + '</td>' +
        '<td class="col-optional">' + (esc(d.Area) || '-') + '</td>' +
        '<td class="model-cell col-optional">' + (esc(d.Model) || '-') + (d.Capacity && d.Capacity !== '-' ? ' / ' + esc(d.Capacity) : '') + '</td>' +
        '<td class="num' + pCls + '"><b>' + fmt0(d.P) + '</b></td>' +
        '<td class="num min-h">' + d.Hari + '</td>' +
        '<td class="num">' + rata + '</td>' +
        '<td class="num">' + maTxt + '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="8" class="wt-empty">Tidak ada unit WT yang cocok dengan filter di atas.</td></tr>';

    refreshArrows();
    updateChartNote();
    animateChart();
  }

  // WT tidak punya kartu ringkasan sendiri lagi: total penyiraman WT
  // ditampilkan di kartu HE (dibuat oleh app.js) dan diperbarui dari sini.
  function syncHeCards(total) {
    const card = document.querySelector('.card[data-wt="total"]');
    if (card) {
      const v = card.querySelector('.val');
      if (v) v.textContent = fmt0(total);
      const s = card.querySelector('.card-sub');
      if (s) {
        const rs = rangeState();
        s.innerHTML = 'rit penyiraman WT' + (rs.full ? '' : ' &middot; ' + rangeLabel());
      }
    }
  }

  // dipakai app.js (HE) supaya kartu ringkasan ikut filter + rentang WT
  window.WT_summary = function () {
    const rows = hitung(filtered());
    return { unit: rows.length, total: rows.reduce((s, d) => s + d.P, 0) };
  };

  // dipakai app.js untuk menambahkan unit WT ke "Tabel Timesheet Belum di Terima"
  // S = shift siang (Day), M = shift malam (Night); unit 1 shift (TLK/FBS/ASA) -> 1 ceklis
  window.WT_belum = function () {
    const f = heFilters();
    const pakaiV = f.v !== 'ALL' && WTD.some(d => vendorKey(d.Vendor) === vendorKey(f.v));
    const pakaiA = f.a !== 'ALL' && WTD.some(d => normKey(d.Area) === normKey(f.a));
    const pakaiJ = f.j !== 'ALL' && WTD.some(d => jenisCocok(d, f.j));
    const rows = WTD.filter(d =>
      (!pakaiV || vendorKey(d.Vendor) === vendorKey(f.v)) &&
      (!pakaiA || normKey(d.Area) === normKey(f.a)) &&
      (!pakaiJ || jenisCocok(d, f.j))
    );
    const singleVendor = v => (['TLK', 'FBS', 'ASA'].indexOf(vendorKey(v)) >= 0);
    return rows.map(d => {
      const single = singleVendor(d.Vendor) || (d.Shift2 === false || d.Shift2 === 0);
      const S = (Array.isArray(d.BelumS) && d.BelumS.length === 30) ? d.BelumS.slice() : new Array(30).fill(0);
      const M = (Array.isArray(d.BelumM) && d.BelumM.length === 30) ? d.BelumM.slice() : new Array(30).fill(0);
      return { Unit: d.Unit, Vendor: d.Vendor, Area: d.Area || '-', single: single, S: S, M: M };
    });
  };

  function updateChartNote() {
    const el = $('wtChartNote');
    if (el) el.innerHTML = '';
  }

  function setWtCmp(key) {
    if (!WT_CMP_CFG[key]) return;
    WT_CMP = key;
    const cfg = WT_CMP_CFG[key];
    document.querySelectorAll('#wtCmpMenu .seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cmp === key);
    });
    const title = $('wtChartTitle');
    if (title) title.textContent = 'Grafik Penyiraman (Bar) & ' + cfg.judul + ' (Garis) \u2014 Top 15 Water Truck';
    const colLabel = $('wtCmpColLabel');
    if (colLabel) colLabel.textContent = cfg.judul;
    render();
  }

  function refreshArrows() {
    document.querySelectorAll('#wtTable .wt-arrow').forEach(a => {
      const col = a.dataset.arrow;
      a.textContent = WT_SORT.col === col ? (WT_SORT.dir > 0 ? '\u25B2' : '\u25BC') : '';
    });
  }

  function setSort(col) {
    if (WT_SORT.col === col) {
      if (WT_SORT.dir === 1) { WT_SORT.dir = -1; }
      else { WT_SORT.col = null; WT_SORT.dir = 1; }
    } else { WT_SORT.col = col; WT_SORT.dir = -1; }
    render();
  }

  // ---------- grafik ----------
  function barPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, Math.max(h, 0));
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
  }

  function animateChart() {
    if (animRAF) cancelAnimationFrame(animRAF);
    const t0 = performance.now();
    const dur = 520;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      drawCombo(wtRows, e);
      if (p < 1) animRAF = requestAnimationFrame(step);
      else { animRAF = null; drawCombo(wtRows, 1); }
    };
    animRAF = requestAnimationFrame(step);
  }

  function drawCombo(rows, prog) {
    prog = prog == null ? 1 : prog;
    const c = $('wtChart');
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const H = 360;
    const cfg = WT_CMP_CFG[WT_CMP] || WT_CMP_CFG.MA;
    const cmpField = cfg.field;
    const maxCmp = cfg.tetapMax;

    // selalu tampilkan 15 unit dengan penyiraman terbanyak
    const TOP_N = window.innerWidth < 620 ? 8 : 15;
    const src = rows.slice()
      .sort((a, b) => (b.P - a.P) || String(a.Unit).localeCompare(String(b.Unit), 'id', { numeric: true }))
      .slice(0, TOP_N);

    const byVendor = {};
    src.forEach(d => { (byVendor[d.Vendor] = byVendor[d.Vendor] || []).push(d); });
    const vendors = Object.keys(byVendor).sort((a, b) => {
      const ta = byVendor[a].reduce((s, d) => s + d.P, 0);
      const tb = byVendor[b].reduce((s, d) => s + d.P, 0);
      return (tb - ta) || (VENDOR_ORDER.indexOf(a) - VENDOR_ORDER.indexOf(b));
    });
    const groups = vendors.map(v => {
      const items = byVendor[v].slice().sort((a, b) => (b.P - a.P) || String(a.Unit).localeCompare(String(b.Unit), 'id', { numeric: true }));
      return { vendor: v, items: items, total: items.reduce((s, d) => s + d.P, 0) };
    });
    const top = groups.reduce((acc, g) => acc.concat(g.items), []);

    const minW = (window.innerWidth < 620)
      ? Math.max(330, top.length * 24 + 96)
      : Math.max(680, top.length * 30 + 132);
    c.style.minWidth = minW + 'px';
    const w = Math.max(c.clientWidth, minW);
    c.width = Math.round(w * dpr);
    c.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, H);

    if (!top.length) {
      WT_GEO = null;
      ctx.fillStyle = '#64748B';
      ctx.font = '13px "Fira Sans", Segoe UI, sans-serif';
      ctx.fillText('Tidak ada data untuk filter ini.', 20, 30);
      return;
    }

    const padL = 64, padR = 74, padT = 54, padB = 118;
    const plotW = w - padL - padR;
    const plotH = H - padT - padB;
    const baseY = padT + plotH;
    const maxP = niceMax(Math.max.apply(null, top.map(d => d.P).concat([1])) * 1.12);
    const GAP = 0.75;

    let cursor = 0;
    groups.forEach(g => {
      g.slotAwal = cursor;
      cursor += g.items.length;
      g.slotAkhir = cursor;
      cursor += GAP;
    });
    const totalSlot = Math.max(cursor - GAP, 1);
    const slotW = plotW / totalSlot;
    const centers = [];
    cursor = 0;
    groups.forEach(g => {
      g.items.forEach(() => { centers.push(padL + (cursor + 0.5) * slotW); cursor += 1; });
      cursor += GAP;
    });

    // pita latar + pemisah vendor
    groups.forEach((g, gi) => {
      const x1 = padL + g.slotAwal * slotW;
      const x2 = padL + g.slotAkhir * slotW;
      if (gi % 2 === 0) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(x1, padT - 6, x2 - x1, plotH + 12);
      }
      if (gi > 0) {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x1 - (GAP / 2) * slotW, padT - 6);
        ctx.lineTo(x1 - (GAP / 2) * slotW, baseY + 8);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // sorotan hover
    if (wtHover >= 0 && wtHover < top.length) {
      const cx = centers[wtHover];
      ctx.fillStyle = 'rgba(30,64,175,.06)';
      ctx.fillRect(cx - slotW / 2, padT - 6, slotW, plotH + 12);
    }

    // grid + sumbu kiri
    ctx.font = '10.5px "Fira Code", Consolas, monospace';
    ctx.font = '11px "Fira Code", Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const v = (maxP / 4) * i;
      const y = baseY - (plotH / 4) * i;
      ctx.strokeStyle = i === 0 ? '#CBD5E1' : '#EEF2F7';
      ctx.lineWidth = i === 0 ? 1.2 : 1;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.fillStyle = '#64748B';
      ctx.fillText(fmt0(v), padL - 8, y + 4);
    }

    // sumbu kanan (metrik perbandingan)
    ctx.textAlign = 'left';
    for (let i = 0; i <= 4; i++) {
      const y = baseY - (plotH / 4) * i;
      ctx.fillStyle = '#B91C1C';
      ctx.fillText(cfg.tick((maxCmp / 4) * i), padL + plotW + 8, y + 4);
    }

    // judul sumbu (sama seperti Grafik HM)
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'center';
    ctx.font = '11px "Fira Sans", Segoe UI, sans-serif';
    ctx.fillText('Penyiraman (rit)', padL - 22, padT - 16);
    ctx.fillStyle = cfg.warna;
    ctx.fillText(cfg.satuan, padL + plotW + 34, padT - 16);

    // batang
    const bw = Math.max(7, Math.min(slotW * 0.62, 40));
    ctx.textAlign = 'center';
    top.forEach((d, i) => {
      const cx = centers[i];
      const hh = Math.max(0, (d.P / maxP) * plotH) * prog;
      const y = baseY - hh;
      ctx.save();
      if (wtHover === i) {
        ctx.shadowColor = 'rgba(15,23,42,0.25)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;
      }
      ctx.fillStyle = vColor(d.Vendor);
      ctx.globalAlpha = d.P > 0 ? 1 : 0.28;
      barPath(ctx, cx - bw / 2, y, bw, hh, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowColor = 'transparent';
      ctx.restore();
      if (d.P > 0) {
        const hm = d.P;
        ctx.font = 'bold 10px "Fira Code", Consolas, monospace';
        ctx.textAlign = 'center';
        if (hh > 22) {
          ctx.fillStyle = '#ffffff';
          ctx.fillText(fmt0(hm), cx, baseY - 6);
        } else {
          ctx.fillStyle = '#334155';
          ctx.fillText(fmt0(hm), cx, y - 5);
        }
      }
    });

    // garis metrik perbandingan (hanya unit yang punya nilai)
    const pts = top.map((d, i) => ({ x: centers[i], v: num(d[cmpField]), ok: num(d[cmpField]) > 0 }));
    ctx.strokeStyle = cfg.warna;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    let seg = [];
    const flush = () => {
      if (seg.length > 1) {
        ctx.beginPath();
        seg.forEach((p, k) => {
          const y = baseY - (p.v / maxCmp) * plotH * prog;
          if (k === 0) ctx.moveTo(p.x, y); else ctx.lineTo(p.x, y);
        });
        ctx.stroke();
      }
      seg = [];
    };
    pts.forEach(p => { if (p.ok) seg.push(p); else flush(); });
    flush();
    pts.forEach(p => {
      if (!p.ok) return;
      const y = baseY - (p.v / maxCmp) * plotH * prog;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(p.x, y, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = cfg.warna;
      ctx.beginPath(); ctx.arc(p.x, y, 2, 0, Math.PI * 2); ctx.fill();
      // label nilai pada titik garis
      ctx.fillStyle = cfg.warna;
      ctx.font = 'bold 8.5px "Fira Code", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(cfg.tick(p.v), p.x, y - 5);
    });

    // label unit miring
    top.forEach((d, i) => {
      const cx = centers[i];
      ctx.save();
      ctx.translate(cx + 2, baseY + 12);
      ctx.rotate(-Math.PI / 4);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.font = '9.5px "Fira Sans", Segoe UI, sans-serif';
      ctx.fillStyle = d.P > 0 ? '#334155' : '#94A3B8';
      ctx.fillText(d.Unit, 0, 0);
      ctx.restore();
    });

    // pill vendor di bawah (menyusut bila ruang sempit, disusun 2 baris agar tidak tumpang tindih)
    ctx.font = 'bold 9px "Fira Code", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const barisPill = [[], []];
    const tumpang = (a, b) => a.x1 < b.x2 + 3 && a.x2 > b.x1 - 3;
    groups.forEach(g => {
      const x1 = padL + g.slotAwal * slotW;
      const x2 = padL + g.slotAkhir * slotW;
      const lebar = x2 - x1;
      const cx = (x1 + x2) / 2;
      const pendek = g.vendor.replace('WT ', '');
      let teks = pendek + ' (' + g.items.length + ')';
      let pw = Math.ceil(ctx.measureText(teks).width) + 14;
      if (pw > lebar - 2) { teks = pendek; pw = Math.ceil(ctx.measureText(teks).width) + 12; }
      if (pw > lebar - 2) { teks = pendek.slice(0, 3); pw = Math.ceil(ctx.measureText(teks).width) + 10; }
      const box = { x1: cx - pw / 2, x2: cx + pw / 2 };
      let baris = 0;
      if (barisPill[0].some(b => tumpang(box, b))) {
        baris = barisPill[1].some(b => tumpang(box, b)) ? 0 : 1;
      }
      barisPill[baris].push(box);
      const py = H - 16 - baris * 20;
      ctx.fillStyle = vColor(g.vendor);
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - pw / 2, py - 9, pw, 18, 9);
      else ctx.rect(cx - pw / 2, py - 9, pw, 18);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = vColor(g.vendor);
      ctx.fillText(teks, cx, py);
    });

    // legenda (gaya sama seperti Grafik HM)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let lx = padL;
    const ly = 12;
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(lx, ly - 4, 12, 8);
    ctx.fillStyle = '#475569';
    ctx.font = '12px "Fira Sans", Segoe UI, sans-serif';
    const legBar = 'Penyiraman (rit)';
    ctx.fillText(legBar, lx + 18, ly);
    lx += 18 + ctx.measureText(legBar).width + 22;
    ctx.strokeStyle = cfg.warna;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 28, ly); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(lx + 14, ly, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cfg.warna;
    ctx.beginPath(); ctx.arc(lx + 14, ly, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.fillText(cfg.satuan, lx + 34, ly);
    lx += 34 + ctx.measureText(cfg.satuan).width + 22;
    // warna per vendor
    groups.forEach(g => {
      ctx.fillStyle = vColor(g.vendor);
      ctx.fillRect(lx, ly - 4, 10, 8);
      ctx.fillStyle = '#475569';
      ctx.font = '11px "Fira Sans", Segoe UI, sans-serif';
      ctx.fillText(g.vendor.replace('WT ', ''), lx + 14, ly);
      lx += 14 + ctx.measureText(g.vendor.replace('WT ', '')).width + 12;
      ctx.font = '12px "Fira Sans", Segoe UI, sans-serif';
    });

    WT_GEO = { centers: centers, slotW: slotW, top: top, maxP: maxP, baseY: baseY, plotH: plotH };

    if (wtHover >= 0 && wtHover < top.length && prog >= 1) {
      drawTooltip(ctx, top[wtHover], wtHover, centers, maxP, baseY, plotH, w, H, cfg);
    }
  }

  function drawTooltip(ctx, d, i, centers, maxP, baseY, plotH, w, H, cfg) {
    const cx = centers[i];
    const by = baseY - (d.P / maxP) * plotH;
    const capTxt = d.Capacity && d.Capacity !== '-' ? d.Capacity : '-';
    const cmpVal = num(d[cfg.field]);
    const lines = [
      [d.Unit, '#0F172A', 'bold 12px "Fira Sans", Segoe UI, sans-serif'],
      [d.Vendor + (d.Area ? ' \u00b7 ' + d.Area : ''), '#64748B', '10.5px "Fira Sans", Segoe UI, sans-serif'],
      ['Capacity: ' + capTxt, capTxt !== '-' ? '#1E40AF' : '#94A3B8', '10.5px "Fira Sans", Segoe UI, sans-serif'],
      ['Penyiraman: ' + fmt0(d.P) + ' rit', vColor(d.Vendor), 'bold 11px "Fira Code", Consolas, monospace'],
      ['Hari ada: ' + d.Hari + ' hari', '#334155', '10.5px "Fira Code", Consolas, monospace'],
      [cfg.judul + ': ' + (cmpVal > 0 ? cfg.tick(cmpVal) : '\u2013'), cfg.warna, 'bold 11px "Fira Code", Consolas, monospace']
    ];
    ctx.font = '12px "Fira Sans", Segoe UI, sans-serif';
    let tw = 0;
    lines.forEach(l => { ctx.font = l[2]; tw = Math.max(tw, ctx.measureText(l[0]).width); });
    const padX = 12, padY = 10, lh = 16;
    const bw = tw + padX * 2;
    const bh = lines.length * lh + padY * 2 - 4;
    let x = cx + 14;
    if (x + bw > w - 6) x = cx - 14 - bw;
    if (x < 6) x = 6;
    let y = Math.max(6, by - bh - 10);
    if (y + bh > H - 6) y = H - 6 - bh;

    ctx.save();
    ctx.shadowColor = 'rgba(15,23,42,.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 8); else ctx.rect(x, y, bw, bh);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 8); else ctx.rect(x, y, bw, bh);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((l, k) => {
      ctx.font = l[2];
      ctx.fillStyle = l[1];
      ctx.fillText(l[0], x + padX, y + padY + k * lh);
    });
  }

  // ---------- hover ----------
  function pasangHover() {
    const c = $('wtChart');
    if (!c) return;
    c.addEventListener('mousemove', ev => {
      if (!WT_GEO) return;
      const r = c.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const centers = WT_GEO.centers;
      let best = -1, dist = Infinity;
      centers.forEach((cx, i) => { const dd = Math.abs(cx - x); if (dd < dist) { dist = dd; best = i; } });
      if (dist > (WT_GEO.slotW / 2) + 4) best = -1;
      if (best !== wtHover) { wtHover = best; drawCombo(wtRows, 1); }
    });
    c.addEventListener('mouseleave', () => {
      if (wtHover !== -1) { wtHover = -1; drawCombo(wtRows, 1); }
    });
  }

  // ---------- kalender rentang ----------
  function setRange(from, to) {
    const f = $('wtFrom'), t = $('wtTo');
    if (f) f.value = isoOf(from);
    if (t) t.value = isoOf(to);
    const lbl = $('wtRangeVal');
    if (lbl) lbl.textContent = rangeLabel();
    render();
  }

  function pilihHari(d) {
    if (CAL.pick === null) { CAL.pick = d; renderKalender(); return; }
    const a = Math.min(CAL.pick, d), b = Math.max(CAL.pick, d);
    CAL.pick = null;
    setRange(a, b);
    tutupKalender();
  }

  function renderKalender() {
    const pop = $('wtCalPop');
    if (!pop) return;
    const rs = rangeState();
    const pk = CAL.pick;
    const from = pk !== null ? pk : (rs.full ? 0 : rs.from);
    const to = pk !== null ? pk : (rs.full ? 0 : rs.to);
    const jml = PERIODE.last;
    const mulai = new Date(PERIODE.y, PERIODE.m - 1, 1).getDay();
    const now = new Date();
    const hariIni = (now.getFullYear() === PERIODE.y && now.getMonth() === PERIODE.m - 1) ? now.getDate() : 0;
    const dow = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    let html = '<div class="cal-head"><span>' + PERIODE.label + '</span><span class="cal-hint">' +
      (CAL.pick ? 'klik tanggal akhir' : 'klik tanggal awal') + '</span></div><div class="cal-grid">';
    html += dow.map(d => '<div class="cal-dow">' + d + '</div>').join('');
    for (let i = 0; i < mulai; i++) html += '<div></div>';
    for (let d = 1; d <= jml; d++) {
      const dalam = from && to && d > from && d < to;
      const tepi = !!from && !!to && (d === from || d === to);
      const cls = ['cal-day'];
      if (dalam) cls.push('in-range');
      if (tepi) cls.push('edge', from === to ? 'single' : (d === from ? 'start' : 'end'));
      if (d === hariIni) cls.push('today');
      html += '<button type="button" class="' + cls.join(' ') + '" data-day="' + d + '">' + d + '</button>';
    }
    html += '</div><div class="cal-foot"><span class="cal-hint">Pilih 2 tanggal (awal &amp; akhir)</span><button type="button" class="btn-reset" id="wtResetCal">Semua</button></div>';
    pop.innerHTML = html;
    pop.querySelectorAll('.cal-day').forEach(b => b.addEventListener('click', ev => {
      ev.stopPropagation();
      pilihHari(parseInt(b.dataset.day, 10));
    }));
    const rst = pop.querySelector('#wtResetCal');
    if (rst) rst.addEventListener('click', ev => { ev.stopPropagation(); CAL.pick = null; setRange(1, PERIODE.last); tutupKalender(); });
  }

  function bukaKalender() {
    const pop = $('wtCalPop');
    if (!pop) return;
    CAL.pick = null;
    renderKalender();
    pop.hidden = false;
  }
  function tutupKalender() {
    const pop = $('wtCalPop');
    if (pop) pop.hidden = true;
  }

  // ---------- init ----------
  document.addEventListener('DOMContentLoaded', () => {
    // filter WT memakai dropdown HE di atas halaman
    ['fVendor', 'fArea', 'fJenis'].forEach(id => {
      const sel = $(id);
      if (sel) sel.addEventListener('change', () => render());
    });

    // menu perbandingan grafik WT
    document.querySelectorAll('#wtCmpMenu .seg-btn').forEach(b => {
      b.addEventListener('click', () => setWtCmp(b.dataset.cmp));
    });

    document.querySelectorAll('#wtTable th.wt-sortable').forEach(th => {
      th.addEventListener('click', () => setSort(th.dataset.sort));
    });

    const rangeBtn = $('wtRangeBtn');
    if (rangeBtn) rangeBtn.addEventListener('click', ev => {
      ev.stopPropagation();
      const pop = $('wtCalPop');
      if (pop && pop.hidden) bukaKalender(); else tutupKalender();
    });

    document.addEventListener('click', ev => {
      const wrap = ev.target.closest ? ev.target.closest('.wt-range-wrap') : null;
      if (!wrap) tutupKalender();
    });

    ['wtFrom', 'wtTo'].forEach(id => {
      const inp = $(id);
      if (!inp) return;
      inp.addEventListener('change', () => {
        const f = $('wtFrom'), t = $('wtTo');
        if (f.value && t.value && f.value > t.value) { const x = f.value; f.value = t.value; t.value = x; }
        const lbl = $('wtRangeVal');
        if (lbl) lbl.textContent = rangeLabel();
        render();
      });
    });

    let rz = null;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => drawCombo(wtRows, 1), 150);
    });

    pasangHover();
    render();
  });
})();

if(document.readyState!=='loading'){try{document.dispatchEvent(new Event('DOMContentLoaded'));}catch(e){}}
;try{ if(typeof setView==="function") window.setView=setView; }catch(e){}
})();
