// api/save.js
import { list, put } from '@vercel/blob';

function blobNotConfiguredResponse() {
  return new Response(
    JSON.stringify({
      error: 'Vercel Blob storage is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel project settings. See VERCEL_SETUP.md',
    }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

async function parseBody(req) {
  if (typeof req.json === 'function') return req.json();
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export default async function POST(request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN not set. Create a Blob store in Vercel.');
      return blobNotConfiguredResponse();
    }
    const { index, filename, drive_file_id, action, note, classified_by, timestamp } = await parseBody(request);

    // 1. Update results.csv
    const csvBlobName = 'results.csv';
    let csvContent = '';

    const { blobs: csvBlobs } = await list({ prefix: csvBlobName, limit: 1 });

    if (csvBlobs.length > 0) {
      const response = await fetch(csvBlobs[0].url);
      if (response.ok) {
        csvContent = await response.text();
      } else {
        // If fetch fails but blob exists, start fresh to avoid data loss.
        console.error(`Failed to fetch existing csv content, starting new file: ${response.statusText}`);
        csvContent = 'index,filename,drive_file_id,action,note,classified_by,timestamp\n';
      }
    } else {
      // If results.csv doesn't exist, create header.
      csvContent = 'index,filename,drive_file_id,action,note,classified_by,timestamp\n';
    }

    // Ensure content ends with a newline before appending.
    if (!csvContent.endsWith('\n')) {
        csvContent += '\n';
    }

    const escapedNote = `"${note.replace(/"/g, '""')}"`;
    const newCsvLine = `${index},"${filename}","${drive_file_id}",${action},${escapedNote},"${classified_by}",${timestamp}\n`;
    csvContent += newCsvLine;

    await put(csvBlobName, csvContent, { access: 'public', addRandomSuffix: false });

    // 2. Update progress.json
    const progressBlobName = 'progress.json';
    let progress = { last_index: 0 };

    const { blobs: progressBlobs } = await list({ prefix: progressBlobName, limit: 1 });

    if (progressBlobs.length > 0) {
        const response = await fetch(progressBlobs[0].url);
        if (response.ok) {
            progress = await response.json();
        } else {
            console.error(`Failed to fetch existing progress content: ${response.statusText}`);
        }
    }

    if (index > progress.last_index) {
        progress.last_index = index;
        await put(progressBlobName, JSON.stringify(progress), { access: 'public', addRandomSuffix: false });
    }

    return new Response(JSON.stringify({ message: 'Classification saved successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    const isBlobError = error?.name === 'BlobError' || error?.message?.includes('No token found');
    if (isBlobError) {
      return blobNotConfiguredResponse();
    }
    console.error('Error in /api/save:', error);
    return new Response(JSON.stringify({ error: 'Failed to save classification' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
