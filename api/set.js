const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = "saweria:queue";

async function redisGet(path) {
    const res = await fetch(`${UPSTASH_URL}${path}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    return (await res.json()).result;
}

async function redisPost(path, body) {
    const res = await fetch(`${UPSTASH_URL}${path}`, {
        method: "POST",
        headers: { 
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    return (await res.json()).result;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const id = req.query.id;
    if (!id) return res.status(400).json({ status: "error", message: "Parameter ?id= diperlukan" });

    try {
        // Ambil semua item
        const items = await redisGet(`/lrange/${QUEUE_KEY}/0/-1`);

        if (!items || items.length === 0) {
            return res.status(200).json({ status: "ok", message: "Queue kosong" });
        }

        // Filter: buang item yang ID-nya cocok
        const remaining = [];
        let deleted = false;

        for (const raw of items) {
            try {
                const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
                if (obj.id === id) {
                    deleted = true;
                    console.log("🗑️ Hapus:", id);
                } else {
                    remaining.push(typeof raw === "string" ? raw : JSON.stringify(raw));
                }
            } catch {
                remaining.push(raw);
            }
        }

        // Hapus seluruh queue
        await redisGet(`/del/${QUEUE_KEY}`);

        // Re-insert sisa item (kalau ada)
        if (remaining.length > 0) {
            await redisPost(`/rpush/${QUEUE_KEY}`, remaining);
        }

        return res.status(200).json({ 
            status: "ok", 
            deleted,
            remaining: remaining.length,
            message: deleted ? `Donasi ${id} dihapus` : `ID ${id} tidak ditemukan`
        });

    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
}
