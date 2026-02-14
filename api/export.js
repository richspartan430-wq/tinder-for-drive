// api/export.js
import { get } from '@vercel/blob';

export default async function GET(request) {
  try {
    const csvBlobName = 'results.csv';
    const blob = await get(csvBlobName);
    const csvContent = await blob.text();

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${csvBlobName}"`,
      },
    });
  } catch (error) {
    console.error("Error in /api/export:", error);
    // If results.csv doesn't exist, return an empty file with headers
    if (error.status === 404) {
      return new Response('index,filename,drive_file_id,action,note,classified_by,timestamp
', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="results.csv"`,
        },
      });
    }
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
