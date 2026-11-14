# Cost Control Separate Tab Design

## Intent
Jadikan Cost Control sebagai halaman/tab dashboard terpisah seperti Heavy Equipment, Coal Hauling, Batu Split, Loss Time, dan Rainfall.

## Goals
- Menu Cost Control membuka tab `#tab=cost`.
- Cost Control memakai sidebar, tema, login, dan navigasi bersama.
- Halaman memiliki konten sementara lorem ipsum.
- Menu dan halaman hanya terlihat untuk user dengan permission `costcontrol`.
- HE dan dashboard lain tetap tidak berubah.

## Non-goals
- Tidak membuat file HTML standalone.
- Tidak mengubah data HE/WT, Coal Hauling, Batu Split, Loss Time, atau Rainfall.
- Tidak membuat backend atau sumber data baru.
- Tidak mengubah permission yang sudah ada.

## Approaches
1. **Tab dashboard baru dalam shell bersama (dipilih).**
   Tambahkan template `mmjT_cost`, daftarkan `cost` di loader, dan arahkan menu ke `#tab=cost`. Ini menjaga sidebar, tema, login, dan permission tetap satu sistem.
2. **File HTML standalone.**
   Ditolak karena membuat shell, auth, dan tema terpisah serta rawan tidak sinkron.

## Design
- Ubah anchor menu dari `href="#ex-cost"` menjadi `href="#tab=cost"` dengan `data-mmjtab="cost"` dan `data-mmj-auth="costcontrol"`.
- Tambahkan template Cost Control yang memakai struktur shell Monitoring bersama.
- Isi tab dengan kartu sementara Total Cost, Cost / Ton, Operational Cost, dan tabel lorem ipsum.
- Daftarkan `cost` di `T`, validasi hash, fallback, dan binding navigasi pada `shell_loader.js` atau generator patch yang berlaku.
- Hapus section `#ex-cost` dari template Executive dan HE agar tidak ada duplikasi.
- Permission check tetap memakai `applyAuthMenus()` dan guard pada konten tab.

## Acceptance
- User berizin melihat Cost Control sebagai menu tab terpisah.
- Klik menu membuka `#tab=cost`, bukan section halaman lain.
- Tab Cost Control menampilkan konten sementara lorem ipsum.
- User tanpa izin tidak melihat menu dan tidak dapat membuka konten Cost Control.
- Sidebar dan tema konsisten dengan tab lain.
- Semua check build, login, dan data tetap lulus.
