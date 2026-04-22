// api/webhook.js
// Menerima webhook POST dari Saweria
// Simpan ke Upstash Redis queue

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = "saweria:queue";
const MAX_QUEUE = 50;

async function redisPush(value) {
    const response = await fetch(`${UPSTASH_URL}/rpush/${QUEUE_KEY}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify([value]),
    });
    const data = await response.json();
    return data.result;
}

async function redisTrim() {
    // Jaga queue max 50 item
    const response = await fetch(`${UPSTASH_URL}/ltrim/${QUEUE_KEY}/0/${MAX_QUEUE - 1}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    return response.json();
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
        return res.status(405).json({ status: "method not allowed" });
    }

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        return res.status(500).json({ status: "error", message: "Redis belum dikonfigurasi." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

        if (!body) {
            return res.status(400).json({ status: "error", message: "Body kosong" });
        }

        // ============================================================
        // Saweria webhook format:
        // { 
        //   "id": "xxx",
        //   "donator_name": "username",  
        //   "amount_raw": "10000",
        //   "message": "pesan donasi",
        //   "created_at": "..."
        // }
        // ============================================================
        const donationData = {
            id: body.id || ("manual_" + Date.now()),
            donator_name: body.donator_name || body.from || "Anonim",
            amount_raw: body.amount_raw || body.amount || "0",
            message: body.message || body.donation_message || "",
            timestamp: Date.now(),
        };

        // Push ke Redis queue
        await redisPush(JSON.stringify(donationData));
        await redisTrim();

        console.log("✅ Donasi masuk:", donationData.donator_name, donationData.amount_raw);

        return res.status(200).json({
            status: "ok",
            message: "Donasi berhasil diterima",
            id: donationData.id,
        });

    } catch (err) {
        console.error("❌ Webhook error:", err);
        return res.status(400).json({ status: "error", message: err.message });
    }
}
