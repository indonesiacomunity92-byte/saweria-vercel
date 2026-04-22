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
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method === "POST") {
        try {
            const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
            if (!body) return res.status(400).json({ status: "error", message: "Body kosong" });

            const donationData = {
                id: body.id || body.donation_id || crypto.randomUUID(),
                donator_name: body.donator_name || body.from || "Anonim",
                amount_raw: body.amount_raw || body.amount || "0",
                message: body.message || body.donation_message || "",
                timestamp: Date.now(),
            };

        await redisCommand("rpush", QUEUE_KEY, JSON.stringify(donationData));


            console.log("✅ Donasi disimpan ke Redis:", donationData.donator_name);
            return res.status(200).json({ status: "ok", id: donationData.id });
        } catch (err) {
            return res.status(400).json({ status: "error", message: err.message });
        }
    }

    return res.status(405).json({ status: "method not allowed" });
}
