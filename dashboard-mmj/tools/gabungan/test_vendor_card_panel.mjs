/* Uji agregasi per vendor untuk panel kartu ringkasan HE.
 *
 * Fungsi `vendorAgg` diambil langsung dari js/app.js lalu dijalankan dengan
 * data contoh. Yang diuji: pengelompokan vendor (prefiks `WT ` dibuang),
 * penjumlahan vs rata-rata, pengecualian nilai 0 dari rata-rata, dan urutan
 * baris. Angka harapan ditulis tangan, bukan dihitung ulang oleh fungsi itu.
 *
 * Jalankan: node test_vendor_card_panel.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const APP = new URL('../../../js/app.js', import.meta.url);
const src = fs.readFileSync(APP, 'utf8');

function pick(name) {
  const start = src.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'fungsi ' + name + ' tidak ada di js/app.js');
  let i = src.indexOf('{', start);
  let depth = 0;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (!depth) return src.slice(start, k + 1); }
  }
  throw new Error('kurung kurawal ' + name + ' tidak seimbang');
}

const factory = new Function([pick('num'), pick('wtVendorKey'), pick('vendorAgg'), 'return vendorAgg;'].join('\n'));
const vendorAgg = factory();

const he = [
  { Vendor: 'SKN', HMTotal: '10.5', Fuel: '20', MA: '80', PAPct: '90', FuelRatio: '2.0' },
  { Vendor: 'SKN', HMTotal: '4.5', Fuel: '10', MA: '60', PAPct: 0, FuelRatio: 0 },
  { Vendor: 'GIP H1', HMTotal: '2', Fuel: '5', MA: '0', PAPct: '50', FuelRatio: '3.5' }
];
const wt = [
  { Vendor: 'WT SKN', P: 5 },
  { Vendor: 'WT SKN', P: '3' },
  { Vendor: 'WT TJP', P: 9 }
];
const allHe = [{ Vendor: 'SKN' }, { Vendor: 'SKN' }, { Vendor: 'GIP H1' }];
const allWt = [{ Vendor: 'WT SKN' }, { Vendor: 'WT TJP' }];

const rows = kind => vendorAgg(kind, he, wt, allHe, allWt);
const brief = kind => rows(kind).map(r => [r.vendor, r.n, Math.round(r.val * 100) / 100]);

// Unit HE dan WT dengan prefiks `WT ` menyatu jadi satu baris; urut menurun.
assert.deepEqual(brief('units'), [
  ['SKN', 3, 3],
  ['GIP H1', 1, 1],
  ['TJP', 1, 1]
]);

// Kartu ketersediaan selalu menghitung populasi penuh, bukan HE yang sedang terfilter.
const filteredHe = [allHe[0]];
const unitsCardTotal = allHe.length + allWt.length;
assert.equal(filteredHe.length, 1);
assert.equal(rows('units').reduce((sum, r) => sum + r.n, 0), unitsCardTotal);

// Penjumlahan: nilai dikali jumlah unit vendor.
assert.deepEqual(brief('hm'), [['SKN', 2, 15], ['GIP H1', 1, 2]]);
assert.deepEqual(brief('fuel'), [['SKN', 2, 30], ['GIP H1', 1, 5]]);
assert.deepEqual(brief('water'), [['TJP', 1, 9], ['SKN', 2, 8]]);

// Rata-rata: nilai 0 tidak ikut dihitung (SKN MA = (80+60)/2; PA hanya 90).
assert.deepEqual(brief('ma'), [['SKN', 2, 70], ['GIP H1', 1, 0]]);
assert.deepEqual(brief('pa'), [['SKN', 2, 90], ['GIP H1', 1, 50]]);
assert.deepEqual(brief('ratio'), [['GIP H1', 1, 3.5], ['SKN', 2, 2]]);

// Rata-rata tanpa nilai sama sekali = 0, bukan NaN.
assert.equal(vendorAgg('ma', [{ Vendor: 'X', MA: 0 }], [], [], []).find(r => r.vendor === 'X').val, 0);

// ---- dropdown unit per vendor (klik kartu vendor) ----
const DATA_T = [
  { Vendor: 'SKN', Unit: 'SKN-01', Fuel: '7', HMTotal: '4' },
  { Vendor: 'SKN', Unit: 'SKN-02', Fuel: '3', HMTotal: '6' },
  { Vendor: 'GIP H1', Unit: 'GIP-01', Fuel: '9', HMTotal: '1' }
];
const WTD_T = [{ Vendor: 'WT SKN', Unit: 'WT SKN-01' }, { Vendor: 'WT TJP', Unit: 'WT TJP-01' }];
const util = new Function(
  [pick('num'), pick('fmt'), pick('wtVendorKey'), 'return { num, fmt, wtVendorKey };'].join('\n')
)();
const vendorUnits = new Function(
  'DATA', 'WTD', 'wtRangeRows', 'applyRange', 'filtered', 'num', 'fmt', 'wtVendorKey',
  [pick('vendorUnits'), 'return vendorUnits;'].join('\n')
)(
  DATA_T, WTD_T,
  () => [{ Vendor: 'WT SKN', Unit: 'WT SKN-01', P: 7 }],
  rows => rows, () => DATA_T, util.num, util.fmt, util.wtVendorKey
);

// Total Fuel -> Unit ID + Fuel, urut terbesar.
assert.deepEqual(vendorUnits('fuel', 'SKN').map(r => [r.Unit, r.txt]), [['SKN-01', '7'], ['SKN-02', '3']]);
// Vendor WT dinormalkan: 'WT SKN' ikut baris SKN.
assert.deepEqual(vendorUnits('water', 'SKN').map(r => [r.Unit, r.txt]), [['WT SKN-01', '7']]);
// Kartu Ketersediaan Unit -> HE + WT milik vendor itu.
assert.deepEqual(vendorUnits('units', 'SKN').map(r => [r.Unit, r.txt]), [['SKN-01', 'HE'], ['SKN-02', 'HE'], ['WT SKN-01', 'WT']]);
// Vendor tanpa unit tidak melempar error.
assert.deepEqual(vendorUnits('fuel', 'TIDAK ADA'), []);

// Logo vendor: data URI PNG untuk semua 6 vendor, bukan placeholder kosong.
import { readFileSync } from 'node:fs';
const vdLogoSrc = readFileSync(new URL('../../../js/app.js', import.meta.url), 'utf8')
  .match(/const VD_LOGO = \{([\s\S]*?)\};/)[1];
const vdLogo = {};
vdLogoSrc.split('\n').forEach(l => {
  const m = l.match(/^\s*(\w+): '(data:image\/png;base64,[^']*)',$/);
  if (m) vdLogo[m[1]] = m[2];
});
for (const v of ['GIP', 'JTU', 'BDK', 'SKN', 'TSA', 'TJP']) {
  assert.ok(vdLogo[v], `logo ${v} ada`);
  assert.ok(vdLogo[v].startsWith('data:image/png;base64,'), `logo ${v} data URI PNG`);
  assert.ok(!vdLogo[v].includes('__VDLOGO_'), `logo ${v} tanpa placeholder`);
  assert.ok(vdLogo[v].length > 500, `logo ${v} isi nyata (${vdLogo[v].length} char)`);
}

// Vendor WT (mis. 'WT SKN') dinormalkan ke SKN -> logo ikut.
const sknLike = new Function([pick('wtVendorKey'), 'return wtVendorKey;'].join('\n'))()('WT SKN');
assert.ok(vdLogo[sknLike] && vdLogo[sknLike].startsWith('data:image/png;base64,'), 'logo SKN berlaku utk WT SKN');

// "Semua GIP": GIP H1 / GIP H2 ikut logo GIP.
const vdLogoFor = new Function(
  ['const VD_LOGO = ' + JSON.stringify(vdLogo) + ';', pick('wtVendorKey'), pick('vdLogoFor'), 'return vdLogoFor;'].join('\n')
)();
assert.equal(vdLogoFor('GIP H1'), vdLogo.GIP, 'GIP H1 pakai logo GIP');
assert.equal(vdLogoFor('GIP H2'), vdLogo.GIP, 'GIP H2 pakai logo GIP');
assert.equal(vdLogoFor('SKN'), vdLogo.SKN, 'SKN logo langsung');
assert.equal(vdLogoFor('WT TJP'), vdLogo.TJP, 'WT TJP dinormalkan ke TJP');
assert.equal(vdLogoFor('VENDOR LAIN'), '', 'vendor tanpa logo -> kosong');

console.log('OK: agregasi per vendor untuk panel kartu ringkasan');
