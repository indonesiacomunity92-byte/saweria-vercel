const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = "saweria:queue";

async function redisCommand(command, ...args) {
    const url = `${UPSTASH_URL}/${command}/${args.map(encodeURIComponent).join("/")}`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
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
        // Ambil SEMUA item di queue
        const items = await redisCommand("lrange", QUEUE_KEY, "0", "-1");

        if (!items || items.length === 0) {
            return res.status(200).json({ status: "ok", message: "Queue sudah kosong" });
        }

        // Cari item yang ID-nya cocok
        let targetRaw = null;
        for (const raw of items) {
            try {
                const donation = typeof raw === "string" ? JSON.parse(raw) : raw;
                if (donation.id === id) {
                    targetRaw = typeof raw === "string" ? raw : JSON.stringify(raw);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!targetRaw) {
            console.log("⚠️ ID tidak ditemukan di queue:", id);
            return res.status(200).json({ status: "ok", message: "ID tidak ditemukan di queue" });
        }

        // Hapus item dari queue berdasarkan value
        await redisCommand("lrem", QUEUE_KEY, "0", targetRaw);
        console.log("✅ Donasi dihapus dari queue:", id);

        return res.status(200).json({ status: "ok", message: "Donasi " + id + " selesai diproses" });

    } catch (err) {
        console.error("Redis error:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
}
