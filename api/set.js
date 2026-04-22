export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        return res.status(500).json({ status: "error", message: "Redis belum dikonfigurasi." });
    }

    try {
        const raw = await redisCommand("lindex", QUEUE_KEY, "0");

        // ✅ Handle semua kemungkinan kosong
        if (!raw || raw === null || raw === "" || raw === "null") {
            return res.status(200).json({ status: "empty" });
        }

        let donation;
        if (typeof raw === "string") {
            try {
                donation = JSON.parse(raw);
            } catch {
                // String tapi bukan JSON valid, hapus dan return empty
                await redisCommand("lpop", QUEUE_KEY);
                return res.status(200).json({ status: "empty" });
            }
        } else {
            donation = raw;
        }

        // ✅ Validasi donation punya id
        if (!donation || !donation.id) {
            // Data rusak, hapus dari queue
            await redisCommand("lpop", QUEUE_KEY);
            return res.status(200).json({ status: "empty" });
        }

        return res.status(200).json({
            status: "ok",
            data: donation
        });

    } catch (err) {
        console.error("Redis error:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
}
