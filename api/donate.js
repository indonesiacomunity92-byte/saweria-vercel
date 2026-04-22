// api/donate.js
// Menerima webhook dari Saweria dan menyimpan data donasi terbaru

// Vercel KV tidak tersedia di free tier lama, kita pakai global variable
// CATATAN: Di Vercel Serverless, state tidak persisten antar request
// Solusi: pakai Vercel Edge Config atau simpan ke file JSON via GitHub API
// Untuk solusi paling simpel, kita pakai Upstash Redis (free tier tersedia)

// ============================================================
// VERSI SIMPLE: Pakai file-based storage via Vercel Blob
// atau simpel saja dengan in-memory + token auth
// ============================================================

// Simpan donasi terbaru (in-memory, cukup untuk polling cepat)
// Vercel akan keep-alive function selama beberapa menit
let latestDonation = null;
let donationQueue = [];
const MAX_QUEUE = 50;

// Secret token untuk keamanan (ganti di environment variable Vercel)
const SECRET_TOKEN = process.env.SECRET_TOKEN || "hexsagon_secret_2024";

export default function handler(req, res) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // ============================================================
    // POST: Terima webhook dari Saweria
    // ============================================================
    if (req.method === "POST") {
        const authHeader = req.headers["authorization"] || req.query.token || "";
        
        // Validasi token (opsional tapi disarankan)
        // if (authHeader !== SECRET_TOKEN) {
        //     return res.status(401).json({ status: "unauthorized" });
        // }

        try {
            const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
            
            if (!body) {
                return res.status(400).json({ status: "error", message: "Body kosong" });
            }

            // Format data dari Saweria webhook
            // Saweria mengirim: donator_name, amount_raw, message, email, dll
            const donationData = {
                id: body.id || body.donation_id || Date.now().toString(),
                donator_name: body.donator_name || body.from || "Anonim",
                amount_raw: body.amount_raw || body.amount || "0",
                message: body.message || body.donation_message || "",
                timestamp: Date.now(),
                processed: false
            };

            // Simpan ke queue
            donationQueue.unshift(donationData);
            if (donationQueue.length > MAX_QUEUE) {
                donationQueue = donationQueue.slice(0, MAX_QUEUE);
            }
            latestDonation = donationData;

            console.log("✅ Donasi diterima:", donationData.donator_name, donationData.amount_raw);
            
            return res.status(200).json({ 
                status: "ok", 
                message: "Donasi berhasil diterima",
                id: donationData.id 
            });

        } catch (err) {
            console.error("❌ Error parsing body:", err);
            return res.status(400).json({ status: "error", message: err.message });
        }
    }

    // ============================================================
    // GET: Roblox polling untuk ambil donasi terbaru
    // ============================================================
    if (req.method === "GET") {
        // Ambil donasi yang belum diproses
        const unprocessed = donationQueue.find(d => !d.processed);
        
        if (!unprocessed) {
            return res.status(200).json({ status: "empty" });
        }

        return res.status(200).json({
            status: "ok",
            data: unprocessed
        });
    }

    return res.status(405).json({ status: "method not allowed" });
}
