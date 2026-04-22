export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    const id = req.query.id;
    if (!id) return res.status(400).json({ status: "error", message: "Parameter ?id= diperlukan" });

    try {
        // Ambil semua item di queue
        const items = await redisCommand("lrange", QUEUE_KEY, "0", "-1");
        
        if (!items || items.length === 0) {
            return res.status(200).json({ status: "ok", message: "Queue sudah kosong" });
        }

        // Cari dan hapus item yang ID-nya cocok
        let deleted = false;
        for (const raw of items) {
            const donation = typeof raw === "string" ? JSON.parse(raw) : raw;
            if (donation.id === id) {
                // LREM: hapus semua item yang valuenya sama
                await redisCommand("lrem", QUEUE_KEY, "0", typeof raw === "string" ? raw : JSON.stringify(raw));
                deleted = true;
                console.log("✅ Donasi dihapus dari queue:", id);
                break;
            }
        }

        if (!deleted) {
            return res.status(200).json({ status: "ok", message: "ID tidak ditemukan di queue" });
        }

        return res.status(200).json({ status: "ok", message: "Donasi " + id + " selesai diproses" });
    } catch (err) {
        console.error("Redis error:", err);
        return res.status(500).json({ status: "error", message: err.message });
    }
}
