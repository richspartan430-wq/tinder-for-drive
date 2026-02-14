// api/progress.js
import { get } from '@vercel/blob';

export default async function GET(request) {
  try {
    const blob = await get('progress.json'); // No options needed for get
    const text = await blob.text();
    const progress = JSON.parse(text);
    return new Response(JSON.stringify(progress), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    // If progress.json doesn't exist, Vercel Blob returns a 404
    if (error.status === 404) {
        return new Response(JSON.stringify({ last_index: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    console.error("Error fetching progress:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
