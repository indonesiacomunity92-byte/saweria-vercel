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

    const id = req.query.id;
    if (!id) return res.status(400).json({ status: "error", message: "Parameter ?id= diperlukan" });

    try {
        const items = await redisCommand("lrange", QUEUE_KEY, "0", "-1");

        if (!items || items.length === 0) {
            return res.status(200).json({ status: "ok", message: "Queue kosong" });
        }

        let deleted = false;

        for (const raw of items) {
            try {
                // Parse sekali
                let obj = typeof raw === "string" ? JSON.parse(raw) : raw;
                
                // Kalau masih string (double encoded), parse lagi
                if (typeof obj === "string") {
                    obj = JSON.parse(obj);
                }

                if (obj.id === id) {
                    // Hapus dengan exact raw value yang ada di Redis
                    await redisCommand("lrem", QUEUE_KEY, "0", raw);
                    deleted = true;
                    console.log("✅ Hapus dari queue:", id);
                    break;
                }
            } catch { continue; }
        }

        return res.status(200).json({ 
            status: "ok", 
            deleted,
            message: deleted ? `Donasi ${id} dihapus` : `ID ${id} tidak ditemukan`
        });

    } catch (err) {
        return res.status(500).json({ status: "error", message: err.message });
    }
}
