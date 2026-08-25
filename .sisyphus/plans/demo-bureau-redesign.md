# Rencana Redesign Situs Biro — demo.rihla.my.id

**Tanggal:** 2026-08-25  
**Demo live:** https://demo.rihla.my.id/  
**Brand seed:** Safwah Haramain (`bookingPrefix` SFH, kantor Senen)  
**Status:** rencana saja — **jangan implementasi** sampai diminta eksplisit.

---

## 1. Tujuan

Membuat landing + katalog biro terasa seperti **situs travel Umrah Indonesia**, bukan shell marketing SaaS. Demo harus meyakinkan calon customer Rihla Mate: “ini yang jamaah lihat.”

**Bukan tujuan:** menyalin pixel-perfect Alhijaz/Rahmah; menambah multi-tenant; mengubah dashboard staf.

---

## 2. Inventaris halaman demo (sekarang)

| Rute               | Komponen                                | Isi aktual (live)                                                                              |
| ------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `/`                | `bureau-landing.tsx`                    | Hero CMS + CTA “Lihat paket” + grid 3 paket + “Cara daftar” 1 paragraf + “Ada pertanyaan?”     |
| `/packages`        | **sama** `BureauLanding` tanpa CMS home | Duplikat home; filter kategori menampilkan **kunci i18n mentah** (`packages.category.economy`) |
| `/packages/[slug]` | `package-detail-view.tsx`               | Detail + booking                                                                               |
| `/[slug]` CMS      | `bureau-cms-page.tsx`                   | Judul + body `pre-wrap` — tidak di nav                                                         |
| `/sign-in`         | auth                                    | “Masuk staf” (i18n sudah benar pasca #132)                                                     |

**Nav biro** (`marketing-header.tsx`): Paket · Cara daftar (`/#how`) · Kontak (`/#contact`) · locale · Masuk staf.

**Footer:** copyright + link yang sama. Tidak ada WA, alamat, izin Kemenag, jam kantor.

**CMS homepage:** `cmsTitle` / `cmsBody` mengisi H1 + lead saja. Section how/contact **hardcoded i18n**, bukan blok CMS.

---

## 3. Pola situs biro Umrah (riset)

Sumber: [Rahmah Travel](https://rahmahtravel.id/), [Alhijaz Indowisata](https://alhijazindonesia.com/), portofolio Vardana “Landing Page — Biro Umroh & Haji”, pola umum Bismillah Umroh / PPIU.

### IA yang berulang

1. **Kepercayaan di atas fold:** logo Kemenag, nomor PPIU/PIHK, akreditasi, “travel resmi”.
2. **Hero visual** (foto Ka’bah / jamaah) + 1–2 CTA: **WhatsApp** + Lihat paket (bukan “Masuk staf”).
3. **Kartu produk cepat:** Haji Plus / Umrah 9–15 hari / Badal — harga “mulai”, durasi, hotel bintang, maskapai.
4. **Katalog + jadwal keberangkatan** (bulan/tahun, kuota, embarkasi) — bukan hanya 3 kartu statis.
5. **Mengapa kami:** hotel ring-1, direct flight, mutawwif, manasik, headset, gedung sendiri.
6. **Galeri + testimoni** (foto, bukan placeholder SaaS).
7. **Legalitas + rekening** (nama PT, NIB, rekening a/n badan).
8. **Kontak nyata:** alamat kantor, peta, jam, **FAB WhatsApp**.
9. **Nav dalam:** Paket, Jadwal, Profil/Tentang, Cabang, Visa, Portal jamaah (opsional), Blog.

Rahmah: nav Paket, jadwal 2026–2027, cabang, visa mandiri, loyalty, portal jamaah, WA.  
Alhijaz: Home / Haji Plus / Paket Umroh / Profil; trust Kemenag; WA di setiap blok; why-us 9 poin; galeri; testimoni; legalitas + rekening.

Vardana (agency) **bukan** referensi IA biro — hanya contoh section density (hero → trust → layanan → proses → testimoni → CTA WA).

---

## 4. Gap (demo vs pola)

| Pola industri                           | Demo Safwah                                          | Severity   |
| --------------------------------------- | ---------------------------------------------------- | ---------- |
| Trust PPIU / Kemenag di hero            | Tidak ada                                            | P1         |
| Foto / visual suci                      | Tipografi + `bg-muted` saja                          | P1         |
| CTA WhatsApp sticky                     | Hanya “hubungi staf” teks                            | P1         |
| Nav: Profil, Jadwal, Tentang            | Hanya Paket / Cara daftar / Kontak                   | P1         |
| How-to = 3–5 langkah bernomor           | Satu kalimat                                         | P1         |
| Kontak = alamat Senen + jam + peta      | Satu baris muted                                     | P1         |
| Why-us / fasilitas                      | Tidak ada                                            | P2         |
| Galeri / testimoni                      | Tidak ada                                            | P2         |
| Filter kategori i18n                    | Key mentah di `/` dan `/packages`                    | **P0-BUG** |
| `/packages` ≠ duplikat home             | `PackagesIndexPage` render `BureauLanding` tanpa CMS | P1         |
| Halaman CMS (profil, syarat) di nav     | Ada rute, tidak terhubung                            | P2         |
| Staff sign-in menonjol di header        | Setara CTA jamaah                                    | P2         |
| Duplikat nav (header + footer + mobile) | Terasa “app chrome”                                  | P2         |

---

## 5. Arah desain (bukan mock pixel)

**Tone:** tenang, terpercaya, Islami-kontemporer — hijau/emas tertahan, whitespace, **bukan** landing SaaS feature-grid.

**Prinsip:**

- Jamaah dulu: CTA primer = paket atau WA; “Masuk staf” di footer atau menu sekunder.
- Satu home yang **panjang cukup** (6–8 section), katalog di `/packages` **berbeda** (filter, jadwal, tidak mengulang hero CMS penuh).
- CMS mengisi copy/trust/kontak; jangan hardcode nomor izin di komponen jika bisa page/settings.
- `ogImage` tetap URL `http`/`https` saja.
- i18n: setiap label kategori harus punya key; jangan render `packages.category.*` mentah.

---

## 6. IA target (fase)

### Fase A — perbaikan konversi & bug (1 PR)

- Perbaiki i18n kategori paket (P0).
- `/packages`: judul “Paket Umrah”, grid + filter; **jangan** clone hero homepage.
- Section `#how`: 3 langkah (pilih paket → data jamaah → DP) dengan nomor.
- Section `#contact`: alamat Senen, email `halo@demo.rihla.my.id`, jam; link WA (nomor dari settings/CMS, bukan hardcode di banyak file).
- Header: turunkan visual weight “Masuk staf”; CTA “Konsultasi” / WA.

### Fase B — trust & cerita (1 PR)

- Strip trust: placeholder “PPIU (demo)” + 3 bullet (walking distance, mutawwif ID, kuota diumumkan).
- Why-us 4–6 kartu (bisa CMS blocks atau seed JSON).
- Nav + seed: tautkan halaman CMS `profil` / `syarat-ketentuan` jika sudah di-seed.

### Fase C — visual & sosial bukti (1 PR, butuh aset)

- Hero image (lisensi jelas; jangan scrape).
- Galeri + 2–3 testimoni seed (upsert, tanpa wipe booking).
- FAB WhatsApp (aksesibilitas: tidak tutup CTA mobile lain).

### Fase D — katalog “jadwal” (opsional, lebih dalam)

- Filter embarkasi / durasi / bulan; field `departureDate` jika belum ada di schema.
- Jangan scope-creep booking engine di PR visual.

**Satu concern = satu PR.** Jangan gabung P0 i18n dengan hero image.

---

## 7. File yang akan tersentuh (saat implementasi nanti)

- `apps/app/src/app/[locale]/bureau-landing.tsx` — section home
- `apps/app/src/app/[locale]/packages/page.tsx` — pisah dari `BureauLanding`
- `apps/app/src/app/[locale]/bureau-package-grid.tsx` — kategori i18n
- `apps/app/src/components/marketing/marketing-header.tsx` / `marketing-footer.tsx` / `marketing-mobile-nav.tsx`
- `apps/app/src/lib/site-mode.ts` + messages ID/EN/AR
- `apps/app/src/lib/db/seed-demo-content.ts` — copy trust, halaman CMS, WA (upsert)
- `apps/app/src/app/[locale]/bureau-cms-page.tsx` — tipografi artikel (prose), bukan marketing lead raksasa

Tidak mengubah: license server, Midtrans, dashboard kecuali settings kontak jika sudah ada field.

---

## 8. Kriteria sukses demo

- Home: hero + trust + paket + how (langkah) + kontak (alamat) tanpa key i18n mentah.
- `/packages` tidak identik dengan `/`.
- WA atau “hubungi kantor” terlihat tanpa scroll di mobile (header atau FAB — pilih satu di implementasi).
- Staff login tetap ada, tidak mendominasi.
- Seed berulang aman (update or create).
- Lab: curl/SSH dari host ini saja; tidak Playwright CI ke VPS.

---

## 9. Out of scope

- Portal jamaah, Rahmah Miles, visa mandiri, multi-cabang (bisa halaman CMS statis nanti).
- Menyalin rekening bank Alhijaz.
- Screenshot PNG di git; `HANDOFF.md`; secret.
- Menunggu CI setelah push.

---

## 10. Handoff

- [x] Riset struktur demo vs Alhijaz / Rahmah / pola Vardana-umrah
- [x] Rencana di `.sisyphus/plans/demo-bureau-redesign.md`
- [ ] Implementasi: **tunggu perintah user** (mulai Fase A / P0 kategori)
- [ ] Visual QA satu halaman (max 1 visual agent) setelah ada UI

**Next jika user setuju:** PR `fix/bureau-package-category-i18n` dulu, lalu `feat/bureau-packages-index-distinct`.
