# Dokumentasi Sistem Lisensi Rihla Mate

Dokumen ini menjelaskan arsitektur dan mekanisme sistem lisensi Rihla Mate. Ditujukan untuk tim internal dan administrator teknis.

---

## Daftar Isi

1. [Overview](#overview)
2. [Format License Key](#format-license-key)
3. [Ed25519 Signing](#ed25519-signing)
4. [Trial Mode](#trial-mode)
5. [License Plans](#license-plans)
6. [Activation Flow](#activation-flow)
7. [Check-in Mechanism](#check-in-mechanism)
8. [Grace Period](#grace-period)
9. [License States](#license-states)
10. [Renewal dan Upgrade](#renewal-dan-upgrade)
11. [Security Considerations](#security-considerations)
12. [FAQ](#faq)

---

## Overview

Rihla Mate menggunakan model self-hosted dengan license enforcement. Setiap travel agent men-deploy aplikasi di server mereka sendiri, dan sistem lisensi mengontrol akses fitur.

### Karakteristik Utama

- **Offline-first verification**: Verifikasi signature dilakukan secara offline menggunakan Ed25519
- **Online activation**: Binding domain dan tracking aktivasi dilakukan online
- **Grace period**: 7 hari setelah expired sebelum fitur premium dinonaktifkan
- **Trial mode**: 14 hari full features tanpa license key

### Komponen Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                     LICENSE SYSTEM                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────────┐ │
│  │  License Server      │      │  App Instance            │ │
│  │  (Rihla Mate host)   │◄─────│  (Travel Agent server)   │ │
│  │                      │      │                          │ │
│  │  - REST API          │      │  - License module        │ │
│  │  - Activation DB     │      │  - Offline verification  │ │
│  │  - Rate limiting     │      │  - File-based state      │ │
│  └──────────────────────┘      └──────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Format License Key

License key menggunakan format base64url-encoded dengan signature Ed25519.

### Struktur

```
RML1.<base64url(payload)>.<base64url(signature)>
```

### Contoh

```
RML1.eyJsaWNlbnNlSWQiOiJsaWNfYWJjMTIzIiwiY3VzdG9tZXJJZCI6ImN1c3RfeHl6IiwicGxhbiI6InBybyJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Payload Structure

Payload berisi informasi lisensi dalam format JSON:

```json
{
  "licenseId": "lic_abc123",
  "customerId": "cust_xyz",
  "customerName": "PT Amanah Travel",
  "plan": "pro",
  "features": [
    "multi_tenant",
    "custom_domain",
    "white_label",
    "seo",
    "analytics"
  ],
  "maxTenants": 5,
  "maxMonthlyBookings": 500,
  "expiresAt": "2027-01-01T00:00:00Z",
  "gracePeriodDays": 7,
  "isTrial": false,
  "trialDays": 14,
  "apiUrl": "https://license.rihla-mate.com/api/v1"
}
```

### Field Descriptions

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `licenseId` | string | ID unik lisensi |
| `customerId` | string | ID customer di sistem |
| `customerName` | string | Nama perusahaan/agency |
| `plan` | string | Jenis plan: `starter`, `pro`, `enterprise` |
| `features` | array | Daftar fitur yang diaktifkan |
| `maxTenants` | number | Maksimum tenant untuk multi-tenant |
| `maxMonthlyBookings` | number | Limit booking per bulan |
| `expiresAt` | string | Tanggal expired dalam ISO 8601 |
| `gracePeriodDays` | number | Durasi grace period setelah expired |
| `isTrial` | boolean | Apakah ini trial license |
| `trialDays` | number | Durasi trial dalam hari |
| `apiUrl` | string | URL license server untuk check-in |

---

## Ed25519 Signing

Sistem menggunakan Ed25519 untuk verifikasi offline license key.

### Cara Kerja

1. **Key Generation**: Rihla Mate membuat satu key pair Ed25519
2. **Private Key**: Disimpan aman di license server, digunakan untuk signing
3. **Public Key**: Embedded di aplikasi, digunakan untuk verification
4. **Same Library**: App dan license server menggunakan `@noble/ed25519`

### Keuntungan Ed25519

- **Fast**: Verifikasi sangat cepat
- **Small**: Signature hanya 64 bytes
- **Secure**: Standar industri untuk digital signature
- **Offline**: Verifikasi tidak memerlukan koneksi ke server

### Flow Verifikasi

```
1. License key diterima
2. Parse menjadi payload dan signature
3. Verify signature menggunakan public key
4. Jika valid → parse payload
5. Cek expiresAt timestamp
6. Cek plan dan features
```

### Contoh Code Verification

```typescript
import { verify } from '@noble/ed25519';

async function verifyLicenseKey(
  licenseKey: string,
  publicKey: Uint8Array
): Promise<LicensePayload | null> {
  const parts = licenseKey.split('.');
  if (parts.length !== 3 || parts[0] !== 'RML1') {
    return null;
  }

  const payloadBytes = base64urlToBytes(parts[1]);
  const signatureBytes = base64urlToBytes(parts[2]);

  const isValid = await verify(signatureBytes, payloadBytes, publicKey);
  if (!isValid) {
    return null;
  }

  const payload = JSON.parse(bytesToString(payloadBytes));
  return payload;
}
```

---

## Trial Mode

Trial mode memungkinkan calon customer mencoba aplikasi tanpa license key.

### Karakteristik Trial

- **Durasi**: 14 hari
- **Features**: Akses penuh ke semua fitur
- **Activation**: Otomatis saat pertama kali install
- **Binding**: Terikat ke instance ID (hardware hash)

### Instance ID Binding

Instance ID adalah hash dari:
- MAC address
- Hostname
- Machine ID

Binding ini mencegah trial di-clone ke server lain.

### Trial State

Disimpan di file `.rihla-mate/license.json`:

```json
{
  "mode": "trial",
  "instanceId": "inst_abc123",
  "startedAt": "2026-06-24T00:00:00Z",
  "expiresAt": "2026-07-08T00:00:00Z"
}
```

### Setelah Trial Expired

- Landing page tetap aktif (read-only)
- Dashboard admin terkunci
- User diminta untuk memasukkan license key

---

## License Plans

Tiga tier lisensi tersedia dengan fitur berbeda.

### Starter

| Fitur | Value |
|-------|-------|
| Landing page templates | 1 template |
| Custom domain | Ya |
| Multi-tenant | Tidak |
| Max bookings/bulan | 50 |
| Storage | Local filesystem |
| Analytics | Basic |
| Support | Email |

### Pro

| Fitur | Value |
|-------|-------|
| Landing page templates | 3 template |
| Custom domain | Ya |
| Multi-tenant | Ya, max 5 tenant |
| Max bookings/bulan | 500 |
| Storage | Local + S3 option |
| Analytics | Advanced |
| Support | Email + Chat |

### Enterprise

| Fitur | Value |
|-------|-------|
| Landing page templates | Unlimited |
| Custom domain | Ya |
| Multi-tenant | Unlimited |
| Max bookings/bulan | Unlimited |
| Storage | Local + S3 |
| Analytics | Full + Custom reports |
| Support | Priority + Phone |

### Feature Flags

Setiap plan memiliki kombinasi feature flags:

```typescript
const PLAN_FEATURES = {
  starter: ['landing_page', 'custom_domain', 'basic_analytics'],
  pro: [
    'landing_page',
    'custom_domain',
    'white_label',
    'seo',
    'analytics',
    'multi_tenant'
  ],
  enterprise: [
    'landing_page',
    'custom_domain',
    'white_label',
    'seo',
    'analytics',
    'multi_tenant',
    'priority_support',
    'custom_templates',
    'api_access'
  ]
};
```

---

## Activation Flow

Proses aktivasi license key secara detail.

### Step 1: Input License Key

User memasukkan license key di installer wizard (`/activate`).

### Step 2: Offline Verification

Aplikasi memverifikasi signature Ed25519 secara lokal. Ini memastikan license key tidak di-tamper.

```
License Key → Parse → Verify Signature → Valid/Invalid
```

Jika invalid, aktivasi ditolak dengan pesan error.

### Step 3: Online Activation

Jika offline verification sukses, aplikasi mengirim request ke license server:

```http
POST /api/v1/activate HTTP/1.1
Host: license.rihla-mate.com
Content-Type: application/json
X-API-Key: <internal-api-key>

{
  "licenseId": "lic_abc123",
  "instanceId": "inst_xyz",
  "domain": "travelanda.com",
  "ipAddress": "103.xxx.xxx.xxx"
}
```

### Step 4: Server-side Validation

License server melakukan:
- Cek apakah license exists dan aktif
- Cek apakah license sudah di-activate di instance lain
- Jika sudah, cek apakah domain sama (re-activation allowed)
- Jika instance berbeda, tolak dengan error `LICENSE_ALREADY_USED`

### Step 5: Domain Binding

Jika valid, server menyimpan binding:

```json
{
  "licenseId": "lic_abc123",
  "instanceId": "inst_xyz",
  "domain": "travelanda.com",
  "activatedAt": "2026-06-24T10:00:00Z",
  "lastCheckinAt": "2026-06-24T10:00:00Z"
}
```

### Step 6: Response

Server mengembalikan status aktivasi:

```json
{
  "status": "success",
  "license": {
    "licenseId": "lic_abc123",
    "plan": "pro",
    "features": ["multi_tenant", "custom_domain", "..."],
    "expiresAt": "2027-01-01T00:00:00Z"
  },
  "message": "License activated successfully"
}
```

### Error Scenarios

| Error Code | Deskripsi |
|------------|-----------|
| `INVALID_LICENSE` | License key tidak valid atau corrupted |
| `LICENSE_EXPIRED` | License sudah expired |
| `LICENSE_REVOKED` | License telah di-revoke |
| `LICENSE_ALREADY_USED` | License sudah di-activate di instance lain |
| `ACTIVATION_LIMIT` | Batas aktivasi tercapai (untuk plan tertentu) |
| `SERVER_ERROR` | Error di license server |

---

## Check-in Mechanism

Aplikasi melakukan check-in periodik ke license server.

### Frekuensi

- **Interval**: Setiap 24 jam
- **Implementation**: Next.js `instrumentation.ts` dengan scheduler
- **Retry**: 3x dengan exponential backoff jika gagal

### Check-in Request

```http
POST /api/v1/checkin HTTP/1.1
Host: license.rihla-mate.com
Content-Type: application/json
X-API-Key: <internal-api-key>

{
  "licenseId": "lic_abc123",
  "instanceId": "inst_xyz",
  "domain": "travelanda.com",
  "version": "1.0.0",
  "timestamp": "2026-06-24T10:00:00Z"
}
```

### Check-in Response

Server mengembalikan status terbaru:

```json
{
  "status": "active",
  "expiresAt": "2027-01-01T00:00:00Z",
  "features": ["multi_tenant", "custom_domain", "..."],
  "plan": "pro"
}
```

### Jika Check-in Gagal

1. **Network error**: Retry 3x dengan backoff
2. **Setelah retry gagal**: Tandai sebagai `checkin_failed`
3. **Grace period**: 7 hari untuk memperbaiki
4. **Setelah grace period**: Degrade ke starter features

### Failsafe

Jika license server tidak bisa diakses dalam waktu lama:
- Aplikasi tetap berjalan dengan status terakhir yang tersimpan
- Tidak ada pemblokiran drastis (filosofi uptime first)
- Log warning untuk administrator

---

## Grace Period

Grace period memberikan buffer waktu setelah license expired.

### Durasi

- **Default**: 7 hari setelah expired
- **Konfigurasi**: Bisa di-set per license di payload

### Perilaku Grace Period

| Hari | Status | Fitur |
|------|--------|-------|
| 0-7 | `grace_period` | Semua fitur tetap aktif |
| 8+ | `expired` | Hanya starter features |

### Notifikasi

Selama grace period:
- Banner warning di dashboard admin
- Email notifikasi ke admin
- Check-in response menyertakan `daysRemaining`

---

## License States

State lisensi menentukan perilaku aplikasi.

### State Diagram

```
┌─────────┐    activate     ┌─────────┐
│  trial  │─────────────────►│  active │
└─────────┘                  └────┬────┘
     │                            │
     │ expired                    │ expired
     │                            │
     ▼                            ▼
┌─────────┐               ┌──────────────┐
│ expired │◄──────────────│ grace_period │
└─────────┘  7 days       └──────────────┘
     ▲                            │
     │                            │ revoke
     │                            │
     └────────────────────────────┘
                              │
                              ▼
                        ┌─────────┐
                        │ revoked │
                        └─────────┘
```

### State Definitions

| State | Deskripsi | Fitur Access |
|-------|-----------|--------------|
| `trial` | Trial 14 hari aktif | Semua fitur |
| `active` | License valid dan aktif | Sesuai plan |
| `grace_period` | Dalam 7 hari setelah expired | Semua fitur |
| `expired` | License expired > 7 hari | Starter features only |
| `revoked` | License dicabut manual | Tidak ada akses |

### State Storage

Disimpan di `.rihla-mate/license.json`:

```json
{
  "mode": "licensed",
  "state": "active",
  "licenseKey": "RML1.xxx.yyy",
  "payload": { ... },
  "instanceId": "inst_abc123",
  "domain": "travelanda.com",
  "activatedAt": "2026-06-24T10:00:00Z",
  "lastCheckinAt": "2026-06-25T10:00:00Z",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

---

## Renewal dan Upgrade

### Renewal License

Untuk memperpanjang license yang akan/sudah expired:

1. Hubungi sales atau gunakan self-service portal
2. Pembayaran untuk periode baru
3. License server update `expiresAt` di database
4. Check-in berikutnya akan menerima payload baru
5. State kembali ke `active`

### Upgrade Plan

Untuk upgrade dari Starter ke Pro atau Enterprise:

1. Hubungi sales untuk upgrade
2. License server update `plan` dan `features` di database
3. Generate license key baru (opsional) atau update existing
4. Check-in berikutnya menerima payload baru
5. Fitur baru langsung aktif

### Perbedaan

| | Renewal | Upgrade |
|---|---------|---------|
| Perubahan | `expiresAt` | `plan`, `features`, limits |
| License key | Tidak berubah | Mungkin baru |
| Proses | Otomatis via check-in | Otomatis via check-in |

---

## Security Considerations

### Offline Verification

- Signature verification dilakukan secara lokal
- Tidak bergantung pada koneksi internet untuk verifikasi
- Mencegah spoofing dari MITM attack

### Key Storage

- Private key disimpan di server dengan encryption at rest
- Access terbatas pada service yang membutuhkan
- Rotation procedure jika key compromised

### Tamper Detection

- License state disimpan dengan checksum
- Perubahan manual pada file akan terdeteksi
- Aplikasi akan meminta re-activation

### Rate Limiting

License server menggunakan rate limiting:
- Per-license: 100 requests/jam
- Per-IP: 1000 requests/jam
- Menggunakan Upstash Redis

### Instance Binding

- Instance ID menggunakan hash hardware
- Mencegah cloning license ke server lain
- Re-activation di server baru memerlukan proses manual

### Audit Trail

Setiap aktivasi dan check-in dicatat:

```json
{
  "timestamp": "2026-06-24T10:00:00Z",
  "action": "activate",
  "licenseId": "lic_abc123",
  "instanceId": "inst_xyz",
  "domain": "travelanda.com",
  "ipAddress": "103.xxx.xxx.xxx"
}
```

---

## FAQ

### Apa yang terjadi jika license server down?

Aplikasi tetap berjalan dengan status terakhir yang tersimpan. Grace period 7 hari berlaku jika check-in gagal berkepanjangan.

### Bisakah license dipindah ke server lain?

Ya, dengan proses manual. Hubungi support untuk deactivasi di server lama, lalu aktivasi di server baru.

### Bagaimana cara mengecek status license?

Di dashboard admin, buka halaman License Management. Status ditampilkan lengkap dengan expiry date dan check-in history.

### Apakah trial bisa diperpanjang?

Trial tidak bisa diperpanjang otomatis. Untuk perpanjangan, hubungi sales untuk license key.

### Bisakah satu license digunakan untuk multiple domains?

Tidak. Satu license terikat ke satu domain. Untuk multiple domain, diperlukan license terpisah atau plan Enterprise dengan multi-tenant.

### Bagaimana jika ada discrepancy antara license server dan app state?

App state bersifat authoritative selama signature valid. Check-in akan sync state dengan server.

### Apakah data booking hilang jika license expired?

Tidak. Data tetap ada dan bisa diakses. Fitur premium yang terkunci, bukan datanya.

---

*Dokumen ini terakhir diperbarui berdasarkan development plan Rihla Mate.*
