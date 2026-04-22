// api/get.js
// Roblox polling endpoint - ambil donasi yang belum diproses
// Menggunakan Upstash Redis untuk persistent storage (gratis)

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = "saweria:queue";

async function redisCommand(command, ...args) {
    const response = await fetch(`${UPSTASH_URL}/${command}/${args.join("/")}`, {
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
        return res.status(500).json({ 
            status: "error", 
            message: "Redis belum dikonfigurasi. Set UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN di Vercel Environment Variables." 
        });
    }

    try {
        // Ambil item pertama dari queue (LINDEX = ambil tanpa hapus)
        const raw = await redisCommand("lindex", QUEUE_KEY, "0");
        
        if (!raw) {
            return res.status(200).json({ status: "empty" });
        }

        const donation = typeof raw === "string" ? JSON.parse(raw) : raw;
        
        return res.status(200).json({
            status: "ok",
            data: donation
        });

    } catch (err) {
        console.error("Redis error:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
}
