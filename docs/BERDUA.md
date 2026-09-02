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
ngetes). Pakai domain beneran plus sertifikat — `Caddyfile.sample` di repo ini
udah ngurusin sertifikat otomatis.

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
```

## Yang belum ada

Sengaja dibiarin sederhana dulu: belum ada kirim foto/voice note, belum ada
enkripsi ujung-ke-ujung (pesan kesimpan apa adanya di database — jadi jangan
taruh di server yang gak lo pegang sendiri), dan pesan baru masuk lewat polling
tiap 4 detik, bukan websocket. Notifikasi push tetep instan karena lewat jalur
push OS, bukan polling.
