const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = "saweria:queue";

async function upstash(command, ...args) {
    const url = `${UPSTASH_URL}/${command}/${args.map(encodeURIComponent).join("/")}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
    return (await r.json()).result;
}

async function upstashPush(values) {
    // Push multiple values via pipeline
    const body = values.map(v => ["rpush", QUEUE_KEY, v]);
    const r = await fetch(`${UPSTASH_URL}/pipeline`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    return r.json();
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const id = req.query.id;
    if (!id) return res.status(400).json({ status: "error", message: "id diperlukan" });

    try {
        // Ambil semua item
        const items = await upstash("lrange", QUEUE_KEY, "0", "-1");
        if (!items || items.length === 0) {
            return res.status(200).json({ status: "ok", message: "Queue kosong" });
        }

        // Filter item yang bukan target
        const remaining = [];
        let deleted = false;

        for (const raw of items) {
            try {
                let obj = typeof raw === "string" ? JSON.parse(raw) : raw;
                if (typeof obj === "string") obj = JSON.parse(obj); // double encoded

                if (obj.id === id) {
                    deleted = true;
                    console.log("🗑️ Hapus:", id);
                } else {
                    remaining.push(typeof raw === "string" ? raw : JSON.stringify(raw));
                }
            } catch {
                remaining.push(typeof raw === "string" ? raw : JSON.stringify(raw));
            }
        }

        // Hapus seluruh queue
        await upstash("del", QUEUE_KEY);

        // Re-insert sisa (kalau ada)
        if (remaining.length > 0) {
            await upstashPush(remaining);
        }

        return res.status(200).json({ status: "ok", deleted, remaining: remaining.length });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error", message: err.message });
    }
}
