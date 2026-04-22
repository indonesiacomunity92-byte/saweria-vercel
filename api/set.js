// api/set.js
// Dipanggil Roblox setelah berhasil proses donasi
// Menghapus donasi dari queue agar tidak diproses 2x

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = "saweria:queue";

async function redisCommand(command, ...args) {
    const url = `${UPSTASH_URL}/${command}/${args.map(encodeURIComponent).join("/")}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
        },
    });
    const data = await response.json();
    return data.result;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        return res.status(500).json({ status: "error", message: "Redis belum dikonfigurasi." });
    }

    const id = req.query.id;
    if (!id) {
        return res.status(400).json({ status: "error", message: "Parameter ?id= diperlukan" });
    }

    try {
        // Ambil item pertama
        const raw = await redisCommand("lindex", QUEUE_KEY, "0");
        
        if (!raw) {
            return res.status(200).json({ status: "ok", message: "Queue sudah kosong" });
        }

        const donation = typeof raw === "string" ? JSON.parse(raw) : raw;

        // Hapus hanya jika ID cocok
        if (donation.id === id) {
            await redisCommand("lpop", QUEUE_KEY);
            console.log("✅ Donasi dihapus dari queue:", id);
            return res.status(200).json({ status: "ok", message: "Donasi " + id + " selesai diproses" });
        } else {
            return res.status(200).json({ status: "ok", message: "ID tidak cocok, skip" });
        }

    } catch (err) {
        console.error("Redis error:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
}
