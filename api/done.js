// api/done.js
// Dipanggil Roblox setelah donasi berhasil diproses
// Menandai donasi sebagai sudah diproses agar tidak muncul lagi

// Import shared state (CATATAN: di Vercel, tiap function instance punya state sendiri)
// Untuk production, gunakan Upstash Redis. Untuk testing, ini sudah cukup.

// Kita pakai pendekatan berbeda: simpan processed IDs
const processedIds = new Set();

export default function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    const id = req.query.id;

    if (!id) {
        return res.status(400).json({ status: "error", message: "ID tidak ditemukan" });
    }

    processedIds.add(id);
    console.log("✅ Donasi ditandai selesai:", id);

    return res.status(200).json({ 
        status: "ok", 
        message: "Donasi ID " + id + " ditandai selesai" 
    });
}
