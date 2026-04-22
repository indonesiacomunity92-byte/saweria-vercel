# Saweria → Roblox Relay (Gratis, Tanpa Hosting Sendiri)

## Cara Deploy (5 Langkah)

---

### LANGKAH 1: Buat Akun Upstash Redis (Database Gratis)

1. Buka https://upstash.com → Daftar gratis
2. Klik "Create Database"
3. Isi nama: `saweria-relay`, pilih region terdekat (Singapore)
4. Setelah dibuat, klik database-nya
5. Salin dua nilai ini (akan dipakai di Langkah 3):
   - `UPSTASH_REDIS_REST_URL`  → contoh: `https://xxx.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` → string panjang

---

### LANGKAH 2: Deploy ke Vercel

1. Buka https://vercel.com → Daftar gratis (bisa pakai GitHub)
2. Klik "Add New Project"
3. Upload folder ini, atau push ke GitHub dulu lalu import
4. Klik "Deploy"
5. Setelah deploy selesai, catat URL-nya
   - Contoh: `https://saweria-relay-abc123.vercel.app`

---

### LANGKAH 3: Set Environment Variables di Vercel

1. Di Vercel dashboard → proyek kamu → Settings → Environment Variables
2. Tambahkan dua variabel:

   | Name | Value |
   |------|-------|
   | `UPSTASH_REDIS_REST_URL` | URL dari Upstash tadi |
   | `UPSTASH_REDIS_REST_TOKEN` | Token dari Upstash tadi |

3. Klik Save, lalu **Redeploy** proyek

---

### LANGKAH 4: Daftarkan Webhook di Saweria

1. Login ke https://saweria.co
2. Buka Dashboard → Settings → Webhook
3. Masukkan URL webhook kamu:
   ```
   https://NAMA-PROYEK-KAMU.vercel.app/api/webhook
   ```
4. Simpan

---

### LANGKAH 5: Update Script Roblox

Buka file `SaweriaDonate_Roblox.lua`, ganti baris ini:
```lua
local BASE_URL = "https://NAMA-PROYEK-KAMU.vercel.app"
```
Ganti dengan URL Vercel kamu yang asli.

---

## Endpoint yang Tersedia

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/webhook` | POST | Terima webhook dari Saweria |
| `/api/get` | GET | Roblox ambil donasi terbaru |
| `/api/set?id=xxx` | GET | Roblox tandai donasi selesai |

---

## Testing Manual

Kamu bisa test webhook secara manual dengan curl:

```bash
curl -X POST https://NAMA-PROYEK.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test123",
    "donator_name": "NamaRobloxKamu",
    "amount_raw": "50000",
    "message": "Halo dari Saweria!"
  }'
```

Lalu cek apakah Roblox menerima dengan polling:
```
https://NAMA-PROYEK.vercel.app/api/get
```

---

## Catatan

- Vercel free tier: 100GB bandwidth/bulan, cukup untuk game kecil-menengah
- Upstash free tier: 10.000 request/hari, cukup untuk polling setiap 5 detik (17.280/hari) 
  → Upgrade ke plan $10/bulan jika traffic tinggi
- Data di Redis otomatis expire setelah 7 hari jika tidak diproses
