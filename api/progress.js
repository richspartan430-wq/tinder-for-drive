// api/progress.js
import { list } from '@vercel/blob';

export default async function GET(request) {
  try {
    const { blobs } = await list({
      prefix: 'progress.json',
      limit: 1,
    });

    if (blobs.length === 0) {
      // If progress.json doesn't exist, return default
      return new Response(JSON.stringify({ last_index: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Fetch the content from the blob's URL
    const progressBlob = blobs[0];
    const response = await fetch(progressBlob.url);
    if (!response.ok) {
        throw new Error(`Failed to fetch progress content: ${response.statusText}`);
    }
    const progress = await response.json();

    return new Response(JSON.stringify(progress), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Error in /api/progress:", error);
    return new Response(JSON.stringify({ error: 'Failed to fetch progress' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
