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
