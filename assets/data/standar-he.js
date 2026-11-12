/* assets/data/standar-he.js - dibuat otomatis oleh emit_site.py, jangan diedit manual. */
// ============================================================================
// Data kontrol SOP Heavy Equipment - PT. Musi Mitra Jaya (Site)
// Sumber: "2026.10. SOP HE PT.Musi Mitra Jaya (Site) R_01.docx"
//         No.03/MMJ-SOP-ECC/X/2026 - Revisi 00 / 01 Oktober 2026
//
//   * Butir 8.4 "Kategori Penilaian Indikator" (halaman 10)
//       MA  batas 85%  -> >= 85% : Baik (Good) ; < 85% : Rendah (Low)
//       UA  batas 80%  -> >= 80% : Baik (Good) ; < 80% : Rendah (Low)
//       EU  batas 70%  -> >= 70% : Baik (Good) ; < 70% : Rendah (Low)
//
//   * Butir 9 "Review Data Fuel" - Tabel 1 "Fuel Ratio Standar per Type dan
//     Class Unit" (halaman 11)
//       Fuel Ratio aktual = total liter fuel / HM kerja (liter per jam);
//       khusus LV Operasional dihitung liter per hari.
//       Butir 9: penyimpangan wajib dilaporkan bila Fuel Ratio aktual
//       MELEBIHI standar, atau LEBIH RENDAH 3 liter atau lebih dari standar.
//
// File ini dipakai js/app.js (running text tab Heavy Equipment).
// Kalau SOP direvisi, cukup ubah angka di sini.
// ============================================================================
window.MMJ_STD = {
  meta: {
    dokumen: 'SOP Database Heavy Equipment',
    nomor: 'No.03/MMJ-SOP-ECC/X/2026',
    revisi: '00 / 01 Oktober 2026',
    butir: '8.4 (Kategori Penilaian Indikator) & 9 (Review Data Fuel - Tabel 1)'
  },

  // Tabel 1. Fuel Ratio Standar per Type dan Class Unit
  // type "-" / cls "-" = berlaku untuk semua class pada type tersebut
  fuelRatio: [
    { type: 'Motor Grader',    cls: '14 FT',  ratio: 20, satuan: 'Liter/Jam' },
    { type: 'Motor Grader',    cls: '12 FT',  ratio: 16, satuan: 'Liter/Jam' },
    { type: 'Compactor',       cls: '10 Ton', ratio: 12, satuan: 'Liter/Jam' },
    { type: 'Compactor',       cls: '20 Ton', ratio: 19, satuan: 'Liter/Jam' },
    { type: 'Excavator',       cls: 'PC 200', ratio: 19, satuan: 'Liter/Jam' },
    { type: 'Dump Truck',      cls: '30 Ton', ratio: 12, satuan: 'Liter/Jam' },
    { type: 'Fuel Truck',      cls: '5 KL',   ratio: 10, satuan: 'Liter/Jam' },
    { type: 'Fuel Truck',      cls: '8 KL',   ratio: 10, satuan: 'Liter/Jam' },
    { type: 'Trado',           cls: '-',      ratio: 12, satuan: 'Liter/Jam' },
    { type: 'Water Truck',     cls: '-',      ratio: 10, satuan: 'Liter/Jam' },
    { type: 'Water Fill',      cls: '5 KVA',  ratio: 10, satuan: 'Liter/Jam' },
    { type: 'LV Operasional',  cls: '-',      ratio: 25, satuan: 'Liter/Hari' }
  ],

  // Kategori penilaian indikator (butir 8.4) - batas nilai & label
  indikator: [
    { kode: 'MA', nama: 'Mechanical Availability', batas: 85, baik: 'Baik (Good)', rendah: 'Rendah (Low)' },
    { kode: 'UA', nama: 'Use of Availability',     batas: 80, baik: 'Baik (Good)', rendah: 'Rendah (Low)' },
    { kode: 'EU', nama: 'Effective Utilization',   batas: 70, baik: 'Baik (Good)', rendah: 'Rendah (Low)' }
  ],

  // Butir 9: selisih di bawah standar yang wajib dilaporkan (liter)
  toleransiBawah: 3
};

/* Cari Fuel Ratio standar untuk 1 unit.
   jenis = Type unit (mis. "Motor Grader"), cls = Class unit (mis. "14 FT").
   Type/class "-" pada Tabel 1 dianggap berlaku untuk semua class.
   Hasil: { type, cls, ratio, satuan } atau null bila type tidak ada di Tabel 1. */
window.MMJ_STD.cariFuelRatio = function (jenis, cls) {
  var norm = function (s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toUpperCase();
  };
  var j = norm(jenis), c = norm(cls);
  if (!j) return null;
  var list = window.MMJ_STD.fuelRatio, i, r, rc;
  // 1) type + class persis
  for (i = 0; i < list.length; i++) {
    r = list[i]; rc = norm(r.cls);
    if (norm(r.type) === j && rc !== '-' && rc === c) return r;
  }
  // 2) type dengan class "-" (berlaku semua class)
  for (i = 0; i < list.length; i++) {
    r = list[i];
    if (norm(r.type) === j && norm(r.cls) === '-') return r;
  }
  // 3) tidak ada padanan -> null (unit tidak dinilai, tidak memunculkan peringatan)
  return null;
};

/* Batas nilai indikator (default 85 untuk MA). */
window.MMJ_STD.batas = function (kode) {
  var list = window.MMJ_STD.indikator, i;
  for (i = 0; i < list.length; i++) if (list[i].kode === kode) return list[i].batas;
  return 0;
};
