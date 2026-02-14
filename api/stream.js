// api/stream.js - Proxy Google Drive videos for HTML5 playback
// Drive blocks direct streaming; we fetch via Drive API and stream to client.

function getIdFromRequest(request) {
  const u = request?.url || '';
  const q = u.includes('?') ? u.split('?')[1] : '';
  return new URLSearchParams(q).get('id');
}

function getHeader(req, name) {
  const h = req?.headers;
  if (!h) return null;
  if (typeof h.get === 'function') return h.get(name);
  const k = name.toLowerCase();
  return h[k] ?? h[name] ?? null;
}

async function handleStream(request, id, apiKey) {
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${apiKey}`;
  const headers = new Headers();

  const range = getHeader(request, 'range');
  if (range) {
    headers.set('Range', range);
  }

  try {
    const driveRes = await fetch(driveUrl, {
      headers,
      redirect: 'follow',
    });

    if (!driveRes.ok) {
      const text = await driveRes.text();
      console.error('Drive API error:', driveRes.status, text);
      return new Response(
        JSON.stringify({ error: 'Video not found or not shared publicly' }),
        { status: driveRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', driveRes.headers.get('content-type') || 'video/mp4');
    resHeaders.set('Accept-Ranges', 'bytes');
    resHeaders.set('Cache-Control', 'public, max-age=3600');

    const contentRange = driveRes.headers.get('Content-Range');
    if (contentRange) {
      resHeaders.set('Content-Range', contentRange);
    }

    const contentLength = driveRes.headers.get('Content-Length');
    if (contentLength) {
      resHeaders.set('Content-Length', contentLength);
    }

    return new Response(driveRes.body, {
      status: driveRes.status,
      statusText: driveRes.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    console.error('Stream error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to stream video' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export default async function GET(request) {
  const id = getIdFromRequest(request);
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'GOOGLE_DRIVE_API_KEY not set. Add it in Vercel project settings.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return handleStream(request, id, apiKey);
}
