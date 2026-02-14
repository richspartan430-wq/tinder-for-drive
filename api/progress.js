// api/progress.js
import { get } from '@vercel/blob';

export default async function GET(request) {
  try {
    const blob = await get('progress.json', { access: 'public' }); // Attempt to read progress.json
    const text = await blob.text();
    const progress = JSON.parse(text);
    return new Response(JSON.stringify(progress), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    // If progress.json doesn't exist or there's an error reading it, return default
    // Vercel Blob `get` throws an error if blob not found. Check for specific message.
    if (error.message && error.message.includes('BlobNotFound') || error.status === 404) {
        return new Response(JSON.stringify({ last_index: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    console.error("Error fetching progress:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
