// Dashboard Timesheet HE - MMJ November 2026
// Data berasal dari js/data.js (const DATA dan const DAILY) - tidak perlu server.

// Unit Water Truck (WT SKN-01..04) sudah tampil di tabel Penyiraman (WT),
// jadi dikeluarkan dari dashboard HE supaya tidak dobel.
if (Array.isArray(DATA)) {
  const tanpaWT = DATA.filter(d => (d.Jenis || '') !== 'Water Truck');
  if (tanpaWT.length !== DATA.length) DATA.splice(0, DATA.length, ...tanpaWT);
}

// Unit Water Truck (WT SKN-01..04) juga sudah tampil di tabel "Timesheet
// Belum di Terima" WT dengan shift S/M, jadi dikeluarkan dari tabel HE
// (yang hanya punya 1 ceklis per hari) supaya tidak dobel.
if (typeof BELUM !== 'undefined' && Array.isArray(BELUM)) {
  const tanpaWTB = BELUM.filter(d => (d.Jenis || '') !== 'Water Truck');
  if (tanpaWTB.length !== BELUM.length) BELUM.splice(0, BELUM.length, ...tanpaWTB);
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
let blinkRAF = null; // requestAnimationFrame blink titik MA<85/PA<80/FR>std
let TITLE_BASE = 'Grafik HM & MA per Unit'; // judul grafik tanpa info rentang

function blinkBad(d, cfg) {
  const ma = num(d.MA);
  const pa = num(d.PAPct != null ? d.PAPct : d.PA);
  const fr = num(d.FuelRatio);
  if (cfg.field === 'MA') return ma > 0 && ma < 85;
  if (cfg.field === 'PAPct' || cfg.field === 'PA') return pa > 0 && pa < 80;
  if (cfg.field === 'FuelRatio') {
    const s = typeof stdFuel === 'function' ? stdFuel(d) : null;
    return !!s && fr > 0 && fr > s.ratio;
  }
  return false;
}
function anyBlink(rows, cfg) {
  return Array.isArray(rows) && rows.some(d => blinkBad(d, cfg));
}
function stopBlink() {
  if (blinkRAF) { cancelAnimationFrame(blinkRAF); blinkRAF = null; }
}
function startBlink() {
  if (blinkRAF || animRAF) return;
  const loop = () => {
    drawCombo(lastRows, 1);
    blinkRAF = requestAnimationFrame(loop);
  };
  blinkRAF = requestAnimationFrame(loop);
}

function matchVendor(dv, sel) { return sel === 'ALL' || dv === sel; }
function hasVendor(sel, arr) { return sel !== 'ALL' && arr.some(d => d.Vendor === sel); }
function filtered() {
  const v = document.getElementById('fVendor').value;
  const area = document.getElementById('fArea').value;
  const jenis = document.getElementById('fJenis').value;
  const capEl = document.getElementById('fCap');
  const cap = capEl ? capEl.value : 'ALL';
  // Dropdown dipakai bersama HE & WT. Nilai yang hanya ada di data WT
  // (mis. vendor "WT TSA") tidak boleh mengosongkan tabel HE.
  const pakaiV = hasVendor(v, DATA);
  const pakaiA = area !== 'ALL' && DATA.some(d => (d.Area || '') === area);
  const pakaiJ = jenis !== 'ALL' && DATA.some(d => (d.Jenis || '-') === jenis);
  const pakaiC = cap !== 'ALL' && DATA.some(d => (d.Capacity || '-') === cap || (d.Model || '-') === cap);
  return DATA.filter(d =>
    (!pakaiV || matchVendor(d.Vendor, v)) &&
    (!pakaiA || (d.Area || '') === area) &&
    (!pakaiJ || (d.Jenis || '-') === jenis) &&
    (!pakaiC || (d.Capacity || '-') === cap || (d.Model || '-') === cap)
  );
}

// ---------- rentang waktu (kalender) ----------
// DAILYUNIT: [{ Unit, Vendor, D: { "1": [hm, mohh, bd, idle, ops, q, fuel], ... } }]
const DU = (typeof DAILYUNIT !== 'undefined' && Array.isArray(DAILYUNIT)) ? DAILYUNIT : [];

// data Water Truck (dipakai bersama: kartu ringkasan + dropdown filter)
const WTD = (typeof WT_DATA !== 'undefined' && Array.isArray(WT_DATA)) ? WT_DATA : [];

// fuel liter WT sesuai rentang hari WT. Prioritas: Days.*.Fuel harian;
// fallback FuelRecap/FuelReview (total bulanan Recap Fuel, seperti HE) bila tidak ada data harian.
function wtFuelRange(unit) {
  const rsW = (() => {
    const f = document.getElementById('wtFrom'), t = document.getElementById('wtTo');
    const fd = f && f.value ? dayOf(f.value) : 1;
    const td = t && t.value ? dayOf(t.value) : PERIODE.last;
    return fd > td ? { from: td, to: fd } : { from: fd, to: td };
  })();
  const D = (unit && unit.Days) || {};
  let fuel = 0;
  for (const k in D) {
    const n = parseInt(k, 10);
    if (n >= rsW.from && n <= rsW.to) fuel += num(D[k].Fuel);
  }
  if (fuel > 0) return fuel;
  const recap = num(unit && (unit.FuelRecap || unit.FuelReview));
  if (recap > 0 && rsW.from <= 1 && rsW.to >= PERIODE.last) return recap;
  return 0;
}
// total fuel WT (semua unit, rentang WT aktif) - kartu Total Fuel
function wtFuelTotal() { return WTD.reduce((s, d) => s + wtFuelRange(d), 0); }

// helper filter WT (mirror dari js/wt.js) dipakai tabel Belum & dropdown
const WT_SHIFT1 = ['TLK', 'FBS', 'ASA'];
const CHK_OK = '<svg class="chk" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5 L5 9 L9.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function wtVendorKey(s) { return String(s || '').toUpperCase().replace(/^\d+\.\s*/, '').replace(/^WT\s+/, '').trim(); }
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
// Data kontrol SOP (js/standar-he.js): Tabel 1 Fuel Ratio standar per Type &
// Class (butir 9) dan Kategori Penilaian Indikator MA (butir 8.4).
const STD = (typeof window !== 'undefined' && window.MMJ_STD) ? window.MMJ_STD : {};

// standar Fuel Ratio unit ini (null bila Type tidak ada di Tabel 1 SOP)
function stdFuel(d) {
  if (!d || typeof STD.cariFuelRatio !== 'function') return null;
  return STD.cariFuelRatio(d.Jenis, d.Capacity);
}

// batas nilai indikator dari SOP (MA default 85%)
function stdBatas(kode) {
  const b = (typeof STD.batas === 'function') ? STD.batas(kode) : 0;
  return b > 0 ? b : 85;
}

// MA di bawah batas SOP (butir 8.4) = Rendah (Low). MA 0 = belum ada data.
function maRendah(d) {
  const v = num(d.MA);
  return v > 0 && v < stdBatas('MA');
}

// Fuel Ratio aktual melebihi standar Tabel 1 (butir 9)
function frMelebihi(d) {
  const s = stdFuel(d);
  const v = num(d.FuelRatio);
  return !!s && v > 0 && v > s.ratio;
}

// Aturan warna tiap unit. Tambah aturan baru di sini:
//   { id, test(d) -> true bila kondisi terpenuhi, cls (kelas CSS), note(d) -> teks tambahan }
// cls "rt-alert" = merah (kritis), "rt-warn" = oranye, "rt-ok" = hijau.
const RUN_RULES = [
  { id: 'hm-gt-ma', test: d => num(d.HMTotal) > num(d.MA), cls: 'rt-alert' },
  {
    id: 'fr-gt-std', test: frMelebihi, cls: 'rt-warn',
    note: d => {
      const s = stdFuel(d);
      return 'FR ' + fmt(num(d.FuelRatio), 2) + ' ' + (s.satuan === 'Liter/Hari' ? 'L/hari' : 'L/jam');
    }
  },
  {
    id: 'ma-rendah', test: maRendah, cls: 'rt-alert',
    note: d => 'MA Rendah'
  }
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
    // Jenis/Capacity/FuelRatio ikut dibawa supaya kontrol Fuel Ratio SOP (Tabel 1:
    // Water Truck 10 L/jam) juga berlaku untuk unit WT
    return {
      Unit: d.Unit, HMTotal: hm, MA: num(d.MA), P: p, Vendor: d.Vendor,
      Jenis: 'Water Truck', Capacity: d.Capacity, FuelRatio: num(d.FuelRatio)
    };
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
    const hit = RUN_RULES.filter(r => { try { return r.test(d); } catch (e) { return false; } });
    // kelas unik (beberapa aturan bisa memakai kelas yang sama, mis. dua aturan rt-alert)
    const cls = hit.map(r => r.cls).filter((c, i, a) => c && a.indexOf(c) === i).join(' ');
    const hm = fmt(num(d.HMTotal), 1);
    const ma = fmt(num(d.MA), 1) + '%';
    const peny = (d.P !== undefined) ? ' \u00b7 Penyiraman ' + fmt0(d.P) + ' rit' : '';
    // alasan peringatan (Fuel Ratio > standar SOP / MA rendah) supaya jelas saat dibaca
    const notes = hit.map(r => { try { return r.note ? r.note(d) : ''; } catch (e) { return ''; } })
      .filter(Boolean).map(t => ' \u00b7 ' + escHtml(t)).join('');
    const teks = escHtml(d.Unit || '-') + ' \u00b7 HM ' + hm + ' jam \u00b7 MA ' + ma + peny + notes;
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

// ---------- panel detail unit (klik Unit ID di tabel Review Unit) ----------
// Kunci panel: buang semua non-alfanumerik, karena nama unit di tabel tidak selalu
// sama dengan nama sheet Excel ("DT 11 GIP" vs "DT-11 GIP", "TRADO 01 GIP").
// Sengaja bukan unitKey(): itu kunci pencocokan DAILYUNIT.
function udKey(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

function udDetail(unit) {
  // jalur lama menulis `const UNITDETAIL` (global leksikal, bukan properti window)
  const u = (typeof UNITDETAIL !== 'undefined' ? UNITDETAIL : null) || window.UNITDETAIL;
  return (u && u[udKey(unit)]) || null;
}

// Jam per kategori sebulan penuh: dari UNITDETAIL bila ada. Cadangan: hanya total
// breakdown dari DAILYUNIT, karena idle/ops di sana tidak bisa dipecah per kategori.
function udCats(unit) {
  const d = udDetail(unit);
  if (d && d.c) return d.c;
  const out = { rain: 0, slip: 0, nowork: 0, meals: 0, p2h: 0, hol: 0, trav: 0,
                rep: 0, bd: 0, nofuel: 0, waitop: 0, noop: 0, notandem: 0 };
  const D = DU_MAP[unitKey(unit)] || {};
  for (const k in D) out.bd += num((D[k] || [])[2]);
  return out;
}

// [label, ambil nilai, sub-baris Repair/Break Down]
const UD_BARIS = [
  ['Breakdown', c => num(c.rep) + num(c.bd), false],
  ['Standby \u2013 Rain', c => num(c.rain), false],
  ['Standby \u2013 Slippery', c => num(c.slip), false],
  ['No Operator', c => num(c.noop), false],
  ['No Job (No Work Location)', c => num(c.nowork), false],
  ['Meals And Rest', c => num(c.meals), false],
  ['P2H', c => num(c.p2h), false],
  ['Holiday', c => num(c.hol), false],
  ['Travelling', c => num(c.trav), false],
  ['Repair', c => num(c.rep), true],
  ['Break Down', c => num(c.bd), true],
  ['No Fuel', c => num(c.nofuel), false],
  ['Waiting Operator', c => num(c.waitop), false],
  ['No Tandem', c => num(c.notandem), false]
];

let UD_WRAP = null;   // overlay panel (dibuat sekali, dipakai ulang)
let UD_FOKUS = null;  // elemen yang fokusnya dikembalikan saat panel ditutup
let UD_DATA = null;

function vendorAgg(kind, heRows, wtRows, allHe, allWt) {
  const groups = new Map();
  const add = (rows, field, source) => rows.forEach(d => {
    const vendor = source === 'wt' ? wtVendorKey(d.Vendor) : (String(d.Vendor || '-').trim() || '-');
    const g = groups.get(vendor) || { vendor, n: 0, val: 0, countHe: 0, countWt: 0, avgN: 0 };
    if (kind === 'units') {
      g[source === 'wt' ? 'countWt' : 'countHe']++;
      g.n++;
      g.val++;
    } else {
      g.n++;
      const v = num(d[field]);
      if (['ma', 'pa', 'ratio'].includes(kind)) {
        if (v > 0) { g.val += v; g.avgN++; }
      } else g.val += v;
    }
    groups.set(vendor, g);
  });
  if (kind === 'units') { add(allHe, null, 'he'); add(allWt, null, 'wt'); }
  else if (kind === 'water') add(wtRows, 'P', 'wt');
  else if (kind === 'fuel') {
    // Total Fuel = fuel HE (rentang HE) + fuel WT (rentang WT; semua unit WT di panel)
    add(heRows, 'Fuel', 'he');
    add(wtRows, 'Fuel', 'wt');
  } else add(heRows, ({ hm: 'HMTotal', ma: 'MA', pa: 'PAPct', ratio: 'FuelRatio' })[kind], 'he');
  return [...groups.values()].map(g => ({
    ...g,
    val: ['ma', 'pa', 'ratio'].includes(kind) ? (g.avgN ? g.val / g.avgN : 0) : g.val
  })).sort((a, b) => (b.val - a.val) || a.vendor.localeCompare(b.vendor, 'id'));
}

// vendor per MA dan PA digabung jadi satu kartu (rata-rata tiap metrik terpisah)
function availabilityVendors() {
  const ma = vendorBreakdown('ma');
  const pa = vendorBreakdown('pa');
  const out = new Map();
  ma.forEach(r => out.set(r.vendor, { vendor: r.vendor, n: r.n, maVal: r.val, paVal: 0 }));
  pa.forEach(r => {
    const g = out.get(r.vendor);
    if (g) g.paVal = r.val;
    else out.set(r.vendor, { vendor: r.vendor, n: r.n, maVal: 0, paVal: r.val });
  });
  return [...out.values()].sort((a, b) => (b.maVal - a.maVal) || a.vendor.localeCompare(b.vendor, 'id'));
}

// vendor per Total Fuel dan Rata-rata Fuel Ratio digabung jadi satu kartu
function fueluseVendors() {
  const fuel = vendorBreakdown('fuel');
  const ratio = vendorBreakdown('ratio');
  const out = new Map();
  fuel.forEach(r => out.set(r.vendor, { vendor: r.vendor, n: r.n, fuelVal: r.val, ratioVal: 0 }));
  ratio.forEach(r => {
    const g = out.get(r.vendor);
    if (g) g.ratioVal = r.val;
    else out.set(r.vendor, { vendor: r.vendor, n: r.n, fuelVal: 0, ratioVal: r.val });
  });
  return [...out.values()].sort((a, b) => (b.fuelVal - a.fuelVal) || a.vendor.localeCompare(b.vendor, 'id'));
}

// baris WT + penyiraman mengikuti rentang utama (sama seperti grafik HM HE)
function wtRangeRows() {
  const rs = rangeState();
  return wtRunRows().map(d => {
    const days = (WTD.find(x => unitKey(x.Unit) === unitKey(d.Unit)) || {}).Days || {};
    let p = 0;
    for (const day in days) {
      const n = parseInt(day, 10);
      if (n >= rs.from && n <= rs.to) p += num(days[day].P);
    }
    return { ...d, P: p };
  });
}

function vendorBreakdown(kind) {
  if (kind === 'units') return vendorAgg(kind, [], [], DATA, WTD);
  if (kind === 'water') return vendorAgg(kind, [], wtRangeRows(), [], []);
  if (kind === 'fuel') return vendorAgg(kind, applyRange(filtered()), WTD.map(d => ({ ...d, Fuel: wtFuelRange(d) })), [], []);
  // Salin ulang baris aktif dengan rentang HE saat ini; panel boleh dibuka setelah tanggal berubah.
  return vendorAgg(kind, applyRange(filtered()), [], [], []);
}

// warna kartu KPI (dipakai kartu vendor di panel)
const KPI_COLOR = {
  units: '#1E40AF', hm: '#2563EB', ma: '#D97706', pa: '#7C3AED',
  fuel: '#0D9488', ratio: '#1D4ED8', water: '#0891B2', availability: '#D97706', fueluse: '#0D9488'
};

const VD_LABEL = {
  units: 'Unit', hm: 'HM (Jam)', ma: 'MA (%)', pa: 'PA (%)',
  fuel: 'Fuel (L)', ratio: 'Fuel Ratio', water: 'Penyiraman (Rit)',
  availability: 'Availability (MA / PA)',
  fueluse: 'Fuel (Total \u00b7 Rata-rata / Jam)'
};

// logo vendor di kartu vendor (data URI; sumber: dashboard-mmj/tools/gabungan/logos/)
const VD_LOGO = {
  GIP: 'data:image/png;base64,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',
  JTU: 'data:image/png;base64,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',
  BDK: 'data:image/png;base64,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',
  SKN: 'data:image/png;base64,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',
  TSA: 'data:image/png;base64,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',
  TJP: 'data:image/png;base64,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',
};

// logo untuk satu vendor: "Semua GIP" -> GIP H1/H2 ikut logo GIP; WT dinormalkan
function vdLogoFor(vendor) {
  const v = wtVendorKey(vendor);
  if (VD_LOGO[v]) return VD_LOGO[v];
  if (v.startsWith('GIP')) return VD_LOGO.GIP;
  return '';
}

// pecahan fuel per tipe Unit ID (urutan diminta user) untuk tabel kartu pop-up
function fuelTypeRows() {
  const groups = ['MG', 'VC', 'EX', 'DT', 'TRADO', 'FT'];
  const sum = Object.fromEntries(groups.map(g => [g, 0]));
  let other = 0;
  const add = (uid, v) => {
    const g = groups.find(x => uid.startsWith(x));
    if (g) sum[g] += v; else other += v;
  };
  applyRange(filtered()).forEach(d => add(String(d.Unit || '').trim().toUpperCase(), num(d.Fuel)));
  WTD.forEach(d => add(String(d.Unit || '').trim().toUpperCase(), wtFuelRange(d)));
  const rows = groups.map(g => ({ g, val: sum[g] }));
  if (other > 0) rows.push({ g: 'WT/Lainnya', val: other });
  return rows;
}

// isi modal vendor: judul + sub + grid kartu vendor (tabel unit muncul di bawah grid)
function renderVendorPanel(kind) {
  const rs = rangeState();
  const period = rs.full ? `${BULAN_ID[PERIODE.m - 1]} ${PERIODE.y}` : rangeLabel();

  const unitMode = kind === 'units';
  const average = ['ma', 'pa', 'ratio'].includes(kind);
  const suffix = kind === 'ma' || kind === 'pa' ? '%' : '';
  const precision = kind === 'ratio' ? 2 : (kind === 'units' ? 0 : (kind === 'fuel' || kind === 'water' ? 2 : 1));
  const rows = vendorBreakdown(kind);
  const color = KPI_COLOR[kind] || '#1D4ED8';
  const ratioOverVendors = new Set();
  if (kind === 'ratio') applyRange(filtered()).forEach(d => { if (frMelebihi(d)) ratioOverVendors.add(String(d.Vendor || '-').trim() || '-'); });
  const cards = rows.length ? rows.map((r, i) => {
    const valRed = (kind === 'ma' && r.val > 0 && r.val < 85) || (kind === 'ratio' && ratioOverVendors.has(r.vendor));
    return `
    <div class="vd-card" role="button" tabindex="0" data-vendor="${escHtml(r.vendor)}" aria-expanded="false"
      style="--c:${color};animation-delay:${Math.min(i * 45, 300)}ms">
      <div class="vd-card-head">
        <span class="vd-name">${escHtml(r.vendor)}</span>
        <div class="vd-val-line">
          <b class="vd-val"${valRed ? ' style="color:#DC2626"' : ''}>${unitMode ? r.n : fmt(r.val, precision) + suffix}</b>
          <span class="vd-sub">${unitMode ? `HE ${r.countHe} &middot; WT ${r.countWt}` : r.n + ' unit'}</span>
        </div>
        <svg class="vd-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      ${vdLogoFor(r.vendor) ? `<img class="vd-logo" src="${vdLogoFor(r.vendor)}" alt="Logo ${escHtml(r.vendor)}">` : ''}
    </div>`;
  }).join('')
    : `<p class="ud-nol">Tidak ada data untuk filter ini.</p>`;
  const avCards = kind === 'availability' ? availabilityVendors().map((r, i) => {
    const maRed = r.maVal > 0 && r.maVal < 85;
    const paRed = r.paVal > 0 && r.paVal < 80;
    return `
    <div class="vd-card vd-card-av" role="button" tabindex="0" data-vendor="${escHtml(r.vendor)}" aria-expanded="false"
      style="--c:${color};animation-delay:${Math.min(i * 45, 300)}ms">
      <div class="vd-card-head">
        <span class="vd-name">${escHtml(r.vendor)}</span>
        <div class="vd-val-line">
          <span class="vd-av"${maRed ? ' style="color:#DC2626"' : ''}><b>${fmt(r.maVal, 1)}%</b> MA</span>
          <span class="vd-av"${paRed ? ' style="color:#DC2626"' : ''}><b>${fmt(r.paVal, 1)}%</b> PA</span>
          <span class="vd-sub">${r.n} unit</span>
        </div>
        <svg class="vd-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      ${vdLogoFor(r.vendor) ? `<img class="vd-logo" src="${vdLogoFor(r.vendor)}" alt="Logo ${escHtml(r.vendor)}">` : ''}
    </div>`;
  }).join('') : '';
  if (kind === 'availability') {
    const body = avCards || '<p class="ud-nol">Tidak ada data untuk filter ini.</p>';
    return `<h3 id="udJudul">${escHtml(VD_LABEL.availability)}</h3>
      <p class="ud-sub">Per Vendor &middot; ${escHtml(period)} &middot; rata-rata unit vendor &middot; klik kartu vendor untuk rincian unit</p>
      <div class="vd-cards" data-kind="availability">${body}</div>`;
  }
  if (kind === 'fueluse') {
    const fuCards = fueluseVendors().map((r, i) => {
      const ratioOver = r.ratioVal > 0 && applyRange(filtered()).some(d => frMelebihi(d) && String(d.Vendor || '-').trim() === r.vendor);
      const frTxt = r.ratioVal > 0 ? fmt(r.ratioVal, 2) : '\u2014';
      return `
      <div class="vd-card vd-card-av" role="button" tabindex="0" data-vendor="${escHtml(r.vendor)}" aria-expanded="false"
        style="--c:${color};animation-delay:${Math.min(i * 45, 300)}ms">
        <div class="vd-card-head">
          <span class="vd-name">${escHtml(r.vendor)}</span>
          <div class="vd-val-line">
            <span class="vd-av"><b>${fmt(r.fuelVal, 0)}</b> Total</span>
            <span class="vd-av"${ratioOver ? ' style="color:#DC2626"' : ''}><b>${frTxt}</b> FR</span>
            <span class="vd-sub">${r.n} unit</span>
          </div>
          <svg class="vd-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        ${vdLogoFor(r.vendor) ? `<img class="vd-logo" src="${vdLogoFor(r.vendor)}" alt="Logo ${escHtml(r.vendor)}">` : ''}
      </div>`;
    }).join('');
    const body = fuCards || '<p class="ud-nol">Tidak ada data untuk filter ini.</p>';
    return `<h3 id="udJudul">${escHtml(VD_LABEL.fueluse)}</h3>
      <p class="ud-sub">Per Vendor &middot; ${escHtml(period)} &middot; Total Fuel &middot; Rata-rata Fuel Ratio per vendor &middot; klik kartu vendor untuk rincian unit</p>
      <div class="vd-cards" data-kind="fueluse">${body}</div>`;
  }
  return `<h3 id="udJudul">${escHtml(VD_LABEL[kind] || 'Ringkasan Vendor')}</h3>
    <p class="ud-sub">Per Vendor &middot; ${escHtml(period)}${average ? ' &middot; rata-rata unit vendor' : ''} &middot; klik kartu vendor untuk rincian unit</p>
    <div class="vd-cards" data-kind="${kind}">${cards}</div>`;
}

// daftar unit satu vendor sesuai metrik kartu (mis. Total Fuel -> Unit ID + Fuel)
function vendorUnits(kind, vendor) {
  const order = ['MG', 'VC', 'EX', 'DT', 'TRADO', 'FT', 'WT'];
  const rank = u => { const id = String(u || '').trim().toUpperCase(); const i = order.findIndex(x => id.startsWith(x)); return i < 0 ? 99 : i; };
  const byType = (a, b) => (rank(a.Unit) - rank(b.Unit)) || String(a.Unit).localeCompare(String(b.Unit), undefined, { numeric: true });
  if (kind === 'water') {
    return wtRangeRows()
      .filter(d => wtVendorKey(d.Vendor) === wtVendorKey(vendor))
      .map(d => ({ Unit: d.Unit, val: num(d.P), txt: fmt(d.P, 0), badge: '<span class="vd-badge wt">WT</span>' }))
      .sort(byType);
  }
  if (kind === 'fuel') {
    // Total Fuel per unit: HE (rentang HE) + WT (rentang WT), urut tipe Unit ID
    const he = applyRange(filtered())
      .filter(d => String(d.Vendor || '').trim() === vendor)
      .map(d => ({ Unit: d.Unit, val: num(d.Fuel), txt: fmt(d.Fuel, 2) }));
    const wt = WTD.filter(d => wtVendorKey(d.Vendor) === wtVendorKey(vendor))
      .map(d => ({ Unit: d.Unit, val: wtFuelRange(d), txt: fmt(wtFuelRange(d), 2), badge: '<span class="vd-badge wt">WT</span>' }));
    return he.concat(wt).sort(byType);
  }
  if (kind === 'units') {
    const he = DATA.filter(d => String(d.Vendor || '').trim() === vendor)
      .map(d => ({ Unit: d.Unit, val: 1, txt: 'HE', badge: '<span class="vd-badge">HE</span>' }));
    const wt = WTD.filter(d => wtVendorKey(d.Vendor) === wtVendorKey(vendor))
      .map(d => ({ Unit: d.Unit, val: 1, txt: 'WT', badge: '<span class="vd-badge wt">WT</span>' }));
    return he.concat(wt).sort(byType);
  }
  if (kind === 'availability') {
    // MA dan PA per unit dalam satu baris; nilai 0/empty ditampilkan apa adanya
    return applyRange(filtered())
      .filter(d => String(d.Vendor || '').trim() === vendor)
      .map(d => {
        const ma = num(d.MA);
        const pa = num(d.PAPct);
        return {
          Unit: d.Unit,
          maVal: ma,
          maTxt: fmt(ma, 1) + '%',
          maRed: ma > 0 && ma < 85,
          paVal: pa,
          paTxt: fmt(pa, 1) + '%',
          paRed: pa > 0 && pa < 80
        };
      })
      .sort(byType);
  }
  if (kind === 'fueluse') {
    // Sama seperti kartu Total Fuel: HE (rentang HE) + WT (rentang WT).
    // WT tidak punya FuelRatio -> tampil em dash, tidak pernah merah.
    const he = applyRange(filtered())
      .filter(d => String(d.Vendor || '').trim() === vendor)
      .map(d => {
        const fuel = num(d.Fuel);
        const fr = num(d.FuelRatio);
        return {
          Unit: d.Unit,
          fuelVal: fuel,
          fuelTxt: fmt(fuel, 2),
          ratioTxt: fr > 0 ? fmt(fr, 2) : '\u2014',
          ratioRed: frMelebihi(d)
        };
      });
    const wt = WTD.filter(d => wtVendorKey(d.Vendor) === wtVendorKey(vendor))
      .map(d => ({
        Unit: d.Unit,
        fuelVal: wtFuelRange(d),
        fuelTxt: fmt(wtFuelRange(d), 2),
        ratioTxt: '\u2014',
        ratioRed: false,
        badge: '<span class="vd-badge wt">WT</span>'
      }));
    return he.concat(wt).sort(byType);
  }
  if (kind === 'hm') {
    // HM + Sisa jatah (240 jam/unit, HM bulan penuh) + Sisa/day (hari tersisa dari BELUM)
    const daysInMonth = (typeof PERIODE !== 'undefined' && PERIODE.last) ? PERIODE.last : 30;
    return applyRange(filtered())
      .filter(d => String(d.Vendor || '').trim() === vendor)
      .map(d => {
        const kosong = d._noharian;
        const hmBulan = (() => {
          if (!d._range) return num(d.HMTotal);
          const asli = (typeof DATA !== 'undefined' ? DATA : []).find(x => unitKey(x.Unit) === unitKey(d.Unit));
          return asli ? num(asli.HMTotal) : num(d.HMTotal);
        })();
        const sisa = MIN_HOURS - hmBulan;
        let sisaHari = 0;
        const bel = (typeof BELUM !== 'undefined' ? BELUM : []).find(b => unitKey(b.Unit) === unitKey(d.Unit));
        const ada = bel && typeof belumDays === 'function' ? belumDays(bel) : null;
        if (ada) { for (let i = ada.length - 1; i >= 0; i--) { if (ada[i]) { sisaHari = i + 1; break; } } }
        sisaHari = Math.max(0, daysInMonth - sisaHari);
        return {
          Unit: d.Unit,
          hmTxt: kosong ? '\u2014' : fmt(hmBulan, 1),
          sisaTxt: kosong ? '\u2014' : fmt(sisa, 1),
          sisaRed: sisa < 0,
          sisaDayTxt: kosong || sisaHari === 0 ? '\u2014' : fmt(sisa / sisaHari, 1),
          sisaDayRed: sisaHari > 0 && sisa / sisaHari < 0
        };
      })
      .sort(byType);
  }
  const field = { hm: 'HMTotal', ma: 'MA', pa: 'PAPct', ratio: 'FuelRatio' }[kind];
  const pct = kind === 'ma' || kind === 'pa';
  const dec = kind === 'ratio' ? 2 : 1;
  return applyRange(filtered())
    .filter(d => String(d.Vendor || '').trim() === vendor)
    .map(d => {
      const val = num(d[field]);
      const red = (kind === 'ma' && val > 0 && val < 85) || (kind === 'ratio' && frMelebihi(d));
      return {
        Unit: d.Unit, val,
        txt: pct ? fmt(val, 1) + '%' : fmt(val, dec),
        red
      };
    })
    .sort(byType);
}

// pilih satu vendor -> tabel unit muncul DI BAWAH kartu itu (baris penuh grid), satu tabel
function pilihVendor(kind, card) {
  const grid = card.closest ? card.closest('.vd-cards') : null;
  const sama = card.classList.contains('open');
  // tutup pilihan lain + buang tabel lama (yang bukan milik kartu ini)
  if (grid) grid.querySelectorAll('.vd-card.open').forEach(c => {
    c.classList.remove('open');
    c.setAttribute('aria-expanded', 'false');
  });
  if (grid) {
    const old = grid.querySelector('.vd-table');
    if (old && old._card !== card) old.remove();
  }
  if (sama) {
    // klik kartu yang sama lagi -> tutup tabelnya
    if (grid) {
      const t = grid.querySelector('.vd-table');
      if (t && t._card === card) t.remove();
    }
    return;
  }
  card.classList.add('open');
  card.setAttribute('aria-expanded', 'true');
  const rows = vendorUnits(kind, card.dataset.vendor);
  const label = VD_LABEL[kind] || 'Nilai';
  const av2 = kind === 'availability';
  const fu2 = kind === 'fueluse';
  const hm3 = kind === 'hm';
  // tabel di dalam grid, baris penuh, setelah kartu TERAKHIR di baris visual kartu ini
  // (kolom grid responsif -> hitung dari posisi render, bukan urutan DOM)
  let anchor = card;
  if (grid) {
    const top = Math.round(card.getBoundingClientRect().top);
    [...grid.querySelectorAll('.vd-card')].forEach(c => {
      if (Math.round(c.getBoundingClientRect().top) === top) anchor = c;
    });
  }
  const tabel = document.createElement('div');
  tabel.className = 'vd-table';
  tabel._card = card;
  let headCells = `<th class="vd-tnum">${escHtml(label)}</th>`;
  let bodyCells;
  if (av2) {
    headCells = '<th class="vd-tnum">MA</th><th class="vd-tnum">PA</th>';
    bodyCells = r => `<td class="vd-tnum"${r.maRed ? ' style="color:#DC2626;font-weight:700"' : ''}>${r.maTxt}</td><td class="vd-tnum"${r.paRed ? ' style="color:#DC2626;font-weight:700"' : ''}>${r.paTxt}</td>`;
  } else if (fu2) {
    headCells = '<th class="vd-tnum">Fuel (L)</th><th class="vd-tnum">Fuel Ratio</th>';
    bodyCells = r => `<td class="vd-tnum">${r.fuelTxt}</td><td class="vd-tnum"${r.ratioRed ? ' style="color:#DC2626;font-weight:700"' : ''}>${r.ratioTxt}</td>`;
  } else if (hm3) {
    headCells = '<th class="vd-tnum">HM</th><th class="vd-tnum">Sisa HM</th><th class="vd-tnum">Sisa/Day</th>';
    bodyCells = r => `<td class="vd-tnum">${r.hmTxt}</td><td class="vd-tnum"${r.sisaRed ? ' style="color:#DC2626;font-weight:700"' : ''}>${r.sisaTxt}</td><td class="vd-tnum"${r.sisaDayRed ? ' style="color:#DC2626;font-weight:700"' : ''}>${r.sisaDayTxt}</td>`;
  } else {
    bodyCells = r => `<td class="vd-tnum"${r.red ? ' style="color:#DC2626;font-weight:700"' : ''}>${r.txt}</td>`;
  }
  tabel.innerHTML = `<div class="vd-table-head">${escHtml(card.dataset.vendor)} &middot; ${escHtml(label)} (${rows.length} unit)</div>
    <table class="vd-table-body">
      <thead><tr><th>Unit</th>${headCells}</tr></thead>
      <tbody>${rows.length ? rows.map(r => `<tr><td>${r.badge || ''}${escHtml(r.Unit)}</td>${bodyCells(r)}</tr>`).join('')
        : `<tr><td colspan="${hm3 ? 4 : 3}" class="ud-nol">Tidak ada unit untuk vendor ini.</td></tr>`}</tbody>
    </table>`;
  anchor.insertAdjacentElement('afterend', tabel);
}

// klik kartu KPI -> modal pecahan per vendor (overlay .ud-wrap, satu listener)
function openVendorPanel(kind) {
  if (!UD_WRAP) {
    UD_WRAP = document.createElement('div');
    UD_WRAP.className = 'ud-wrap';
    UD_WRAP.addEventListener('click', e => { if (e.target === UD_WRAP) closeUnitPanel(); });
    document.body.appendChild(UD_WRAP);
  }
  UD_FOKUS = document.activeElement;
  UD_WRAP.innerHTML = '<div class="ud-panel vd-panel" role="dialog" aria-modal="true" aria-labelledby="udJudul">'
    + '<button type="button" class="ud-close" aria-label="Tutup ringkasan vendor">&times;</button>'
    + renderVendorPanel(kind) + '</div>';
  const grid = UD_WRAP.querySelector('.vd-cards');
  if (grid) grid.addEventListener('click', e => {
    const card = e.target.closest ? e.target.closest('.vd-card') : null;
    if (card) pilihVendor(grid.dataset.kind, card);
  });
  grid.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest ? e.target.closest('.vd-card') : null;
    if (card) { e.preventDefault(); pilihVendor(grid.dataset.kind, card); }
  });
  UD_WRAP.classList.add('open');
  const btn = UD_WRAP.querySelector('.ud-close');
  if (btn) { btn.addEventListener('click', closeUnitPanel); btn.focus(); }
}

function udIsGip12(vendor) {
  const v = String(vendor || '').toUpperCase();
  return v.includes('GIP H1') || v.includes('GIP H2') || v.includes('GIP 1') || v.includes('GIP 2');
}
function udTabData(kind, c, det, bl, vendor) {
  const b = (det && det.b) || [];
  const nofuelBd = udIsGip12(vendor);
  if (kind === 'breakdown') {
    const rows = [['Repair', num(c.rep)], ['Break Down', num(c.bd)]];
    if (nofuelBd) rows.push(['No Fuel', num(c.nofuel)]);
    const totalBd = b.reduce((s, x) => s + num(x.h), 0) || 1;
    const rincian = b.length ? `<div class="ud-bd"><h4>Rincian breakdown</h4>${b.map(x => `
      <div class="ud-bd-row">
        <div class="ud-bd-top"><span class="ud-bd-l">${escHtml(judulKata(x.l || 'tanpa keterangan'))}</span><span>${fmt(x.h,1)} jam</span></div>
        <div class="ud-bar"><i style="width:${Math.max(2, num(x.h)/totalBd*100).toFixed(1)}%"></i></div>
        <div class="ud-bd-d">${(x.d||[]).map(t => t[0]+' '+bl).join(', ')}</div>
      </div>`).join('')}</div>` : '<p class="ud-nol">Tidak ada rincian breakdown.</p>';
    return {rows, extra: rincian};
  }
  if (kind === 'standby') {
    const rows = [['Standby – Rain',num(c.rain)],['Standby – Slippery',num(c.slip)],['Meals And Rest',num(c.meals)],['P2H',num(c.p2h)],['Holiday',num(c.hol)],['Travelling',num(c.trav)]];
    if (!nofuelBd) rows.push(['No Fuel',num(c.nofuel)]);
    return {rows, extra:''};
  }
  if (kind === 'noop') return {rows:[['No Operator',num(c.noop)],['Waiting Operator',num(c.waitop)]], extra:''};
  if (kind === 'nojob') return {rows:[['No Job (No Work Location)',num(c.nowork)],['No Tandem',num(c.notandem)]], extra:''};
  return {rows:[], extra:''};
}

function udBuildTable(kind, d) {
  const det = udDetail(d.Unit || '-');
  const c = udCats(d.Unit || '-');
  const bl = BULAN_ID[PERIODE.m - 1];
  const t = udTabData(kind, c, det, bl, d.Vendor);
  const label = {breakdown:'Breakdown', standby:'Standby', noop:'No Operator', nojob:'No Job'}[kind] || '';
  const rowsHtml = t.rows.map(([l,v]) => `<tr class="${v? '':'ud-nol'}"><td>${escHtml(l)}</td><td class="num vd-tnum">${fmt(v,1)}</td></tr>`).join('');
  return `<div class="vd-table-head">Rincian ${escHtml(label)}</div><table class="vd-table-body"><thead><tr><th>Kategori</th><th class="vd-tnum">Jam</th></tr></thead><tbody>${rowsHtml}</tbody></table>${t.extra}`;
}

function renderUnitPanel(d, activeKind) {
  const unit = d.Unit || '-';
  const det = udDetail(unit);
  const c = udCats(unit);
  const bl = BULAN_ID[PERIODE.m - 1];
  const nofuelBd = udIsGip12(d.Vendor);
  const standbyVal = num(c.rain)+num(c.slip)+num(c.meals)+num(c.p2h)+num(c.hol)+num(c.trav)+(nofuelBd?0:num(c.nofuel));
  const bdVal = num(c.rep)+num(c.bd)+(nofuelBd?num(c.nofuel):0);
  const kartu = [
    ['breakdown','Breakdown', bdVal, '#DC2626'],
    ['standby','Standby', standbyVal, '#0891B2'],
    ['noop','No Operator', num(c.noop), '#D97706'],
    ['nojob','No Job', num(c.nowork), '#7C3AED']
  ];
  return `
    <h3 id="udJudul">${escHtml(unit)}</h3>
    <p class="ud-sub">${escHtml([d.Jenis, d.Area].filter(Boolean).join(' \u00b7 ') || '-')}
      \u00b7 Total ${bl} ${PERIODE.y} (tidak ikut filter rentang tanggal)</p>
    <div class="vd-cards ud-tabs">
      ${kartu.map(([k,l,v,cl], i) => `<button type="button" class="vd-card ud-tab" data-kind="${k}" aria-pressed="false" style="--c:${cl};animation-delay:${Math.min(i*45,200)}ms">
        <div class="vd-card-head">
          <span class="vd-name">${l}</span>
          <div class="vd-val-line">
            <b class="vd-val">${fmt(v, 1)}</b>
            <span class="vd-sub">jam</span>
          </div>
        </div>
      </button>`).join('')}
    </div>
    ${det ? '' : '<p class="ud-note">Rincian per kategori belum tersedia untuk bulan ini; angka Breakdown memakai total harian.</p>'}`;
}

function judulKata(s) {
  return String(s).replace(/\b\w/g, m => m.toUpperCase());
}

function openUnitPanel(d, activeKind) {
  const bindUdTabs = () => {
    if (UD_WRAP._udTabBound) return;
    UD_WRAP._udTabBound = true;
    UD_WRAP.addEventListener('click', e => {
      if (e.target === UD_WRAP) return closeUnitPanel();
      const tab = e.target.closest ? e.target.closest('.ud-tab') : null;
      if (!tab || !UD_DATA) return;
      const grid = tab.closest('.vd-cards');
      const sama = tab.classList.contains('open');
      UD_WRAP.querySelectorAll('.ud-tab.open').forEach(b => { b.classList.remove('open'); b.setAttribute('aria-pressed','false'); });
      if (grid) { const old = grid.querySelector('.vd-table'); if (old) old.remove(); }
      if (sama) return;
      tab.classList.add('open'); tab.setAttribute('aria-pressed','true');
      let anchor = tab;
      if (grid) {
        const top = Math.round(tab.getBoundingClientRect().top);
        [...grid.querySelectorAll('.vd-card')].forEach(c => { if (Math.round(c.getBoundingClientRect().top) === top) anchor = c; });
      }
      const tabel = document.createElement('div');
      tabel.className = 'vd-table';
      tabel.innerHTML = udBuildTable(tab.dataset.kind, UD_DATA);
      anchor.insertAdjacentElement('afterend', tabel);
    });
  };
  if (!UD_WRAP) {
    UD_WRAP = document.createElement('div');
    UD_WRAP.className = 'ud-wrap';
    document.body.appendChild(UD_WRAP);
  }
  bindUdTabs();
  UD_DATA = d;
  UD_FOKUS = document.activeElement;
  UD_WRAP.innerHTML = '<div class="ud-panel vd-panel" role="dialog" aria-modal="true" aria-labelledby="udJudul">'
    + '<button type="button" class="ud-close" aria-label="Tutup detail unit">&times;</button>'
    + renderUnitPanel(d, activeKind) + '</div>';
  UD_WRAP.classList.add('open');
  const btn = UD_WRAP.querySelector('.ud-close');
  if (btn) { btn.addEventListener('click', closeUnitPanel); btn.focus(); }
}

function closeUnitPanel() {
  if (!UD_WRAP) return;
  UD_WRAP.classList.remove('open');
  UD_WRAP.innerHTML = '';
  if (UD_FOKUS && UD_FOKUS.focus) UD_FOKUS.focus();
  UD_FOKUS = null;
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

  // kartu ringkasan — global (tidak ikut filter vendor/area/jenis)
  const kpiRows = applyRange(DATA);
  const sumHM = kpiRows.reduce((s, d) => s + num(d.HMTotal), 0);
  const sumFuel = kpiRows.reduce((s, d) => s + num(d.Fuel), 0)
    + (typeof window.WT_summary === 'function' ? wtFuelTotal(WTD) : WTD.reduce((s, d) => s + wtFuelRange(d), 0));
  const sumPA = kpiRows.filter(d => num(d.PAPct) > 0);
  const avgPA = sumPA.length ? sumPA.reduce((s, d) => s + num(d.PAPct), 0) / sumPA.length : 0;
  const avgMA = (() => {
    const f = kpiRows.filter(d => num(d.MA) > 0);
    return f.length ? f.reduce((s, d) => s + num(d.MA), 0) / f.length : 0;
  })();
  const sumRatio = kpiRows.filter(d => num(d.FuelRatio) > 0);
  const avgRatio = sumRatio.length ? sumRatio.reduce((s, d) => s + num(d.FuelRatio), 0) / sumRatio.length : 0;
  const totalUnit = DATA.length + WTD.length;
  const wtInfo = (typeof window.WT_summary === 'function') ? window.WT_summary() : null;
  const wtPenyiraman = wtInfo ? wtInfo.total : WTD.reduce((s, d) => {
    const D = d.Days || {};
    let p = 0;
    for (const k in D) p += num(D[k].P);
    return s + p;
  }, 0);

  const maWarn = avgMA > 0 && avgMA < 85;
  const paWarn = avgPA > 0 && avgPA < 80;
  const cards = [
    ['Ketersediaan Unit', String(totalUnit), '#1E40AF', 'unit', `${DATA.length} HE + ${WTD.length} WT`, 'units'],
    ['Total HM (Jam)', sumHM.toFixed(1), '#2563EB', 'clock', 'jam operasi', 'hm'],
    ['Availability', '', '#D97706', 'activity', `<span class="av-row">MA <span class="av-ma"${maWarn ? ' style="color:#DC2626"' : ''}>${avgMA.toFixed(1)}%</span></span><span class="av-row">PA <span class="av-pa"${paWarn ? ' style="color:#DC2626"' : ''}>${avgPA.toFixed(1)}%</span></span>`, 'availability'],
    ['Fuel', '', '#0D9488', 'gauge', `<span class="av-row">Total <span>${fmt(sumFuel, 0)}</span> L</span><span class="av-row">Rata-rata <span>${fmt(avgRatio, 2)}</span> L/jam</span>`, 'fueluse'],
    ['Total Penyiraman (WT)', fmt(wtPenyiraman, 0), '#0891B2', 'fuel', 'rit penyiraman WT', 'water', 'total']
  ];
  document.getElementById('cards').innerHTML = cards.map(([l, v, c, ic, sub, kind, key]) =>
    `<div class="card" style="--c:${c}" data-card="${kind}" role="button" tabindex="0" aria-haspopup="dialog"${key ? ` data-wt="${key}"` : ''}>
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
  const bodyHtml = tabelRows.map(d => {
    const kosong = d._noharian ? '\u2014' : null;
    const hmNum = num(d.HMTotal);
    const hmTxt = kosong || hmNum.toFixed(1);
    const maNum = num(d.MA);
    const maTxt = kosong || maNum.toFixed(1) + '%';
    const maStyle = (!kosong && maNum > 0 && maNum < 85) ? ' style="color:#DC2626;font-weight:700"' : '';
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
    const daysInMonth = (typeof PERIODE !== 'undefined' && PERIODE.last) ? PERIODE.last : 30;
    const bel = (typeof BELUM !== 'undefined' ? BELUM : []).find(b => unitKey(b.Unit) === unitKey(d.Unit));
    const adaHariBel = bel && typeof belumDays === 'function' ? belumDays(bel) : null;
    let lastInputDay = 0;
    if (adaHariBel) { for (let i = adaHariBel.length - 1; i >= 0; i--) { if (adaHariBel[i]) { lastInputDay = i + 1; break; } } }
    const sisaHari = Math.max(0, daysInMonth - lastInputDay);
    const sisaDayTxt = kosong || (sisaHari > 0 ? ((MIN_HOURS - hmBulan) / sisaHari).toFixed(1) : '\u2014');
    // Balance = (Min Hours / Hari Bulan) x Hari Terakhir Input - HM Total (per unit)
    const balNum = lastInputDay > 0 ? (MIN_HOURS / daysInMonth) * lastInputDay - hmBulan : null;
    const balTxt = kosong || (balNum === null ? '\u2014' : balNum.toFixed(1));
    const balRed = balNum !== null && balNum < 0;
    const balCls = balRed ? ' sisa-over' : '';
    // model + kapasitas unit (dari sheet Database List Unit)
    const modelTxt = d.Model ? (d.Capacity && d.Capacity !== '-' ? `${d.Model}/${d.Capacity}` : d.Model) : '-';
    return `<tr>
    <td><button type="button" class="unit-id" data-unit="${escHtml(d.Unit || '')}"><b>${escHtml(d.Unit || '-')}</b></button></td>
    <td>${d.Jenis || '-'}</td>
    <td>${d.Area || '-'}</td>
    <td class="model-cell">${modelTxt}</td>
    <td class="num"><b>${hmTxt}</b></td>
    <td class="num${sisaCls}"><b>${sisaTxt}</b></td>
    <td class="num"><b>${sisaDayTxt}</b></td>
    <td class="num${balCls}"><b>${balTxt}</b></td>
    <td class="num"${maStyle}>${maTxt}</td>
    <td class="num">${paTxt}</td>
    <td class="num">${fuelTxt}</td>
    <td class="num${frMelebihi(d) ? ' fr-over' : ''}">${ratioTxt}</td>
  </tr>`;
  }).join('');
  const totUnit = tabelRows.length;
  const totHM = tabelRows.reduce((s, d) => s + num(d.HMTotal), 0);
  const totFuel = tabelRows.reduce((s, d) => s + num(d.Fuel), 0);
  // Balance total = sum((Min Hours/Hari Bulan) x Hari Terakhir Input) - sum(HM) — dijumlah terpisah per unit dulu
  const totBalTarget = tabelRows.reduce((s, d) => {
    const daysInMonth = (typeof PERIODE !== 'undefined' && PERIODE.last) ? PERIODE.last : 30;
    const bel = (typeof BELUM !== 'undefined' ? BELUM : []).find(b => unitKey(b.Unit) === unitKey(d.Unit));
    const ada = bel && typeof belumDays === 'function' ? belumDays(bel) : null;
    let last = 0;
    if (ada) { for (let i = ada.length - 1; i >= 0; i--) { if (ada[i]) { last = i + 1; break; } } }
    return s + (last > 0 ? (MIN_HOURS / daysInMonth) * last : 0);
  }, 0);
  const totBal = totBalTarget - totHM;
  const elHU = document.getElementById('heCountUnit'); if (elHU) elHU.textContent = totUnit;
  const elHH = document.getElementById('heTotalHM'); if (elHH) elHH.textContent = totHM.toFixed(1);
  const elHF = document.getElementById('heTotalFuel'); if (elHF) elHF.textContent = fmt(totFuel, 0);
  const totalRow = totUnit ? `<tr style="font-weight:700;background:#f1f5f9">
    <td><b>Total</b></td>
    <td><b>${totUnit} unit</b></td>
    <td></td>
    <td></td>
    <td class="num"><b>${totHM.toFixed(1)}</b></td>
    <td class="num"></td>
    <td class="num"></td>
    <td class="num${totBal < 0 ? ' sisa-over' : ''}"><b>${totBal.toFixed(1)}</b></td>
    <td class="num"></td>
    <td class="num"></td>
    <td class="num"><b>${fmt(totFuel, 1)}</b></td>
    <td class="num"></td>
  </tr>` : '';
  document.getElementById('tbody').innerHTML = bodyHtml + totalRow;

  lastRows = rows;
  hoverIdx = -1;
  updateChartNote();
  animateChart();
  renderBelum();
  renderControlHE();
  renderMaCap(rows);
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
const PERIODE = (window.MMJ_HE && window.MMJ_HE.PERIODE) || { y: 2026, m: 11, last: 30 };
const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// label periode mengikuti BULAN DATA (tab HE bisa menampilkan bulan lain lewat
// pemilih bulan di sidebar; PERIODE dibaca dari berkas data bulan itu).
(function () {
  const nm = BULAN_ID[PERIODE.m - 1];
  const cp = document.querySelector('.chip-period');
  if (cp) cp.textContent = nm + ' ' + PERIODE.y;
  const rentang = '01 ' + nm + ' \u2013 ' + PERIODE.last + ' ' + nm + ' ' + PERIODE.y;
  ['rangeVal'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.textContent = rentang;
  });
})();

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
  const wtNorm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(/\s+/).sort().join(' ');
  const wtUnitKeys = new Set((typeof WTD !== 'undefined' ? WTD : []).map(d => wtNorm(d.Unit)));
  const sumber = all.filter(d => !wtUnitKeys.has(wtNorm(d.Unit)) && (Object.keys(d.Days || {}).length || DU_MAP[unitKey(d.Unit)]));
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
  const pakaiV = hasVendor(fV, all);
  const pakaiA = fA !== 'ALL' && all.some(d => (d.Area || '') === fA);
  const pakaiJ = fJ !== 'ALL' && all.some(d => (d.Jenis || '-') === fJ);
  const wtNorm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(/\s+/).sort().join(' ');
  const wtUnitKeys = new Set((typeof WTD !== 'undefined' ? WTD : []).map(d => wtNorm(d.Unit)));
  const list = all.filter(d =>
    (!pakaiV || matchVendor(d.Vendor, fV)) &&
    (!pakaiA || (d.Area || '') === fA) &&
    (!pakaiJ || (d.Jenis || '-') === fJ) &&
    !wtUnitKeys.has(wtNorm(d.Unit))
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

// ---------- Control HE: fuel di luar standar + timesheet terlambat >1 hari ----------
function renderControlHE() {
  const sumEl = document.getElementById('controlHeSummary');
  const fuelTb = document.getElementById('controlFuelTbody');
  const lateHeTb = document.getElementById('controlLateHeTbody') || document.getElementById('controlLateTbody');
  const lateWtTb = document.getElementById('controlLateWtTbody');
  if (!fuelTb || (!lateHeTb && !lateWtTb)) return;

  // 1) Fuel di luar standar (HE saja, tidak ikut filter vendor/area/jenis — kecuali Control HE)
  const fuelRows = [];
  (applyRange(DATA) || []).forEach(d => {
    const s = stdFuel(d);
    const v = num(d.FuelRatio);
    if (!s || v <= 0) return;
    const sel = v - s.ratio;
    let status = '';
    let cls = '';
    if (v > s.ratio) { status = 'Melebihi Standar'; cls = 'ctrl-bad'; }
    else if ((s.ratio - v) > 2) { status = 'Terlalu Rendah'; cls = 'ctrl-warn'; }
    else return;
    const satuan = s.satuan === 'Liter/Hari' ? 'L/hari' : 'L/jam';
    fuelRows.push({
      unit: d.Unit || '-', vendor: d.Vendor || '-', area: d.Area || '-',
      cap: (d.Jenis || '-') + (d.Capacity ? ' / ' + d.Capacity : ''),
      actual: fmt(v, 2) + ' ' + satuan,
      std: fmt(s.ratio, 2) + ' ' + satuan,
      sel: (sel > 0 ? '+' : '') + fmt(sel, 2),
      status, cls, selNum: sel
    });
  });
  for (let i = fuelRows.length - 1; i >= 0; i--) {
    if (fuelRows[i].status === 'Melebihi Standar' && fuelRows[i].selNum <= 1) fuelRows.splice(i, 1);
  }
  fuelRows.sort((a, b) => {
    const ga = a.status === 'Melebihi Standar' ? 0 : 1;
    const gb = b.status === 'Melebihi Standar' ? 0 : 1;
    if (ga !== gb) return ga - gb;
    return Math.abs(b.selNum) - Math.abs(a.selNum);
  });

  fuelTb.innerHTML = fuelRows.map(r => `<tr>
    <td><b>${escHtml(r.unit)}</b></td>
    <td>${escHtml(String(r.vendor || '-').replace(/^\d+\.\s*/, ''))}</td>
    <td>${escHtml(r.area)}</td>
    <td>${escHtml(r.cap)}</td>
    <td class="num">${r.actual}</td>
    <td class="num">${r.std}</td>
    <td class="num ${r.cls}"><b>${r.sel}</b></td>
    <td><span class="ctrl-status ${r.cls}">${r.status}</span></td>
  </tr>`).join('') || '<tr><td colspan="8" class="wt-empty">Tidak ada unit fuel di luar standar pada periode ini.</td></tr>';

  // 2) Timesheet terlambat >1 hari (HE + WT, tidak ikut filter vendor/area/jenis — kecuali Control HE)
  const raw = (typeof BELUM !== 'undefined') ? BELUM : [];
  const all = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  const wtNorm = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(/\s+/).sort().join(' ');
  const wtUnitKeys = new Set(WTD.map(d => wtNorm(d.Unit)));
  const lateHeRows = [];
  all.forEach(d => {
    if (wtUnitKeys.has(wtNorm(d.Unit))) return;
    const hariLate = (BMAP[unitKey(d.Unit)] || []).filter(h => h <= BBATAS - 1);
    if (!hariLate.length) return;
    lateHeRows.push({
      unit: d.Unit || '-', vendor: d.Vendor || '-', area: d.Area || '-',
      days: hariLate.map(labelHari).join(', '), count: hariLate.length
    });
  });

  const lateWtRows = [];
  WTD.forEach(d => {
    const single = WT_SHIFT1.indexOf(wtVendorKey(d.Vendor)) >= 0 || (d.Shift2 === false || d.Shift2 === 0);
    const S = (Array.isArray(d.BelumS) && d.BelumS.length === 30) ? d.BelumS : new Array(30).fill(0);
    const M = (Array.isArray(d.BelumM) && d.BelumM.length === 30) ? d.BelumM : new Array(30).fill(0);
    const hariLate = [];
    for (let h = 1; h <= PERIODE.last; h++) {
      if (h > BBATAS - 1) continue;
      const s = !!S[h - 1], m = !!M[h - 1];
      if (single) { if (!(s || m)) hariLate.push(labelHari(h)); }
      else {
        const miss = [];
        if (!s) miss.push('S');
        if (!m) miss.push('M');
        if (miss.length) hariLate.push(h + ' ' + BULAN_ID[PERIODE.m - 1] + ' (' + miss.join('/') + ')');
      }
    }
    if (!hariLate.length) return;
    lateWtRows.push({
      unit: d.Unit || '-', vendor: d.Vendor || '-', area: d.Area || '-',
      days: hariLate.join(', '), count: hariLate.length
    });
  });

  const renderLate = rows => rows.map(r => `<tr>
    <td><b>${escHtml(r.unit)}</b></td>
    <td>${escHtml(String(r.vendor || '-').replace(/^\d+\.\s*/, ''))}</td>
    <td>${escHtml(r.area)}</td>
    <td>${escHtml(r.days)}</td>
    <td class="num"><b>${r.count}</b></td>
  </tr>`).join('') || '<tr><td colspan="5" class="wt-empty">Tidak ada timesheet terlambat &gt;1 hari pada periode ini.</td></tr>';
  const vendorSort = v => String(v || '').replace(/^\d+\.\s*/, '').trim().toUpperCase();
  lateHeRows.sort((a, b) => b.count - a.count || String(a.unit).localeCompare(String(b.unit)));
  lateWtRows.sort((a, b) => vendorSort(a.vendor).localeCompare(vendorSort(b.vendor), 'id') || String(a.unit).localeCompare(String(b.unit), 'id', { numeric: true }));
  if (lateHeTb) lateHeTb.innerHTML = renderLate(lateHeRows);
  if (lateWtTb) lateWtTb.innerHTML = renderLate(lateWtRows);
  if (!lateWtTb && lateHeTb && lateHeTb.id === 'controlLateTbody') lateHeTb.innerHTML = renderLate(lateHeRows.concat(lateWtRows).sort((a,b)=>b.count-a.count||String(a.unit).localeCompare(String(b.unit))));

  if (sumEl) sumEl.innerHTML = '';
}

// ---------- animasi: batang & garis tumbuh dari 0 ----------
function animateChart() {
  if (animRAF) cancelAnimationFrame(animRAF);
  stopBlink();
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
      if (anyBlink(lastRows, CMP_CFG[CMP])) startBlink();
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

// ---- nama model yang ditulis berbeda-beda di file timesheet ----
// Kunci = nama setelah spasi dirapatkan & huruf besar (jadi "SANY STG 230C-10S"
// dan "SANY STG230C-10S" kuncinya sama). Nilai = nama yang DITAMPILKAN.
// Hanya berlaku untuk panel rata-rata per Model/Capacity; Tabel Review Unit
// tetap menampilkan tulisan asli per unit.
// "Hyundai ROBEX210W-9S" dianggap sama dengan "W-EX HYUNDAI 210" (keputusan
// pemilik dashboard) supaya kedua tulisan tidak muncul sebagai dua baris.
const MODEL_ALIAS = {
  'HYUNDAIROBEX210W-9S': 'W-EX HYUNDAI 210'
};
function aliasModel(s) {
  const raw = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  if (!raw) return raw;
  const kunci = raw.toUpperCase().replace(/\s+/g, '');
  return MODEL_ALIAS[kunci] || raw;
}

// ---- rata-rata MA + Fuel Ratio per "Model / Capacity" (izin ma_capacity) ----
// Kolom pertama sengaja dibuat sama persis dengan kolom "Model / Capacity" di
// Tabel Review Unit: Model/Capacity (atau Model saja bila capacity kosong).
// Satu baris = satu pasangan Model + Capacity; unit dengan pasangan yang sama
// digabung, lalu dirata-ratakan.
// MA dirata-ratakan per unit (sama seperti kartu ringkasan). FR dihitung
// berbobot: total Fuel : total HM, karena satuan aslinya L/jam - rata-rata
// biasa akan membuat satu unit berjam kecil menyimpang jauh dari kenyataan.
function renderMaCap(rows) {
  const tb = document.getElementById('maCapTbody');
  if (!tb) return;
  if (rows.length === 0) {
    tb.innerHTML = '<tr><td colspan="5" class="note">Tidak ada unit pada filter ini.</td></tr>';
    return;
  }

  // label "Model / Capacity" - aturan yang sama dengan kolom di Tabel Review Unit
  const labelUnit = d => {
    const model = String(d.Model == null ? '' : d.Model).trim();
    const cap = String(d.Capacity == null ? '' : d.Capacity).trim();
    const adaCap = cap && cap !== '-';
    // pakai penulisan model yang sudah diseragamkan (lihat aliasModel)
    const modelTampil = aliasModel(model);
    return modelTampil ? (adaCap ? `${modelTampil}/${cap}` : modelTampil) : (adaCap ? cap : '-');
  };

  // ringkasan satu baris (dipakai juga untuk baris "Semua")
  const ringkas = items => {
    const adaMa = items.filter(d => num(d.MA) > 0);
    const ma = adaMa.length ? (adaMa.reduce((s, d) => s + num(d.MA), 0) / adaMa.length).toFixed(1) + '%' : '&mdash;';
    const sumFuel = items.reduce((s, d) => s + num(d.Fuel), 0);
    const sumHM = items.reduce((s, d) => s + num(d.HMTotal), 0);
    const fr = (sumHM > 0 && sumFuel > 0) ? sumFuel / sumHM : 0;
    const std = (items.map(stdFuel).find(s => s) || null);
    return { ma, fr, std };
  };

  // kelompokkan per label. Label yang hanya beda huruf besar/kecil dan spasi
  // digabung (mis. "SANY STG 230 C-10S" = "SANY STG230C-10S", "HINO" = "Hino")
  // supaya tidak ada baris kembar; yang ditampilkan adalah ejaan terbanyak di
  // data. Penulisan yang sudah ditetapkan di MODEL_ALIAS dipakai apa adanya.
  const kunci = s => String(s).toUpperCase().replace(/\s+/g, '');
  const peta = new Map();
  rows.forEach(d => {
    const label = labelUnit(d);
    const k = kunci(label);
    if (!peta.has(k)) peta.set(k, { label, variasi: new Map(), items: [] });
    const g = peta.get(k);
    g.items.push(d);
    g.variasi.set(label, (g.variasi.get(label) || 0) + 1);
  });
  const kelompok = [...peta.values()].map(g => {
    // ejaan terbanyak; bila imbang pakai yang paling awal muncul
    let best = g.label, n = -1;
    g.variasi.forEach((jml, lbl) => { if (jml > n) { n = jml; best = lbl; } });
    return { label: best, items: g.items };
  });
  kelompok.sort((a, b) =>
    (capInfo(a.label).cls - capInfo(b.label).cls) ||
    (capInfo(a.label).num - capInfo(b.label).num) ||
    a.label.localeCompare(b.label, 'id', { numeric: true })
  );

  const isi = kelompok.map(g => {
    const r = ringkas(g.items);
    let frTxt = '&mdash;', selTxt = '&mdash;', selCls = '', selTitle = '';
    if (r.fr > 0) {
      frTxt = fmt(r.fr, 2);
      if (r.std) {
        const satuan = r.std.satuan === 'Liter/Hari' ? 'L/hari' : 'L/jam';
        const stdTxt = fmt(r.std.ratio, 2) + ' ' + satuan;
        // selisih & warnanya ikut aturan yang sama dengan peringatan FR unit
        const lewat = r.std.ratio > 0 && r.fr > r.std.ratio;
        selTxt = (lewat ? '+' : '') + fmt(r.fr - r.std.ratio, 2);
        selCls = lewat ? ' class="num sisa-over"' : ' class="num sisa-ok"';
        selTitle = ` title="FR standar ${stdTxt}"`;
      }
    }
    return `<tr><td class="model-cell"><b>${escHtml(g.label)}</b></td>` +
      `<td class="num">${g.items.length}</td><td class="num"><b>${r.ma}</b></td>` +
      `<td class="num"><b>${frTxt}</b></td><td${selCls}${selTitle}><b>${selTxt}</b></td></tr>`;
  }).join('');

  // baris TOTAL semua unit yang sedang tampil
  const tot = ringkas(rows);
  const barisTotal = `<tr class="ma-cap-total"><td>Semua Model / Capacity</td><td class="num">${rows.length}</td>` +
    `<td class="num"><b>${tot.ma}</b></td><td class="num"><b>${tot.fr > 0 ? fmt(tot.fr, 2) : '&mdash;'}</b></td>` +
    `<td class="num">&mdash;</td></tr>`;

  tb.innerHTML = isi + barisTotal;
}

// ---- Grafik gabungan: BAR = HM Total, GARIS = metrik pembanding ----
// prog = 0..1 (progres animasi), 1 = tampil penuh
function drawCombo(rows, prog = 1) {
  const cfg = CMP_CFG[CMP];
  const c = document.getElementById('comboChart');
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const H = 360;
  const nomorUnit = u => { const m = String(u || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; };
  const topAll = [...rows].sort((a, b) =>
    (nomorUnit(a.Unit) - nomorUnit(b.Unit)) ||
    String(a.Unit).localeCompare(String(b.Unit), 'id', { numeric: true })
  );
  const groups = groupByCapacity(topAll);
  const top = groups.flatMap(g => g.items);
  if (!top.length) {
    const cw0 = c.clientWidth || 680;
    c.width = cw0 * dpr; c.height = H * dpr; c.style.width = cw0 + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw0, H);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw0, H);
    GEO = null;
    ctx.fillStyle = '#64748B';
    ctx.font = '13px "Fira Sans", Segoe UI, sans-serif';
    ctx.fillText('Tidak ada data untuk filter ini.', 20, 30);
    return;
  }

  const padL = 64, padR = 74, padT = 54;
  const slotMin = 56; // lebar minimum per batang agar label terbaca saat scroll
  const containerW = (c.parentElement && c.parentElement.clientWidth) ? c.parentElement.clientWidth : (c.clientWidth || 680);
  const needW = padL + padR + (top.length * slotMin) + (Math.max(0, groups.length - 1) * 18);
  const w = Math.max(containerW, needW);
  c.width = w * dpr;
  c.height = H * dpr;
  c.style.width = w + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const h = H;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const maxHM = Math.max(...top.map(d => num(d.HMTotal)), 1);
  const vals = top.map(d => num(d[cfg.field]));
  const maxCmp = cfg.tetapMax !== null ? cfg.tetapMax : niceMax(Math.max(...vals) * 1.15);
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
  const blinkOn = (Math.floor(performance.now() / 450) % 2) === 0;
  let hasBlink = false;
  top.forEach((d, i) => {
    const x = xCenter(i), y = cmpYA(num(d[cfg.field]));
    const r = i === hoverIdx ? 6 : 4;
    const bad = blinkBad(d, cfg);
    if (bad) hasBlink = true;
    if (bad && blinkOn) {
      ctx.fillStyle = '#EF4444';
      ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#B91C1C';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.stroke();
    } else if (bad) {
      ctx.fillStyle = '#FCA5A5';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = cfg.warna;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    }
  });
  ctx.restore();
  if (prog >= 1 && hasBlink && !animRAF && !blinkRAF) startBlink();
  if (prog >= 1 && !hasBlink && blinkRAF) stopBlink();

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
      if (!animRAF && !blinkRAF) drawCombo(lastRows, 1);
    }
  });

  c.addEventListener('mouseleave', () => {
    if (hoverIdx !== -1) {
      hoverIdx = -1;
      c.style.cursor = 'default';
      if (!animRAF && !blinkRAF) drawCombo(lastRows, 1);
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
      if (!animRAF && !blinkRAF) drawCombo(lastRows, 1);
    }
  }
  c.addEventListener('touchstart', sentuh, { passive: true });
  c.addEventListener('touchmove', sentuh, { passive: true });

  window.addEventListener('resize', () => {
    if (!animRAF && !blinkRAF) drawCombo(lastRows, 1);
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
  DATA.filter(d => matchVendor(d.Vendor, v)).forEach(d => add(d.Area));
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
    (matchVendor(d.Vendor, v)) &&
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
  fillCap();
}

// ---------- isi dropdown Capacity sesuai vendor + area + unit type ----------
// Daftarnya menggabungkan dua kolom yang dipakai di halaman ini:
//   Capacity (lebar unit, mis. "14 FT") dan Model/Capacity yang tampil di
//   tabel Review Unit. Tanpa ini dropdown hanya berisi "Semua Capacity".
function fillCap() {
  const sel = document.getElementById('fCap');
  if (!sel) return;
  const prev = sel.value;
  const v = document.getElementById('fVendor').value;
  const area = document.getElementById('fArea').value;
  const jenis = document.getElementById('fJenis').value;

  const rows = DATA.filter(d =>
    (matchVendor(d.Vendor, v)) &&
    (area === 'ALL' || (d.Area || '') === area) &&
    (jenis === 'ALL' || (d.Jenis || '-') === jenis)
  );
  const daftar = new Set();
  rows.forEach(d => {
    const c = String(d.Capacity == null ? '' : d.Capacity).trim();
    const m = String(d.Model == null ? '' : d.Model).trim();
    if (c && c !== '-') daftar.add(c);
    if (m && m !== '-') daftar.add(m);
  });

  const list = [...daftar].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  sel.innerHTML = '<option value="ALL">Semua Capacity</option>' +
    list.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  sel.value = (prev === 'ALL' || list.includes(prev)) ? prev : 'ALL';
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

// klik Unit ID di tabel Review Unit -> panel detail (satu listener untuk seluruh tabel)
const tbodyEl = document.getElementById('tbody');
if (tbodyEl) tbodyEl.addEventListener('click', e => {
  const b = e.target.closest ? e.target.closest('.unit-id') : null;
  if (!b) return;
  const d = lastRows.find(x => unitKey(x.Unit) === unitKey(b.dataset.unit));
  if (d) openUnitPanel(d);
});

// klik kartu ringkasan -> modal pecahan per vendor (satu listener)
const cardsEl = document.getElementById('cards');
if (cardsEl) {
  const bukaKartu = el => {
    const c = el.closest ? el.closest('[data-card]') : null;
    if (c) openVendorPanel(c.dataset.card);
  };
  cardsEl.addEventListener('click', e => bukaKartu(e.target));
  cardsEl.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (!e.target.closest || !e.target.closest('[data-card]')) return;
    e.preventDefault();
    bukaKartu(e.target);
  });
}

// Esc menutup panel; Tab berputar di dalam panel (fokus: tutup + kartu vendor)
document.addEventListener('keydown', e => {
  if (!UD_WRAP || !UD_WRAP.classList.contains('open')) return;
  if (e.key === 'Escape') { closeUnitPanel(); return; }
  if (e.key !== 'Tab') return;
  const fokus = [...UD_WRAP.querySelectorAll('.ud-close, .vd-card')];
  if (!fokus.length) return;
  e.preventDefault();
  const i = fokus.indexOf(document.activeElement);
  const n = fokus.length;
  const next = fokus[(i + (e.shiftKey ? -1 : 1) + n) % n];
  if (next) next.focus();
});

// ---------- menu perbandingan ----------
function setCmp(key) {
  CMP = key;
  const cfg = CMP_CFG[key];
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cmp === key);
  });
  TITLE_BASE = `Grafik HM (Bar) &  (Garis) per Unit per Vendor · per Capacity`;
  updateTitle();
  document.getElementById('chartNote').textContent = cfg.catatan;
  render();
}

// judul grafik + info rentang waktu aktif
function updateTitle() {
  const el = document.getElementById('chartTitle');
  if (!el) return;
  const rs = rangeState();
  el.textContent = TITLE_BASE + (rs.full ? '' : ` – ${rs.from}\u2013${rs.to} ${BULAN_ID[PERIODE.m - 1]} ${PERIODE.y}`);
}

// ---------- kalender rentang: satu kalender, klik tanggal awal lalu tanggal akhir ----------
const CAL = { y: PERIODE.y, m: PERIODE.m, pick: null };

function isoOf(day) { return `${PERIODE.y}-${String(PERIODE.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }

function rangeLabel() {
  const rs = rangeState();
  const nm = d => String(d).padStart(2, '0');
  const bl = BULAN_ID[PERIODE.m - 1];
  return `${nm(rs.from)} ${bl} \u2013 ${nm(rs.to)} ${bl} ${PERIODE.y}`;
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

  let html = `<div class="cal-head"><span>${BULAN_ID[PERIODE.m - 1]} ${PERIODE.y}</span><span class="cal-hint">${CAL.pick ? 'klik tanggal akhir' : 'klik tanggal awal'}</span></div><div class="cal-grid">`;
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
document.getElementById('fJenis').addEventListener('change', () => { fillCap(); render(); });
const fCapEl = document.getElementById('fCap');
if (fCapEl) fCapEl.addEventListener('change', () => render());

// kunci filter mobile (seperti Coal Hauling)
(function(){ const lb=document.getElementById("lockbar"), bt=document.getElementById("lkFt"); if(!lb||!bt) return;
  bt.onclick=()=>{ const o=!lb.classList.contains("open"); lb.classList.toggle("open",o); bt.setAttribute("aria-expanded",o); bt.querySelector("span").textContent=o?"Tutup filter":"Filter"; };
  const setH=()=>{ lb.style.setProperty("--lockH", lb.offsetHeight+"px"); };
  setH(); if(window.ResizeObserver) new ResizeObserver(setH).observe(lb);
  addEventListener("scroll",()=>lb.classList.toggle("stuck", lb.getBoundingClientRect().top<=10), {passive:true});
})();
// toggle sidebar (901-1000px)
(function(){ const app=document.querySelector('.app'), bt=document.getElementById('sideTog'); if(!app||!bt) return;
  bt.onclick=()=>{ const o=!app.classList.contains('side-open'); app.classList.toggle('side-open',o); bt.setAttribute('aria-expanded',o); const sp=bt.querySelector('span'); if(sp) sp.textContent=o?'Tutup menu':'Menu'; };
})();

// tombol reset filter
const btnReset = document.getElementById('btnResetFilter');
if (btnReset) btnReset.addEventListener('click', () => {
  document.getElementById('fVendor').value = 'ALL';
  fillAreas();
  document.getElementById('fArea').value = 'ALL';
  fillJenis();
  document.getElementById('fJenis').value = 'ALL';
  if (fCapEl) fCapEl.value = 'ALL';
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
