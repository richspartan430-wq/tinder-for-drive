// api/save.js
import { get, put } from '@vercel/blob';

export default async function POST(request) {
  try {
    const { index, filename, drive_file_id, action, note, classified_by, timestamp } = await request.json();

    // 1. Update results.csv
    let csvContent = '';
    const csvBlobName = 'results.csv';
    try {
      const existingCsvBlob = await get(csvBlobName);
      csvContent = await existingCsvBlob.text();
    } catch (error) {
      if (error.status === 404) {
        // If results.csv doesn't exist, create header
        csvContent = 'index,filename,drive_file_id,action,note,classified_by,timestamp
';
      } else {
        throw error; // Re-throw other errors
      }
    }

    // Append new classification to CSV. Basic escaping for notes.
    // Ensure any internal double quotes are escaped and the entire note is quoted.
    const escapedNote = `"${note.replace(/"/g, '""')}"`;
    const newCsvLine = `${index},"${filename}","${drive_file_id}",${action},${escapedNote},${classified_by},${timestamp}
`;
    csvContent += newCsvLine;

    await put(csvBlobName, csvContent, { access: 'public' });

    // 2. Update progress.json
    const progressBlobName = 'progress.json';
    let progress = { last_index: 0 }; // Default if file doesn't exist
    try {
        const existingProgressBlob = await get(progressBlobName);
        progress = JSON.parse(await existingProgressBlob.text());
    } catch (error) {
        if (error.status !== 404) {
            throw error; // Re-throw other errors, but ignore if file not found
        }
    }

    // Update last_index if the current video's 1-based index is greater than or equal to the last recorded index.
    // The frontend requests last_index + 1. So if we classified index X, the next video is X+1.
    // The `last_index` in progress.json should reflect the index of the last *processed* video.
    if (index > progress.last_index) {
        progress.last_index = index;
        await put(progressBlobName, JSON.stringify(progress), { access: 'public' });
    }

    return new Response(JSON.stringify({ message: 'Classification saved successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Error in /api/save:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
