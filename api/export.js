// api/export.js
import { list } from '@vercel/blob';

export default async function GET(request) {
  try {
    const csvBlobName = 'results.csv';
    const { blobs } = await list({
      prefix: csvBlobName,
      limit: 1,
    });

    if (blobs.length === 0) {
      // If results.csv doesn't exist, return an empty file with headers
      const headers = 'index,filename,drive_file_id,action,note,classified_by,timestamp\n';
      return new Response(headers, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${csvBlobName}"`,
        },
      });
    }

    // If blob exists, fetch its content and return it
    const csvBlob = blobs[0];
    const response = await fetch(csvBlob.url);
    if (!response.ok) {
        throw new Error(`Failed to fetch csv content: ${response.statusText}`);
    }
    const csvContent = await response.text();

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${csvBlobName}"`,
      },
    });

  } catch (error) {
    console.error("Error in /api/export:", error);
    return new Response(JSON.stringify({ error: 'Failed to export results' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
