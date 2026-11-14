# Heavy Equipment Monitoring Unification Design

## Intent
Menyatukan Heavy Equipment (HE) dengan struktur Monitoring agar HE memakai satu sistem sidebar, menu, permission, dan navigasi yang sama dengan Coal Hauling, Batu Split, Loss Time, dan Rainfall.

## Goals
- HE tampil sebagai bagian dari kelompok Monitoring yang sama.
- Sidebar dan menu Monitoring konsisten saat membuka semua tab, termasuk HE.
- Cost Control tetap terlihat di posisi yang sama pada semua tab yang berizin.
- Navigasi `#tab=he`, pemilih bulan HE, dan data HE/WT per bulan tetap berfungsi.
- Tidak mengubah nilai atau struktur data dashboard.

## Non-goals
- Tidak mengubah desain tabel, kartu, atau isi laporan HE.
- Tidak membuat route baru.
- Tidak mengubah permission.
- Tidak mengubah data sumber.

## Approaches
1. **Gabungkan HE ke struktur template Monitoring bersama (dipilih).**
   Satu template shell/sidebar dipakai seluruh dashboard; konten HE tetap dimuat sebagai tab Monitoring dengan data dan script HE yang ada. Ini menghilangkan perbedaan struktur HE.
2. **Pertahankan template HE terpisah, hanya samakan sidebar.**
   Perubahan lebih kecil, tetapi perbedaan struktur dan bug menu dapat muncul kembali. Ditolak karena tidak memenuhi tujuan penyatuan.

## Design
- Jadikan shell/sidebar Monitoring sebagai sumber navigasi bersama.
- Pindahkan injeksi navigasi HE ke jalur template bersama, bukan `bar_html` khusus HE.
- Pertahankan `data-mmjtab="he"` dan `data-mmj-auth="costcontrol"`.
- Pertahankan pemuatan data bulanan HE/WT melalui `srcData()` dan `mountBulan()`.
- Loader tetap melakukan `placeNav()`, `bindNav()`, `applyAuthMenus()`, dan mounting user/theme pada satu jalur yang sama.
- Generator menghasilkan satu menu Monitoring dengan urutan Cost Control, Heavy Equipment, Coal Hauling, Batu Split, Loss Time, Rainfall.

## Acceptance
- Membuka `#tab=he` menampilkan sidebar yang sama dengan tab Monitoring lain.
- Cost Control muncul pada posisi konsisten bagi user berizin.
- User tanpa permission tidak melihat Cost Control.
- Pemilih bulan HE tetap tersedia dan mengganti data HE/WT.
- Semua check build, login, dan data tetap lulus.
- Tidak ada data dashboard berubah.
