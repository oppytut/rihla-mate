# Panduan Instalasi Rihla Mate

Dokumen ini menjelaskan cara instalasi dan konfigurasi Rihla Mate di server Anda sendiri. Ikuti langkah-langkah berikut untuk menjalankan aplikasi dengan benar.

---

## Daftar Isi

1. [Persyaratan Sistem](#persyaratan-sistem)
2. [Quick Start](#quick-start)
3. [Konfigurasi .env](#konfigurasi-env)
4. [Mengakses Installer Wizard](#mengakses-installer-wizard)
5. [Aktivasi Lisensi](#aktivasi-lisensi)
6. [Setup Custom Domain](#setup-custom-domain)
7. [Troubleshooting](#troubleshooting)
8. [Backup dan Restore](#backup-dan-restore)
9. [Update Aplikasi](#update-aplikasi)
10. [Uninstall](#uninstall)

---

## Persyaratan Sistem

Sebelum instalasi, pastikan server Anda memenuhi persyaratan berikut.

### Hardware Minimum

| Komponen | Minimum | Direkomendasikan |
|----------|---------|------------------|
| RAM | 1 GB | 2 GB |
| Disk | 10 GB | 20 GB |
| CPU | 1 vCPU | 2 vCPU |

### Software

| Software | Versi Minimum |
|----------|---------------|
| Docker | 20.10+ |
| Docker Compose | 2.0+ |
| OS | Ubuntu 20.04+, Debian 11+, atau distribusi Linux lain dengan Docker support |

### Jaringan

- Port 3000 harus tersedia (atau ubah di docker-compose.yml)
- Akses internet untuk download image dan aktivasi lisensi
- Domain (opsional, untuk custom domain)

### Cek Versi Docker

Jalankan perintah berikut untuk memastikan Docker sudah terinstall:

```bash
docker --version
docker compose version
```

Output harus menunjukkan versi Docker 20.10 atau lebih tinggi.

---

## Quick Start

Instalasi cepat untuk memulai dalam 5 menit.

### Langkah 1: Download File

```bash
# Buat direktori untuk Rihla Mate
mkdir -p ~/rihla-mate
cd ~/rihla-mate

# Download file konfigurasi
curl -O https://releases.rihla-mate.com/latest/docker-compose.yml
curl -O https://releases.rihla-mate.com/latest/.env.example

# Buat file .env dari template
cp .env.example .env
```

### Langkah 2: Edit Konfigurasi

Buka file `.env` dan ubah nilai-nilai berikut:

```bash
nano .env
```

Minimal, ubah `DB_PASSWORD` dengan password yang kuat:

```env
DB_PASSWORD=ganti-dengan-password-aman-anda
```

### Langkah 3: Jalankan Aplikasi

```bash
docker compose up -d
```

Tunggu beberapa menit hingga semua container berjalan.

### Langkah 4: Akses Aplikasi

Buka browser dan akses:

```
http://<ip-server-anda>:3000
```

Anda akan melihat halaman installer wizard untuk menyelesaikan setup.

---

## Konfigurasi .env

File `.env` berisi semua konfigurasi yang diperlukan oleh aplikasi. Berikut penjelasan setiap variabel.

### Database

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `DB_HOST` | Host database (default: `db`) | `db` |
| `DB_PORT` | Port database (default: `5432`) | `5432` |
| `DB_USER` | Username database (default: `rihla`) | `rihla` |
| `DB_PASSWORD` | Password database. **Wajib diubah.** | `strong-password-here` |
| `DB_NAME` | Nama database (default: `rihla_mate`) | `rihla_mate` |

### Aplikasi

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `NODE_ENV` | Environment aplikasi | `production` |
| `PORT` | Port aplikasi (default: `3000`) | `3000` |
| `APP_URL` | URL aplikasi Anda | `https://travelanda.com` |

### Lisensi

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `LICENSE_API_URL` | URL license server Rihla Mate | `https://license.rihla-mate.com/api/v1` |

### Email (Opsional)

Diperlukan untuk mengirim email konfirmasi booking dan notifikasi.

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `RESEND_API_KEY` | API key dari Resend | `re_xxxxx` |
| `EMAIL_FROM` | Alamat pengirim email | `noreply@travelanda.com` |

### Storage (Opsional)

Default menggunakan local filesystem. Untuk scale, gunakan S3.

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `STORAGE_TYPE` | Tipe storage (`local` atau `s3`) | `local` |
| `S3_ACCESS_KEY` | AWS S3 access key | `AKIAxxxx` |
| `S3_SECRET_KEY` | AWS S3 secret key | `xxxx` |
| `S3_BUCKET` | Nama bucket S3 | `rihla-mate-uploads` |
| `S3_REGION` | Region S3 | `ap-southeast-1` |

### Cache (Opsional)

Default menggunakan LRU cache in-memory. Untuk multi-instance, gunakan Redis.

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `REDIS_URL` | URL Redis (opsional) | `redis://localhost:6379` |

### Payment Gateway

| Variabel | Deskripsi | Contoh |
|----------|-----------|--------|
| `MIDTRANS_SERVER_KEY` | Server key Midtrans | `SB-Mid-server-xxxx` |
| `MIDTRANS_CLIENT_KEY` | Client key Midtrans | `SB-Mid-client-xxxx` |
| `MIDTRANS_IS_PRODUCTION` | Mode production atau sandbox | `false` |

### Contoh File .env Lengkap

```env
# Database
DB_HOST=db
DB_PORT=5432
DB_USER=rihla
DB_PASSWORD=your-secure-password-here
DB_NAME=rihla_mate

# Aplikasi
NODE_ENV=production
PORT=3000
APP_URL=https://travelanda.com

# Lisensi
LICENSE_API_URL=https://license.rihla-mate.com/api/v1

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@travelanda.com

# Storage
STORAGE_TYPE=local

# Payment
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx
MIDTRANS_IS_PRODUCTION=false
```

---

## Mengakses Installer Wizard

Setelah menjalankan `docker compose up -d`, akses installer wizard melalui browser.

### URL Installer

```
http://<ip-server-anda>:3000
```

### Langkah-langkah Installer

Installer wizard akan memandu Anda melalui langkah-langkah berikut:

#### Step 1: System Check

Installer memeriksa:
- Koneksi database
- Ruang disk yang tersedia
- Versi runtime

Jika semua hijau, lanjut ke step berikutnya.

#### Step 2: Database Migration

Installer menjalankan migrasi database untuk membuat tabel-tabel yang diperlukan. Proses ini otomatis.

#### Step 3: Admin Account

Buat akun admin pertama:
- Nama lengkap
- Email
- Password (minimal 8 karakter)

Simpan kredensial ini dengan aman.

#### Step 4: License Activation

Pilih salah satu:
- **Mulai Trial**: 14 hari akses penuh tanpa license key
- **Masukkan License Key**: Jika sudah membeli lisensi

#### Step 5: Branding Awal

Isi informasi awal travel agency Anda:
- Nama agency
- Logo (upload)
- Warna brand (primary, secondary)

Setelah selesai, Anda akan diarahkan ke dashboard admin.

---

## Aktivasi Lisensi

### Trial Mode

Jika memilih trial, Anda mendapatkan:
- 14 hari akses penuh ke semua fitur
- Tidak perlu license key
- Otomatis terikat ke instance ID server Anda

Trial dimulai saat pertama kali aplikasi dijalankan, bukan saat installer dibuka.

### Aktivasi dengan License Key

Jika sudah membeli lisensi:

1. Masukkan license key di installer wizard
2. License key format: `RML1.xxx.yyy`
3. Aplikasi akan memverifikasi secara offline (Ed25519 signature)
4. Jika valid, aplikasi menghubungi license server untuk aktivasi online
5. Domain server Anda akan terikat ke lisensi

### Setelah Aktivasi

- License status ditampilkan di dashboard admin
- Check-in otomatis setiap 24 jam ke license server
- Jika license expired, ada grace period 7 hari sebelum fitur premium dinonaktifkan

---

## Setup Custom Domain

Secara default, Rihla Mate berjalan di `http://<ip>:3000`. Untuk menggunakan custom domain, ikuti langkah berikut.

### Langkah 1: DNS Configuration

Arahkan domain Anda ke IP server:

```
A Record: travelanda.com -> <ip-server-anda>
```

### Langkah 2: Install Nginx Reverse Proxy

Di server Anda:

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### Langkah 3: Konfigurasi Nginx

Buat file konfigurasi:

```bash
sudo nano /etc/nginx/sites-available/rihla-mate
```

Isi dengan:

```nginx
server {
    listen 80;
    server_name travelanda.com www.travelanda.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan konfigurasi:

```bash
sudo ln -s /etc/nginx/sites-available/rihla-mate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Langkah 4: Install SSL Certificate

```bash
sudo certbot --nginx -d travelanda.com -d www.travelanda.com
```

Ikuti instruksi untuk menyelesaikan instalasi SSL.

### Langkah 5: Update .env

Ubah `APP_URL` di file `.env`:

```env
APP_URL=https://travelanda.com
```

Restart aplikasi:

```bash
docker compose down
docker compose up -d
```

---

## Troubleshooting

### Port Sudah Digunakan

**Gejala**: Error `bind: address already in use` saat menjalankan docker compose.

**Solusi**:

Cek proses yang menggunakan port:

```bash
sudo lsof -i :3000
```

Hentikan proses atau ubah port di `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Ubah dari 3000 ke 3001
```

### Database Connection Failed

**Gejala**: Error `connection refused` atau `password authentication failed`.

**Solusi**:

1. Pastikan container database berjalan:
   ```bash
   docker compose ps
   ```

2. Cek log database:
   ```bash
   docker compose logs db
   ```

3. Verifikasi kredensial di `.env` sama dengan yang dikonfigurasi.

4. Restart container:
   ```bash
   docker compose restart db
   ```

### Permission Denied pada Volumes

**Gejala**: Error `permission denied` saat menulis ke volume.

**Solusi**:

Docker volumes biasanya menangani permission otomatis. Jika masalah berlanjut:

```bash
# Cek ownership
ls -la ~/rihla-mate

# Ubah ownership jika perlu
sudo chown -R $USER:$USER ~/rihla-mate
```

### Container Tidak Bisa Start

**Gejala**: Container restart terus menerus.

**Solusi**:

Cek log untuk mengetahui error:

```bash
docker compose logs app
```

Error umum:
- Environment variable tidak lengkap
- Database belum siap saat app start
- Memory tidak cukup

### License Activation Gagal

**Gejala**: License key ditolak saat aktivasi.

**Solusi**:

1. Pastikan license key format benar: `RML1.xxx.yyy`
2. Cek koneksi internet ke license server
3. Pastikan license belum digunakan di server lain
4. Hubungi support jika license valid tapi tetap gagal

### Aplikasi Lambat

**Solusi**:

1. Cek resource server:
   ```bash
   docker stats
   ```

2. Tingkatkan RAM jika penggunaan di atas 80%
3. Aktifkan Redis untuk caching jika multi-instance
4. Gunakan S3 untuk storage jika upload banyak

---

## Backup dan Restore

### Backup Manual

#### Backup Database

```bash
# Backup database ke file
docker compose exec db pg_dump -U rihla rihla_mate > backup_$(date +%Y%m%d).sql
```

#### Backup Volumes

```bash
# Backup volume uploads
docker compose exec app tar -czf - /app/uploads > uploads_backup_$(date +%Y%m%d).tar.gz

# Backup license state
docker compose exec app tar -czf - /app/.rihla-mate > license_backup_$(date +%Y%m%d).tar.gz
```

### Restore Manual

#### Restore Database

```bash
# Copy file backup ke container
docker cp backup_20260624.sql rihla-mate-db-1:/tmp/

# Restore database
docker compose exec db psql -U rihla rihla_mate -f /tmp/backup_20260624.sql
```

#### Restore Volumes

```bash
# Restore uploads
cat uploads_backup_20260624.tar.gz | docker compose exec -T app tar -xzf - -C /

# Restore license state
cat license_backup_20260624.tar.gz | docker compose exec -T app tar -xzf - -C /
```

### Backup Otomatis

Buat cron job untuk backup harian:

```bash
crontab -e
```

Tambahkan:

```cron
0 2 * * * cd ~/rihla-mate && docker compose exec -T db pg_dump -U rihla rihla_mate > ~/backups/db_$(date +\%Y\%m\%d).sql
```

---

## Update Aplikasi

### Update dengan Docker Compose

```bash
cd ~/rihla-mate

# Pull image terbaru
docker compose pull

# Restart dengan image baru
docker compose up -d
```

### Update dengan Watchtower

Docker Compose menyertakan Watchtower untuk auto-update. Watchtower akan mengecek update setiap 5 menit dan melakukan update otomatis jika ada versi baru.

Untuk menonaktifkan auto-update, hapus service `watchtower` dari `docker-compose.yml`.

### Cek Versi

Cek versi aplikasi yang sedang berjalan:

```bash
docker compose exec app cat /app/package.json | grep version
```

---

## Uninstall

### Stop dan Hapus Containers

```bash
cd ~/rihla-mate
docker compose down
```

### Hapus Volumes (Hati-hati: Data Akan Hilang)

```bash
docker compose down -v
```

### Hapus Files

```bash
rm -rf ~/rihla-mate
```

### Hapus Images

```bash
docker rmi ghcr.io/rihlamate/rihla-mate:latest
docker rmi postgres:16-alpine
```

---

## Bantuan

Jika mengalami masalah yang tidak tercover dalam dokumen ini:

1. Cek log aplikasi: `docker compose logs app`
2. Cek log database: `docker compose logs db`
3. Hubungi support di support@rihla-mate.com
4. Kunjungi dokumentasi online di docs.rihla-mate.com

---

*Dokumen ini terakhir diperbarui berdasarkan development plan Rihla Mate.*
