# Rihla Mate — Core Business Implementation Plan

## Ringkasan

Implementasi 3 fitur inti bisnis untuk dashboard Rihla Mate:

1. **Dashboard Settings** — ganti placeholder "Coming soon" dengan form pengaturan travel agent (nama, logo, kontak, Midtrans config, Resend API key)
2. **Dashboard Packages Create+Edit** — form CRUD lengkap untuk paket perjalanan dengan JSONB editor (itinerary, gallery, inclusions, dll)
3. **Public Booking Flow + Resend Email** — halaman booking publik + integrasi Resend untuk notifikasi email

---

## Fitur 1: Dashboard Settings Page

### Tujuan

Ganti halaman settings placeholder dengan form fungsional yang menyimpan konfigurasi travel agent via key-value settings table.

### Key Decisions

- **Form pattern**: Ikuti existing pattern — `useState` + custom `validateSettings()` function (bukan react-hook-form)
- **Settings storage**: Key-value di `settings` table. Key naming convention: `{section}.{field}` (e.g. `agency.name`, `payment.midtransServerKey`)
- **Logo upload**: String URL dulu (input teks), bukan file upload — konsisten dengan `featuredImage` di packages yang juga string

### Settings Keys yang Diperlukan

```typescript
// Agency info
"agency.name"          → string  // Nama travel agent
"agency.logo"          → string  // URL logo (input teks)
"agency.email"         → string  // Email kontak
"agency.phone"         → string  // Telepon kontak
"agency.address"       → string  // Alamat

// Payment — Midtrans
"payment.midtransServerKey"  → string
"payment.midtransClientKey"  → string
"payment.midtransMerchantId" → string

// Email — Resend
"email.resendApiKey"    → string
"email.fromAddress"     → string  // "noreply@domain.com"
"email.fromName"        → string  // "Nama Travel Agent"
```

### Files to Create/Modify

| File                                                    | Action      | Description                                                                    |
| ------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `apps/app/src/lib/trpc/routers/settings.ts`             | **CREATE**  | tRPC router: `getAll`, `getByKey`, `set` (upsert), `setBatch` (multi-key save) |
| `apps/app/src/lib/trpc/routers/_app.ts`                 | MODIFY      | Register `settingsRouter`                                                      |
| `apps/app/src/lib/utils/validation.ts`                  | MODIFY      | Add `validateSettings()` function                                              |
| `apps/app/src/app/[locale]/dashboard/settings/page.tsx` | **REWRITE** | Full settings form page dengan sections (Agency, Payment, Email)               |
| `apps/app/messages/id.json`                             | MODIFY      | Add `settings.*` i18n keys                                                     |
| `apps/app/messages/en.json`                             | MODIFY      | Add `settings.*` i18n keys                                                     |

### tRPC Router: `settings.ts`

```typescript
export const settingsRouter = createTRPCRouter({
  getAll: adminProcedure.query(async ({ ctx }) => {
    // SELECT * FROM settings → return Record<string, unknown>
  }),

  setBatch: adminProcedure
    .input(z.record(z.string(), z.unknown()))
    .mutation(async ({ ctx, input }) => {
      // For each key: INSERT ... ON CONFLICT (key) DO UPDATE
      // Gunakan ctx.db.insert(settings).values(...).onConflictDoUpdate(...)
    }),
});
```

### Settings Page Structure

```
+--------------------------------------------------+
| Header: "Pengaturan"                               |
+--------------------------------------------------+
| [Agency]                                           |
|   Name: [__________]  Logo URL: [__________]       |
|   Email: [__________]  Phone: [__________]         |
|   Address: [__________________________]            |
+--------------------------------------------------+
| [Payment - Midtrans]                               |
|   Server Key: [__________________________]         |
|   Client Key: [__________________________]         |
|   Merchant ID: [__________________________]        |
+--------------------------------------------------+
| [Email - Resend]                                   |
|   API Key: [__________________________]            |
|   From Address: [__________]                       |
|   From Name: [__________]                          |
+--------------------------------------------------+
| [Save Changes] [Reset]                             |
+--------------------------------------------------+
```

### i18n Keys to Add

```json
// id.json
"settings": {
  "title": "Pengaturan",
  "sections": {
    "agency": "Informasi Agen",
    "payment": "Pembayaran - Midtrans",
    "email": "Email - Resend"
  },
  "fields": {
    "agencyName": "Nama Agen",
    "agencyLogo": "URL Logo",
    "agencyEmail": "Email Kontak",
    "agencyPhone": "Telepon Kontak",
    "agencyAddress": "Alamat",
    "midtransServerKey": "Server Key Midtrans",
    "midtransClientKey": "Client Key Midtrans",
    "midtransMerchantId": "Merchant ID Midtrans",
    "resendApiKey": "API Key Resend",
    "fromAddress": "Alamat Pengirim",
    "fromName": "Nama Pengirim"
  },
  "saveSuccess": "Pengaturan berhasil disimpan",
  "saveError": "Gagal menyimpan pengaturan",
  "saving": "Menyimpan..."
}
```

---

## Fitur 2: Dashboard Packages Create + Edit Form

### Tujuan

Form CRUD lengkap untuk paket perjalanan — create page dan edit page dengan dukungan untuk JSONB fields (itinerary, gallery, inclusions, exclusions, availableDates).

### Key Decisions

- **Form pattern**: Ikuti existing pattern — `useState` + custom `validatePackage()` (SUDAH ADA di `validation.ts`)
- **JSONB fields**: Textarea dengan format JSON. Validasi JSON sebelum submit. Tidak perlu dynamic form builder.
- **Create & Edit**: Dua halaman terpisah mengikuti pattern bookings: `/dashboard/packages/new` dan `/dashboard/packages/[id]`
- **Image upload**: URL text input untuk `featuredImage` dan `gallery` (array of URLs) — konsisten dengan existing pattern

### Files to Create/Modify

| File                                                         | Action     | Description                                        |
| ------------------------------------------------------------ | ---------- | -------------------------------------------------- |
| `apps/app/src/app/[locale]/dashboard/packages/new/page.tsx`  | **CREATE** | Create package form                                |
| `apps/app/src/app/[locale]/dashboard/packages/[id]/page.tsx` | **CREATE** | Edit package form                                  |
| `apps/app/messages/id.json`                                  | MODIFY     | Add `packages.create*`, `packages.edit*` i18n keys |
| `apps/app/messages/en.json`                                  | MODIFY     | Add `packages.create*`, `packages.edit*` i18n keys |

> **Note**: tRPC router `packages.create` dan `packages.update` SUDAH ADA. Tidak perlu modifikasi backend.

### Package Form Structure (Create & Edit)

```
+--------------------------------------------------+
| Header: "Buat Paket Baru" / "Edit Paket"          |
+--------------------------------------------------+
| [Basic Info]                                       |
|   Title*: [__________________________]             |
|   Slug*:  [__________________________]             |
|   Description: [__________________________]        |
|                    (textarea)                       |
+--------------------------------------------------+
| [Details]                                          |
|   Duration (days)*: [___]  Category: [dropdown]    |
|   Price*: [__________]  Currency: [IDR]            |
|   Departure City: [__________]                     |
|   Status: [draft / published / archived]           |
+--------------------------------------------------+
| [Images]                                           |
|   Featured Image URL: [__________________________] |
|   Gallery (JSON array of URLs):                    |
|   [                                            ]   |
|   (textarea, default: [])                          |
+--------------------------------------------------+
| [Itinerary]                                        |
|   (JSON array textarea)                            |
|   [                                            ]   |
+--------------------------------------------------+
| [Inclusions / Exclusions]                          |
|   Inclusions (JSON array):                         |
|   [                                            ]   |
|   Exclusions (JSON array):                         |
|   [                                            ]   |
+--------------------------------------------------+
| [Available Dates]                                  |
|   (JSON array of YYYY-MM-DD strings)               |
|   [                                            ]   |
+--------------------------------------------------+
| [Save] [Cancel]                                    |
+--------------------------------------------------+
```

### Form Fields Mapping

| Field            | Type            | Required | Default    | Validation                   |
| ---------------- | --------------- | -------- | ---------- | ---------------------------- |
| `title`          | text            | yes      | —          | min 1, max 255               |
| `slug`           | text            | yes      | —          | `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `description`    | textarea        | no       | —          | —                            |
| `durationDays`   | number          | yes      | 1          | min 1                        |
| `price`          | text            | yes      | —          | `^\d+(\.\d{1,2})?$`          |
| `currency`       | text            | no       | "IDR"      | length 3                     |
| `departureCity`  | text            | no       | —          | max 100                      |
| `category`       | select          | no       | "standard" | —                            |
| `status`         | select          | no       | "draft"    | —                            |
| `featuredImage`  | text (URL)      | no       | —          | —                            |
| `gallery`        | textarea (JSON) | no       | "[]"       | valid JSON array             |
| `itinerary`      | textarea (JSON) | no       | "[]"       | valid JSON array             |
| `inclusions`     | textarea (JSON) | no       | "[]"       | valid JSON array             |
| `exclusions`     | textarea (JSON) | no       | "[]"       | valid JSON array             |
| `availableDates` | textarea (JSON) | no       | "[]"       | valid JSON array             |

### i18n Keys to Add

```json
// id.json — tambahan di bawah packages.* yang sudah ada
"packages": {
  // ... existing keys ...
  "createTitle": "Buat Paket Baru",
  "editTitle": "Edit Paket",
  "createSuccess": "Paket berhasil dibuat",
  "updateSuccess": "Paket berhasil diperbarui",
  "saving": "Menyimpan...",
  "fields": {
    "section": {
      "basic": "Informasi Dasar",
      "details": "Detail",
      "images": "Gambar",
      "itinerary": "Itinerary",
      "inclusionsExclusions": "Fasilitas",
      "dates": "Tanggal Tersedia"
    },
    "title": "Judul",
    "slug": "Slug",
    "description": "Deskripsi",
    "durationDays": "Durasi (hari)",
    "price": "Harga",
    "currency": "Mata Uang",
    "departureCity": "Kota Keberangkatan",
    "category": "Kategori",
    "status": "Status",
    "featuredImage": "URL Gambar Utama",
    "gallery": "Galeri (JSON)",
    "itinerary": "Itinerary (JSON)",
    "inclusions": "Termasuk (JSON)",
    "exclusions": "Tidak Termasuk (JSON)",
    "availableDates": "Tanggal Tersedia (JSON)"
  },
  "validation": {
    "titleRequired": "Judul wajib diisi",
    "slugRequired": "Slug wajib diisi",
    "slugInvalid": "Format slug tidak valid",
    "priceRequired": "Harga wajib diisi",
    "priceInvalid": "Format harga tidak valid",
    "durationMin": "Durasi minimal 1 hari",
    "jsonInvalid": "Format JSON tidak valid"
  },
  "selectCategory": "Pilih kategori",
  "selectStatus": "Pilih status",
  "categories": {
    "standard": "Standard",
    "vip": "VIP",
    "economy": "Economy"
  },
  "statuses": {
    "draft": "Draft",
    "published": "Published",
    "archived": "Archived"
  },
  "backToList": "Kembali ke daftar"
}
```

---

## Fitur 3: Public Booking Flow + Resend Email

### Tujuan

Halaman booking yang bisa diakses publik (tanpa login) + integrasi Resend untuk email notifikasi setelah booking dibuat.

### Arsitektur

```
┌─────────────────────────────────────────────────────┐
│ Public Booking Page                                  │
│ /book/{packageSlug}                                  │
│                                                      │
│ 1. Customer isi form (nama, email, telp, tanggal)   │
│ 2. Submit → tRPC public.bookings.create              │
│ 3. Redirect ke payment page → Snap popup             │
│ 4. Webhook Midtrans → update status                  │
│ 5. Email notifikasi via Resend (opsional)            │
└─────────────────────────────────────────────────────┘
```

### Key Decisions

- **tRPC procedures**: Buat `publicProcedure` baru untuk `bookings.create` (public) dan `midtrans.createTransaction` (public)
- **Rate limiting**: Pakai `strictRateLimit` (5 req/menit) untuk public endpoints
- **Resend**: Integrasi dari nol — kirim email konfirmasi setelah booking dibuat
- **Public booking page**: `/book/[slug]` — halaman publik yang menampilkan detail paket + form booking
- **No auth required**: Public procedure tidak butuh session

### Files to Create/Modify

| File                                                      | Action     | Description                                             |
| --------------------------------------------------------- | ---------- | ------------------------------------------------------- |
| `apps/app/src/lib/trpc/routers/public-bookings.ts`        | **CREATE** | Public tRPC procedures: `create`, `getPackageBySlug`    |
| `apps/app/src/lib/trpc/routers/public-midtrans.ts`        | **CREATE** | Public Midtrans: `createTransaction` (no auth)          |
| `apps/app/src/lib/trpc/routers/_app.ts`                   | MODIFY     | Register `publicBookingsRouter`, `publicMidtransRouter` |
| `apps/app/src/lib/email/resend.ts`                        | **CREATE** | Resend client + `sendBookingConfirmation()` function    |
| `apps/app/src/app/[locale]/book/[slug]/page.tsx`          | **CREATE** | Public booking page                                     |
| `apps/app/src/app/[locale]/book/[slug]/success/page.tsx`  | **CREATE** | Success page after payment                              |
| `apps/app/src/components/booking/public-booking-form.tsx` | **CREATE** | Reusable public booking form component                  |
| `apps/app/messages/id.json`                               | MODIFY     | Add `publicBooking.*` i18n keys                         |
| `apps/app/messages/en.json`                               | MODIFY     | Add `publicBooking.*` i18n keys                         |

### tRPC Router: `public-bookings.ts`

```typescript
export const publicBookingsRouter = createTRPCRouter({
  getPackageBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .use(strictRateLimit as AppMiddleware)
    .query(async ({ ctx, input }) => {
      // SELECT from packages WHERE slug = input.slug AND status = 'published'
      // Return: title, description, price, durationDays, itinerary, inclusions,
      //         exclusions, availableDates, featuredImage, gallery, departureCity
      // HIDE: internal fields (id is needed for booking, but expose minimally)
      // THROW 404 if not found or not published
    }),

  create: publicProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        customerName: z.string().min(1).max(255),
        customerEmail: z.string().email(),
        customerPhone: z.string().max(50).optional(),
        travelers: z.number().int().min(1).default(1),
      }),
    )
    .use(strictRateLimit as AppMiddleware)
    .mutation(async ({ ctx, input }) => {
      // 1. Validate package exists & is published
      // 2. Validate departure date is in availableDates
      // 3. Calculate totalPrice = package.price * input.travelers
      // 4. Create booking with status "pending"
      // 5. Send email confirmation via Resend (fire-and-forget, jangan block)
      // 6. Return booking ID + Midtrans-ready data
    }),
});
```

### tRPC Router: `public-midtrans.ts`

```typescript
export const publicMidtransRouter = createTRPCRouter({
  createTransaction: publicProcedure
    .input(z.object({ bookingId: z.string().uuid() }))
    .use(strictRateLimit as AppMiddleware)
    .mutation(async ({ ctx, input }) => {
      // SAMA persis dengan midtrans.createTransaction yang existing
      // tapi tanpa auth check (publicProcedure, bukan protectedProcedure)
    }),
});
```

### Resend Integration: `lib/email/resend.ts`

```typescript
import { Resend } from "resend";

// Lazy init — only if API key is configured
function getResend(): Resend | null {
  const apiKey = await getSetting("email.resendApiKey");
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendBookingConfirmation(booking: {
  customerName: string;
  customerEmail: string;
  packageTitle: string;
  departureDate: string;
  travelers: number;
  totalPrice: string;
  bookingId: string;
}) {
  const resend = await getResend();
  if (!resend) return; // Silent fail — email is optional

  const fromAddress = (await getSetting("email.fromAddress")) || "noreply@rihla-mate.com";
  const fromName = (await getSetting("email.fromName")) || "Rihla Mate";

  await resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to: booking.customerEmail,
    subject: `Booking Confirmed — ${booking.packageTitle}`,
    html: `...template HTML...`,
  });
}
```

### Public Booking Page Structure

```
/book/[slug]
+--------------------------------------------------+
| Package Detail (read-only)                         |
|   Title, description, price, duration, itinerary   |
|   Featured image, inclusions/exclusions            |
+--------------------------------------------------+
| Booking Form                                       |
|   Name*: [__________]                              |
|   Email*: [__________]                             |
|   Phone: [__________]                              |
|   Travelers*: [___]                                |
|   Departure Date*: [date picker / calendar]        |
|                                                    |
|   Total: Rp X.XXX.XXX (calculated)                 |
+--------------------------------------------------+
| [Book Now → Pay with Midtrans]                     |
+--------------------------------------------------+
```

### Public Booking Flow (Detail)

```
1. User buka /book/{slug}
2. GET publicBookings.getPackageBySlug({ slug })
   → tampilkan detail paket
3. User isi form + pilih tanggal (dari availableDates)
4. Submit → POST publicBookings.create({ packageId, departureDate, ... })
   → validasi, kalkulasi harga, create booking
   → fire-and-forget: sendBookingConfirmation()
   → return { bookingId, totalPrice }
5. Client dapat bookingId → POST publicMidtrans.createTransaction({ bookingId })
   → dapat Snap token
6. window.snap.pay(token) → Midtrans popup
7. On success → redirect ke /book/{slug}/success
8. Webhook Midtrans → update booking status (SUDAH ADA)
```

### i18n Keys to Add

```json
// id.json
"publicBooking": {
  "title": "Pesan {package}",
  "packageDetail": "Detail Paket",
  "bookingForm": "Form Pemesanan",
  "fields": {
    "customerName": "Nama Lengkap",
    "customerEmail": "Email",
    "customerPhone": "Telepon",
    "travelers": "Jumlah Peserta",
    "departureDate": "Tanggal Keberangkatan"
  },
  "totalPrice": "Total Harga",
  "perPerson": "/orang",
  "submit": "Pesan Sekarang",
  "submitting": "Memproses...",
  "success": {
    "title": "Pemesanan Berhasil!",
    "message": "Terima kasih, {name}. Pemesanan Anda untuk {package} pada {date} telah diterima.",
    "emailSent": "Email konfirmasi telah dikirim ke {email}.",
    "bookingId": "ID Pemesanan: {id}",
    "backToHome": "Kembali ke Beranda"
  },
  "errors": {
    "packageNotFound": "Paket tidak ditemukan",
    "dateNotAvailable": "Tanggal tidak tersedia",
    "createFailed": "Gagal membuat pemesanan"
  }
}
```

---

## Urutan Implementasi (Rekomendasi)

### Phase 1: Dashboard Settings (≈3-4 task units)

1. Create `settings.ts` tRPC router (`getAll`, `setBatch`)
2. Add `validateSettings()` to `validation.ts`
3. Register router in `_app.ts`
4. Rewrite `settings/page.tsx` dengan full form
5. Add i18n keys (ID + EN)

### Phase 2: Dashboard Packages Create+Edit (≈4-5 task units)

1. Create `packages/new/page.tsx` — create form
2. Create `packages/[id]/page.tsx` — edit form (pre-fill dari `getById`)
3. Add i18n keys (ID + EN)

### Phase 3: Public Booking + Resend (≈5-6 task units)

1. Create `public-bookings.ts` tRPC router
2. Create `public-midtrans.ts` tRPC router
3. Register both in `_app.ts`
4. Create `lib/email/resend.ts`
5. Create `components/booking/public-booking-form.tsx`
6. Create `book/[slug]/page.tsx`
7. Create `book/[slug]/success/page.tsx`
8. Add i18n keys (ID + EN)

---

## Constraints & Notes

1. **Form pattern**: SELALU ikuti existing pattern — `useState` + custom validation, bukan react-hook-form
2. **shadcn/ui components tersedia**: `input`, `textarea`, `select`, `button`, `calendar`, `popover`
3. **JSONB fields**: Dikirim sebagai STRING ke tRPC, diparse di server (`parseJsonField()`)
4. **Rate limiting**: `strictRateLimit` untuk public endpoints, tidak perlu untuk admin
5. **Email fire-and-forget**: Jangan block response booking untuk nunggu email terkirim
6. **Midtrans Snap**: Gunakan `SnapPayment` component yang sudah ada di `components/payment/snap-payment.tsx`
7. **i18n**: Semua string HARUS pakai `useTranslations()`, tidak boleh hardcoded
8. **testid attributes**: Tambahkan `data-testid` untuk form fields (mengikuti pattern existing)
9. **No `as any`, `@ts-ignore`, `@ts-expect-error`**: TypeScript strict
10. **Resend dependency**: Perlu install `resend` npm package (`pnpm add resend`)
