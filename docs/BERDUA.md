# Berdua

Ruang chat privat buat dua orang, dengan pengingat otomatis kalau ada pesan yang
belum dibales. Dibangun sebagai modul terpisah di dalam app ini: rutenya di
`/berdua`, punya PWA sendiri, dan gak nyampur sama forum/komunitas.

Dipasang sebagai PWA, jadi satu kode jalan di Android maupun iPhone.

## Cara kerja pengingatnya

Yang diingetin adalah **orang yang punya utang balasan**, bukan yang ngirim.

1. A ngirim pesan. Sejak itu B dianggap punya utang balasan.
2. Jadwal pengingat dihitung dari **pesan pertama yang nyantol**, bukan yang
   terakhir. Jadi A ngirim lima pesan beruntun gak bikin hitungannya ke-reset.
3. Tangganya bertingkat, default 30 menit → 2 jam → 6 jam → 1 hari. Tiap tingkat
   kalimatnya beda, makin lama makin nyolek.
4. Begitu B ngirim pesan apa pun, semua pengingat yang antre langsung batal.
   **Dibaca doang gak ngebatalin** — itu justru masalah yang mau diberesin.
5. Kalau beberapa tingkat jatuh tempo barengan (mis. abis jam tenang), yang
   dikirim cuma tingkat tertinggi. Gak ada notif beruntun.

Yang bisa diatur per orang, di `/berdua/pengaturan`:

| Setelan | Default | Guna |
| --- | --- | --- |
| Tangga pengingat | 30, 120, 360, 1440 menit | Jarak tiap tingkat |
| Tangga pesan penting | 10, 45, 120 menit | Dipakai kalau ada pesan ditandai ⚡ |
| Jam tenang | 23:00–07:00 | Pengingat di rentang ini digeser ke jam selesai |
| Zona waktu | WIB | Buat ngitung jam tenang |
| Pengingat nyala/mati | nyala | Matiin total |

Ada juga:

- **⚡ Penting** — pesan ditandai penting, pakai tangga yang lebih rapat.
- **Gak usah dibales** — buat pesan macam "otw ya", biar gak jadi utang balasan.
- **Colek** — kirim notifikasi manual sekarang juga. Dibatesin sekali per 10 menit.
- **Nanti 1 jam / 3 jam** — tunda semua pengingat lo sendiri.

Pesan masuk biasa **tetap** dikirim walau lagi jam tenang; yang ditahan cuma
pengingat dan colekan. Biar jam tenang gak jadi alasan pesan penting ketahan.

## Pasang

### 1. Siapin environment

```bash
cp .env.example .env
npm run berdua:vapid   # tempel hasilnya ke .env
```

Isi juga `CRON_SECRET` pakai string acak. Tanpa secret ini endpoint cron
ketutup total (bukan kebuka bebas), jadi pengingat gak akan pernah kekirim.

### 2. Database

```bash
npm run db:push
```

Nambah lima tabel: `pairs`, `pair_members`, `pair_messages`, `reply_reminders`,
`push_subscriptions`. Tabel lama gak disentuh.

### 3. Jalanin

```bash
docker compose up -d
```

Compose-nya udah termasuk service `berdua-cron` yang nembak endpoint pengingat
tiap menit. Kalau deploy tanpa Docker, pasang cron sendiri:

```cron
* * * * * curl -fsS -m 30 -H "Authorization: Bearer $CRON_SECRET" \
  https://domain-lo.com/api/berdua/cron/reminders > /dev/null
```

### 4. Sambungin berdua

1. Buka `/berdua`, daftar akun.
2. Pilih **Bikin ruang baru**, catat kode undangannya.
3. Kasih kode itu ke pasangan. Dia daftar akun sendiri, lalu **Gabung**.
4. Kode langsung hangus begitu kepakai. Ruang cuma muat dua orang; orang
   ketiga gak bisa masuk walau tau kodenya.

## Penting: syarat notifikasi

**Wajib HTTPS.** Web Push gak jalan di `http://` (kecuali `localhost` buat
ngetes). Dua jalan: punya server sendiri plus domain — `Caddyfile.sample` di
repo ini udah ngurusin sertifikat otomatis — atau deploy ke Vercel yang
ngasih HTTPS gratis (lihat bagian di bawah).

**Android (Chrome):** buka `/berdua`, izinin notifikasi waktu diminta. Selesai.
Disaranin tetep "Add to Home screen" biar gampang dibuka.

**iPhone (Safari, iOS 16.4 ke atas):** notifikasi **cuma** jalan kalau app-nya
dibuka dari Home Screen. Urutannya:

1. Buka `/berdua` di **Safari** (bukan Chrome — di iOS, Chrome gak bisa masang PWA).
2. Tombol Share → **Add to Home Screen** → Add.
3. Buka app-nya dari ikon di Home Screen, bukan dari Safari lagi.
4. Baru nyalain notifikasi dari dalam app.

Kalau langkah 2–3 dilewat, tombol nyalain notifikasi bakal nolak dan ngasih tau
alasannya. Ini batasan iOS, bukan bug.

## Deploy di Vercel (kalau belum punya server/HTTPS)

Vercel ngasih HTTPS gratis di `*.vercel.app`, jadi Web Push langsung jalan
tanpa ngurus sertifikat. Tapi ada tiga hal yang beda dari deploy Docker.

### 1. Database harus di luar

Vercel gak nyimpen Postgres. Pakai Neon, Supabase, atau penyedia Postgres lain
yang punya paket gratis, terus isi `DATABASE_URL` di Environment Variables
Vercel pakai **connection string yang pooled**.

Buat sekali jalan `db:push`, pakai string **direct/unpooled** dari lokal:

```bash
DATABASE_URL="postgresql://...direct..." npm run db:push
```

Migrasi lewat koneksi pooled sering gagal, jadi jangan kebalik.

### 2. Cron-nya harus dari luar

**Vercel Hobby cuma ngasih cron sekali sehari.** Nulis `*/5 * * * *` di
`vercel.json` bikin deploy-nya gagal, bukan cuma diabaikan. Sekali sehari
jelas gak kepake buat tangga 30 menit.

Dua jalan keluar, dua-duanya gratis:

**a. GitHub Actions** (udah disiapin di `.github/workflows/berdua-reminder.yml`)

Isi dua secret di repo, Settings → Secrets and variables → Actions:

| Secret | Isi |
| --- | --- |
| `BERDUA_URL` | `https://app-lo.vercel.app` (tanpa garis miring di akhir) |
| `BERDUA_CRON_SECRET` | sama persis kayak `CRON_SECRET` di Vercel |

Jadwalnya tiap 5 menit. Catatan jujur: jadwal GitHub Actions cuma jalan di
branch default (jadi baru aktif setelah PR-nya di-merge), sering telat
beberapa menit pas GitHub lagi rame, dan **dimatiin otomatis kalau repo gak
ada aktivitas 60 hari**. Buat pengingat balasan, telat 5 menit gak ngaruh.

**b. cron-job.org atau sejenisnya** — daftar gratis, bisa tiap menit, lebih
tepat waktu. Setel:

- URL: `https://app-lo.vercel.app/api/berdua/cron/reminders`
- Method: POST
- Header: `Authorization: Bearer <CRON_SECRET>`

Kalau langganan Vercel Pro, cron bawaan Vercel baru bisa dipakai. Bikin
`vercel.json`:

```json
{ "crons": [{ "path": "/api/berdua/cron/reminders", "schedule": "* * * * *" }] }
```

Vercel otomatis ngirim header `Authorization: Bearer $CRON_SECRET` kalau env
var `CRON_SECRET` diset, dan endpoint di app ini emang nerima format itu.

### 3. Yang gak jalan di serverless

- **Upload materi** (`/api/upload`) nulis ke disk. Di Vercel filesystem-nya
  gak permanen, jadi fitur itu bakal patah. Gak ngaruh ke Berdua, tapi jangan
  kaget. Kalau perlu, pindahin ke object storage.
- **Socket.io** gak bisa nyantol di serverless. Berdua emang gak makai — pesan
  baru masuk lewat polling, dan notifikasi lewat push OS, jadi aman.

Polling-nya sendiri adaptif: 4 detik pas lagi rame, melar sampai 30 detik
kalau sepi, dan berhenti pas tab ketutup. Ini biar pemakaian function di paket
gratis gak kesedot cuma buat nanya "ada pesan baru gak".

### Ringkasan env di Vercel

```
DATABASE_URL          (pooled)
JWT_SECRET
NEXTAUTH_SECRET
APP_URL               https://app-lo.vercel.app
NEXT_PUBLIC_APP_URL   https://app-lo.vercel.app
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
CRON_SECRET
```

## Ngetes tanpa buka browser

```bash
DATABASE_URL="postgresql://..." npm run berdua:selftest
```

Nguji mesin pengingatnya langsung ke database: penjadwalan, pesan beruntun,
pembatalan waktu dibales, jam tenang, tangga urgent, snooze, dan penggabungan
notifikasi. Data yang dibikin pakai email `@berdua-selftest.local` dan dihapus
lagi di akhir.

## Peta file

```
prisma/schema.prisma              Pair, PairMember, PairMessage,
                                  ReplyReminder, PushSubscription
src/lib/berdua/
  time.ts                         Jam tenang + format durasi
  pair.ts                         Konteks pasangan + kode undangan
  reminders.ts                    Mesin penjadwalan & pengiriman
  push.ts                         Web Push (VAPID)
  notify.ts                       Notifikasi pesan masuk & colekan
  stats.ts                        Rekap waktu balas
  guard.ts                        Penjaga auth di tiap endpoint
  client.ts, pushClient.ts        Helper sisi browser
src/app/api/berdua/               Endpoint REST
src/app/(berdua)/berdua/          Halaman: chat, masuk, setup, pengaturan
public/berdua-sw.js               Service worker penerima push
public/berdua/                    Manifest + ikon PWA
scripts/generate-vapid.mjs        Bikin VAPID key
scripts/generate-berdua-icons.mjs Bikin ulang ikon
scripts/berdua-selftest.ts        Uji mesin pengingat
.github/workflows/                Pemicu cron dari luar (buat Vercel dkk)
  berdua-reminder.yml
```

## Yang belum ada

Sengaja dibiarin sederhana dulu: belum ada kirim foto/voice note, belum ada
enkripsi ujung-ke-ujung (pesan kesimpan apa adanya di database — jadi jangan
taruh di server yang gak lo pegang sendiri), dan pesan baru masuk lewat polling
tiap 4 detik, bukan websocket. Notifikasi push tetep instan karena lewat jalur
push OS, bukan polling.
