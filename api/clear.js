// api/clear.js
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = "saweria:queue";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    try {
        // Hapus semua isi queue
        await fetch(`${UPSTASH_URL}/del/${QUEUE_KEY}`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });
        
        return res.status(200).json({ 
            status: "ok", 
            message: "Queue dibersihkan" 
        });
    } catch (err) {
        return res.status(500).json({ status: "error", message: err.message });
    }
}
