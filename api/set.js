const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = "saweria:queue";

async function upstash(command, ...args) {
    const url = `${UPSTASH_URL}/${command}/${args.map(encodeURIComponent).join("/")}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` } });
    return (await r.json()).result;
}

async function upstashPipeline(commands) {
    const r = await fetch(`${UPSTASH_URL}/pipeline`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(commands)
    });
    return r.json();
}

function parseItem(raw) {
    let obj = raw;
    // Parse sampai 3 level (handle triple-encoded)
    for (let i = 0; i < 3; i++) {
        if (typeof obj === "string") {
            try { obj = JSON.parse(obj); } catch { break; }
        } else if (Array.isArray(obj)) {
            obj = obj[0];
        } else {
            break;
        }
    }
    return obj;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const id = req.query.id;
    if (!id) return res.status(400).json({ status: "error", message: "id diperlukan" });

    try {
        const items = await upstash("lrange", QUEUE_KEY, "0", "-1");

        if (!items || items.length === 0) {
            return res.status(200).json({ status: "ok", message: "Queue kosong" });
        }

        const remaining = [];
        let deleted = false;

        for (const raw of items) {
            try {
                const obj = parseItem(raw);

                if (obj && obj.id === id) {
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

        // Re-insert sisa kalau ada
        if (remaining.length > 0) {
            const commands = remaining.map(v => ["rpush", QUEUE_KEY, v]);
            await upstashPipeline(commands);
        }

        return res.status(200).json({ 
            status: "ok", 
            deleted, 
            remaining: remaining.length,
            message: deleted ? `Donasi ${id} dihapus` : `ID ${id} tidak ditemukan`
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: "error", message: err.message });
    }
}
