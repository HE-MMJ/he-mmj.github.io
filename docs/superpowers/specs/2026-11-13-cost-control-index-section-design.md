# Cost Control Index Section Design

## Intent
Gabungkan Cost Control langsung ke `index.html` sebagai section Monitoring, seperti struktur HE, Coal Hauling, Batu Split, Loss Time, dan Rainfall.

## Goals
- Menu Cost Control memakai `href="#ex-cost"`.
- Section Cost Control berada di `index.html` gabungan.
- Cost Control tersedia saat shell dashboard aktif, termasuk HE.
- Konten sementara lorem ipsum tetap tampil.
- Permission `data-mmj-auth="costcontrol"` tetap melindungi menu dan konten.

## Non-goals
- Tidak memakai `#tab=cost`.
- Tidak membuat template `mmjT_cost`.
- Tidak membuat file HTML baru.
- Tidak mengubah data dashboard lain.

## Approach
Gunakan section Cost Control yang ditempatkan di template shell bersama, lalu pastikan loader mempertahankan section saat berpindah dashboard. Menu Cost Control tetap di sidebar Monitoring dan diarahkan ke `#ex-cost`. Template HE ikut menerima section melalui generator yang sama.

## Acceptance
- Tidak ada `href="#tab=cost"` atau template `mmjT_cost`.
- Ada menu `href="#ex-cost"` dengan permission `costcontrol`.
- Ada satu section `id="ex-cost"` pada struktur gabungan.
- Klik Cost Control membuka section di `index.html` aktif.
- Konten lorem ipsum terlihat bagi user berizin.
- User tanpa izin tidak melihat menu/konten.
- Build, login, browser data, dan data equality checks lulus.
