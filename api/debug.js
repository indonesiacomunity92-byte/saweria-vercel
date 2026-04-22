// api/debug.js
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const QUEUE_KEY = "saweria:queue";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    const r = await fetch(`${UPSTASH_URL}/lrange/${QUEUE_KEY}/0/-1`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await r.json();
    
    // Tampilkan raw result tanpa parsing apapun
    return res.status(200).json({
        raw_result: data,
        type: typeof data.result,
        length: Array.isArray(data.result) ? data.result.length : "bukan array",
        first_item: Array.isArray(data.result) ? data.result[0] : null,
        first_item_type: Array.isArray(data.result) ? typeof data.result[0] : null
    });
}
