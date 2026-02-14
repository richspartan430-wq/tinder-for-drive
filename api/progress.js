// api/progress.js
import { list } from '@vercel/blob';

function defaultProgress() {
  return new Response(JSON.stringify({ last_index: 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function GET(request) {
  try {
    // Graceful fallback when BLOB_READ_WRITE_TOKEN is not configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN not set. Add it in Vercel project settings or create a Blob store.');
      return defaultProgress();
    }

    const { blobs } = await list({
      prefix: 'progress.json',
      limit: 1,
    });

    if (blobs.length === 0) {
      return defaultProgress();
    }

    const progressBlob = blobs[0];
    const response = await fetch(progressBlob.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch progress content: ${response.statusText}`);
    }
    const progress = await response.json();

    return new Response(JSON.stringify(progress), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const isBlobError = error?.name === 'BlobError' || error?.message?.includes('No token found');
    if (isBlobError) {
      console.warn('Vercel Blob not configured. Returning default progress. See VERCEL_SETUP.md');
      return defaultProgress();
    }
    console.error('Error in /api/progress:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch progress' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
