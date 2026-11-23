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
  const PERIODE = (typeof WT_PERIODE !== 'undefined' && WT_PERIODE) ? WT_PERIODE : { y: 2026, m: 11, last: 30, label: 'November 2026' };

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
  let blinkRAF = null;

  function blinkBad(d, cfg) {
    const ma = num(d.MA);
    const pa = num(d.PA != null ? d.PA : d.PAPct);
    const fr = num(d.FuelRatio);
    if (cfg.field === 'MA') return ma > 0 && ma < 85;
    if (cfg.field === 'PA' || cfg.field === 'PAPct') return pa > 0 && pa < 80;
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
      drawCombo(wtRows, 1);
      blinkRAF = requestAnimationFrame(loop);
    };
    blinkRAF = requestAnimationFrame(loop);
  }

  // ---------- rentang tanggal ----------
  function rangeState() {
    const f = $('fFrom'), t = $('fTo');
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
    const full = rs.from <= 1 && rs.to >= PERIODE.last;
    return rows.map(d => {
      let p = 0, hari = 0, fuel = 0;
      const days = d.Days || {};
      for (const k in days) {
        const day = parseInt(k, 10);
        if (day < rs.from || day > rs.to) continue;
        const v = num(days[k].P);
        p += v;
        fuel += num(days[k].Fuel);
        if (v > 0) hari++;
      }
      if (fuel <= 0 && full) fuel = num(d.FuelRecap || d.FuelReview);
      return Object.assign({}, d, { P: p, Hari: hari, Fuel: fuel });
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
    return String(s || '').toUpperCase().replace(/^\d+\.\s*/, '').replace(/^WT\s+/, '').trim();
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
    const sumFuel = rows.reduce((s, d) => s + num(d.Fuel), 0);
    syncHeCards(sumP);
    const elFuel = $('wtTotalFuel');
    if (elFuel) elFuel.textContent = fmt0(sumFuel);

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
        return (va - vb) || String(a.Vendor || '').localeCompare(String(b.Vendor || ''), 'id') || String(a.Unit).localeCompare(String(b.Unit), 'id', { numeric: true });
      });
    }
    $('wtTbody').innerHTML = tabel.length ? tabel.map(d => {
      const cmpVal = num(d[cmpField]);
      const maTxt = cmpVal > 0 ? (isPct ? fmt(cmpVal, 1) + '%' : fmt(cmpVal, 2)) : '\u2013';
      const maLow = WT_CMP === 'MA' && cmpVal > 0 && cmpVal < 85;
      const rata = d.Hari > 0 ? fmt(d.P / d.Hari, 1) : '\u2013';
      const pCls = d.P > 0 ? '' : ' sisa-over';
      const fuelTxt = num(d.Fuel) > 0 ? fmt0(d.Fuel) : '\u2013';
      return '<tr>' +
        '<td><b>' + (esc(d.Unit) || '-') + '</b></td>' +
        '<td class="col-optional">' + (esc(String(d.Vendor || '-').replace(/^\d+\.\s*/, '').replace(/^WT\s+/i, '')) || '-') + '</td>' +
        '<td class="col-optional">' + (esc(d.Area) || '-') + '</td>' +
        '<td class="model-cell col-optional">' + (esc(d.Model) || '-') + (d.Capacity && d.Capacity !== '-' ? ' / ' + esc(d.Capacity) : '') + '</td>' +
        '<td class="num' + pCls + '"><b>' + fmt0(d.P) + '</b></td>' +
        '<td class="num min-h">' + d.Hari + '</td>' +
        '<td class="num">' + rata + '</td>' +
        '<td class="num">' + fuelTxt + '</td>' +
        '<td class="num"' + (maLow ? ' style="color:#DC2626;font-weight:700"' : '') + '>' + maTxt + '</td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="9" class="wt-empty">Tidak ada unit WT yang cocok dengan filter di atas.</td></tr>';

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
    if (title) title.textContent = 'Grafik Penyiraman (Bar) & ' + cfg.judul + ' (Garis) per Unit';
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
    stopBlink();
    const t0 = performance.now();
    const dur = 520;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      drawCombo(wtRows, e);
      if (p < 1) animRAF = requestAnimationFrame(step);
      else { animRAF = null; drawCombo(wtRows, 1); if (anyBlink(wtRows, WT_CMP_CFG[WT_CMP] || WT_CMP_CFG.MA)) startBlink(); }
    };
    animRAF = requestAnimationFrame(step);
  }

  function drawCombo(rows, prog) {
    prog = prog == null ? 1 : prog;
    const cfg = WT_CMP_CFG[WT_CMP] || WT_CMP_CFG.MA;
    const c = $('wtChart');
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const H = 360;

    // tampilkan semua unit WT, urut nomor unit seperti HM
    const nomorUnit = u => { const m = String(u || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; };
    const topAll = rows.slice().sort((a, b) =>
      (nomorUnit(a.Unit) - nomorUnit(b.Unit)) ||
      String(a.Unit).localeCompare(String(b.Unit), 'id', { numeric: true })
    );

    // group by vendor (analog kapasitas di HM)
    const byVendor = {};
    topAll.forEach(d => { (byVendor[d.Vendor] = byVendor[d.Vendor] || []).push(d); });
    const vendors = Object.keys(byVendor).sort((a, b) => {
      const ta = byVendor[a].reduce((s, d) => s + d.P, 0);
      const tb = byVendor[b].reduce((s, d) => s + d.P, 0);
      return (tb - ta) || String(a).localeCompare(String(b), 'id');
    });
    const groups = vendors.map(v => {
      const items = byVendor[v].slice().sort((a, b) =>
        (nomorUnit(a.Unit) - nomorUnit(b.Unit)) ||
        String(a.Unit).localeCompare(String(b.Unit), 'id', { numeric: true })
      );
      return { vendor: v, label: String(v || '-').replace(/^\d+\.\s*/, ''), items, total: items.reduce((s, d) => s + d.P, 0) };
    });
    const top = groups.flatMap(g => g.items);

    if (!top.length) {
      const cw0 = c.clientWidth || 680;
      c.width = cw0 * dpr; c.height = H * dpr; c.style.width = cw0 + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw0, H);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw0, H);
      WT_GEO = null;
      ctx.fillStyle = '#64748B';
      ctx.font = '13px "Fira Sans", Segoe UI, sans-serif';
      ctx.fillText('Tidak ada data untuk filter ini.', 20, 30);
      return;
    }

    const padL = 64, padR = 74, padT = 54;
    const slotMin = 56;
    const containerW = (c.parentElement && c.parentElement.clientWidth) ? c.parentElement.clientWidth : (c.clientWidth || 680);
    const needW = padL + padR + (top.length * slotMin) + (Math.max(0, groups.length - 1) * 18);
    const w = Math.max(containerW, needW);
    c.width = w * dpr; c.height = H * dpr; c.style.width = w + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const h = H;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);

    const maxP = Math.max(...top.map(d => num(d.P)), 1);
    const cmpField = cfg.field;
    const maxCmp = cfg.tetapMax !== null && cfg.tetapMax !== undefined ? cfg.tetapMax : niceMax(Math.max(...top.map(d => num(d[cmpField]))) * 1.15);
    const plotW = w - padL - padR;
    const GAP = 0.6;

    let cursor = 0;
    groups.forEach(g => { g.slotAwal = cursor; cursor += g.items.length; g.slotAkhir = cursor; cursor += GAP; });
    const totalSlot = Math.max(cursor - GAP, 1);
    const slotW = plotW / totalSlot;
    const bw = slotW;
    const centers = [];
    cursor = 0;
    groups.forEach(g => { g.items.forEach(() => { centers.push(padL + (cursor + 0.5) * slotW); cursor += 1; }); cursor += GAP; });
    const xCenter = i => centers[i];

    // label kelompok
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
      g.baris = r; barisAkhir[r] = g.cx + g.pw / 2;
    });
    const barisMaks = Math.max(0, barisAkhir.length - 1);
    const padB = 102 + barisMaks * 16;
    const plotH = h - padB - padT;
    const baseY = h - padB;
    WT_GEO = { padL, padB, padT, bw, slotW, plotH, n: top.length, w, h, xCenter, centers };

    // pita latar + pemisah
    groups.forEach((g, gi) => {
      const x0 = padL + g.slotAwal * slotW;
      const x1 = padL + g.slotAkhir * slotW;
      if (gi % 2 === 1) { ctx.fillStyle = 'rgba(30,64,175,0.035)'; ctx.fillRect(x0, padT - 8, x1 - x0, plotH + 10); }
      if (gi > 0) {
        ctx.save(); ctx.strokeStyle = '#DCE7F5'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(x0 - (GAP * slotW) / 2, padT - 8); ctx.lineTo(x0 - (GAP * slotW) / 2, baseY); ctx.stroke(); ctx.restore();
      }
    });

    // hover highlight
    if (wtHover >= 0 && wtHover < top.length) {
      ctx.fillStyle = 'rgba(59,130,246,0.10)';
      ctx.fillRect(centers[wtHover] - slotW / 2, padT, slotW, plotH + 6);
    }

    // grid + axes
    ctx.font = '11px "Fira Code", Consolas, monospace';
    for (let i = 0; i <= 4; i++) {
      const y = baseY - i * plotH / 4;
      ctx.strokeStyle = i === 0 ? '#CBD5E1' : '#EEF2F7';
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillStyle = '#64748B'; ctx.textAlign = 'right';
      ctx.fillText((maxP * i / 4).toFixed(0), padL - 8, y + 4);
      ctx.fillStyle = cfg.warna; ctx.textAlign = 'left';
      ctx.fillText(cfg.tick(maxCmp * i / 4), w - padR + 8, y + 4);
    }
    ctx.fillStyle = '#94A3B8'; ctx.textAlign = 'center';
    ctx.fillText('Penyiraman (rit)', padL - 34, padT - 16);
    ctx.fillStyle = cfg.warna;
    ctx.fillText(cfg.satuan, w - padR + 36, padT - 16);

    // bars
    const barW = Math.max(6, bw * 0.64);
    top.forEach((d, i) => {
      const pv = num(d.P);
      const bh = plotH * (pv / maxP) * prog;
      const x = centers[i] - barW / 2;
      const y = baseY - bh;
      const aktif = i === wtHover;
      if (bh > 0.5) {
        const grad = ctx.createLinearGradient(0, y, 0, baseY);
        if (aktif) { grad.addColorStop(0, '#60A5FA'); grad.addColorStop(1, '#1D4ED8'); }
        else { grad.addColorStop(0, '#7EB3F7'); grad.addColorStop(1, '#1E40AF'); }
        ctx.save();
        if (aktif) { ctx.shadowColor = 'rgba(30,64,175,0.35)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3; }
        ctx.fillStyle = grad; barPath(ctx, x, y, barW, bh, 4); ctx.fill(); ctx.restore();
        if (aktif) { ctx.strokeStyle = '#1E3A8A'; ctx.lineWidth = 1.5; barPath(ctx, x, y, barW, bh, 4); ctx.stroke(); }
      }
      if (pv > 0 && prog > 0.55) {
        ctx.save(); ctx.globalAlpha = Math.min(1, (prog - 0.55) / 0.45);
        ctx.font = 'bold 10px "Fira Code", Consolas, monospace'; ctx.textAlign = 'center';
        if (bh > 22) { ctx.fillStyle = '#ffffff'; ctx.fillText(pv.toFixed(0), x + barW / 2, baseY - 6); }
        else { ctx.fillStyle = '#334155'; ctx.fillText(pv.toFixed(0), x + barW / 2, y - 5); }
        ctx.restore();
      }
      ctx.save();
      ctx.translate(xCenter(i), baseY + 12); ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = i === wtHover ? '#1E40AF' : '#475569';
      ctx.font = (i === wtHover ? 'bold ' : '') + '10px "Fira Sans", Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(d.Unit || ''), 0, 0);
      ctx.restore();
    });

    // group labels
    const groupY = baseY + 76;
    groups.forEach(g => {
      const cy = groupY + g.baris * 16;
      ctx.save(); ctx.font = 'bold 9.5px "Fira Code", Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#EEF4FE'; barPath(ctx, g.cx - g.pw / 2, cy - 8, g.pw, 16, 8); ctx.fill();
      ctx.strokeStyle = '#D6E4FA'; ctx.lineWidth = 1; barPath(ctx, g.cx - g.pw / 2, cy - 8, g.pw, 16, 8); ctx.stroke();
      ctx.fillStyle = '#1E40AF'; ctx.fillText(g.teks, g.cx, cy + 0.5); ctx.restore();
    });

    // line
    const cmpY = v => baseY - plotH * (Math.min(Math.max(v, 0), maxCmp) / maxCmp);
    const cmpYA = v => baseY - (baseY - cmpY(v)) * prog;
    ctx.save(); ctx.globalAlpha = Math.min(1, prog * 1.6); ctx.strokeStyle = cfg.warna; ctx.lineWidth = 2; ctx.beginPath();
    top.forEach((d, i) => { const x = xCenter(i), y = cmpYA(num(d[cmpField])); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();
    const blinkOn = (Math.floor(performance.now() / 450) % 2) === 0;
    let hasBlink = false;
    top.forEach((d, i) => {
      const x = xCenter(i), y = cmpYA(num(d[cmpField])); const r = i === wtHover ? 6 : 4;
      const bad = blinkBad(d, cfg);
      if (bad) hasBlink = true;
      if (bad && blinkOn) {
        ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#B91C1C'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.stroke();
      } else if (bad) {
        ctx.fillStyle = '#FCA5A5'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = cfg.warna; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      }
    });
    ctx.restore();
    if (prog >= 1 && hasBlink && !animRAF && !blinkRAF) startBlink();
    if (prog >= 1 && !hasBlink && blinkRAF) stopBlink();

    // line labels
    const cmpLabel = cfg.nilai || cfg.tick;
    if (prog > 0.7) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (prog - 0.7) / 0.3);
      ctx.font = 'bold 9px "Fira Code", Consolas, monospace'; ctx.textAlign = 'center';
      top.forEach((d, i) => {
        const v = num(d[cmpField]); const x = xCenter(i), y = cmpY(v);
        const teks = cmpLabel(v); const diAtas = y > padT + 16;
        const tw = ctx.measureText(teks).width; const ty = diAtas ? y - 7 : y + 13;
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x - tw / 2 - 2, ty - 8, tw + 4, 11);
        ctx.fillStyle = cfg.warna; ctx.fillText(teks, x, ty);
      });
      ctx.restore();
    }

    // legend
    ctx.textAlign = 'left'; ctx.font = '12px "Fira Sans", Segoe UI, sans-serif';
    ctx.fillStyle = '#3B82F6'; ctx.fillRect(padL, 8, 12, 8);
    ctx.fillStyle = '#475569'; ctx.fillText('Penyiraman (rit)', padL + 18, 16);
    ctx.strokeStyle = cfg.warna; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(padL + 140, 12); ctx.lineTo(padL + 168, 12); ctx.stroke();
    ctx.fillStyle = cfg.warna; ctx.beginPath(); ctx.arc(padL + 154, 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#475569'; ctx.fillText(cfg.satuan, padL + 174, 16);

    if (wtHover >= 0 && wtHover < top.length && prog >= 1) {
      drawTooltip(ctx, top[wtHover], wtHover, cfg, WT_GEO, barW, maxP, baseY, plotH);
    }
  }

  function drawTooltip(ctx, d, i, cfg, geo, barW, maxP, baseY, plotH) {
    const barTop = baseY - plotH * (num(d.P) / maxP);
    const cmpLabel = cfg.nilai || cfg.tick;
    const lines = [
      { t: String(d.Unit || '-'), bold: true, warna: '#0F172A' },
      { t: [d.Vendor, d.Area].filter(Boolean).join(' - '), bold: false, warna: '#64748B' },
      { t: 'Penyiraman: ' + fmt0(num(d.P)) + ' rit', bold: true, warna: '#1E40AF' },
      { t: cfg.judul + ': ' + cmpLabel(num(d[cfg.field])), bold: true, warna: cfg.warna }
    ];
    ctx.save();
    ctx.font = '11px "Fira Sans", Segoe UI, sans-serif';
    let maxW = 0;
    lines.forEach(l => { ctx.font = (l.bold ? 'bold ' : '') + '11px "Fira Sans", Segoe UI, sans-serif'; maxW = Math.max(maxW, ctx.measureText(l.t).width); });
    const padX = 10, padY = 8, lineH = 15;
    const boxW = maxW + padX * 2, boxH = lines.length * lineH + padY * 2;
    let bx = geo.centers[i] + 14; let by = barTop - 6;
    if (bx + boxW > geo.w - 8) bx = geo.centers[i] - boxW - 14;
    if (by < 6) by = 6; if (by + boxH > geo.h - 8) by = geo.h - boxH - 8;
    ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#DCE7F5'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 8); ctx.fill(); ctx.stroke();
    ctx.shadowColor = 'transparent';
    lines.forEach((l, li) => { ctx.font = (l.bold ? 'bold ' : '') + '11px "Fira Sans", Segoe UI, sans-serif'; ctx.fillStyle = l.warna; ctx.textAlign = 'left'; ctx.fillText(l.t, bx + padX, by + padY + 11 + li * lineH); });
    ctx.restore();
  }

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
      if (best !== wtHover) { wtHover = best; if (!animRAF && !blinkRAF) drawCombo(wtRows, 1); }
    });
    c.addEventListener('mouseleave', () => {
      if (wtHover !== -1) { wtHover = -1; if (!animRAF && !blinkRAF) drawCombo(wtRows, 1); }
    });
  }

  // Rentang waktu mengikuti rentang utama HE (fFrom/fTo), bukan kontrol WT sendiri.

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

    ['fFrom', 'fTo'].forEach(id => {
      const inp = $(id);
      if (inp) inp.addEventListener('change', () => render());
    });

    let rz = null;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => drawCombo(wtRows, 1), 150);
    });

    pasangHover();
    render();
    requestAnimationFrame(() => { if (wtRows.length) drawCombo(wtRows, 1); });
    setTimeout(() => { if (wtRows.length) drawCombo(wtRows, 1); }, 400);
  });
})();
