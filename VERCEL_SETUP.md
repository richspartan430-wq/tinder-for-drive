# Vercel Deployment Setup

## Video streaming – required

Videos are proxied via `/api/stream` because Google Drive blocks direct HTML5 playback.

1. Go to **Project → Settings → Environment Variables**
2. Add `GOOGLE_DRIVE_API_KEY` with your [Google API key](https://console.cloud.google.com/apis/credentials) (same key used in `get_files.py`)
3. Enable the Drive API in Google Cloud Console if needed
4. Redeploy

---

## Fix: "No token found" / BlobError

The app uses **Vercel Blob** for storing progress and classification results. You must enable it:

### Steps

1. **Open your Vercel project** → [vercel.com/dashboard](https://vercel.com/dashboard)
2. Go to the **Storage** tab
3. Click **Create Database** → choose **Blob**
4. Name it (e.g. `tinder-drive-blob`) and create
5. Vercel will automatically add `BLOB_READ_WRITE_TOKEN` to your project
6. **Redeploy** the project so the new env var is used

### Alternative: Manual env var

If you already have a Blob store elsewhere:

1. Project → **Settings** → **Environment Variables**
2. Add `BLOB_READ_WRITE_TOKEN` with your Blob store token
3. Redeploy

---

## Graceful fallback (without Blob)

If Blob is not configured:

- **`/api/progress`** → Returns `{ last_index: 0 }` (app loads from start)
- **`/api/export`** → Returns empty CSV with headers
- **`/api/save`** → Returns 503 with a clear error message

The app will **load** but classifications will **not persist** until Blob is set up.

---

## "Access to storage is not allowed from this context"

This browser error usually comes from:

- **Third-party cookie/storage blocking** (Chrome, Safari)
- **Embedding the app in an iframe** (cross-origin)
- **Private/incognito mode** with strict settings

**What to try:**

1. Open the app in a normal tab (not embedded)
2. Temporarily allow third-party cookies for your domain
3. Disable strict tracking prevention for the site

The app itself does **not** use `localStorage` or `sessionStorage`.

---

## No videos playing

1. **Replace DUMMY_ID in videos.json** – The default `videos.json` uses placeholder IDs. Use real Google Drive file IDs. Run `get_files.py` to fetch IDs from a public Drive folder.
2. **Make Drive folder public** – Right‑click folder → Share → “Anyone with the link can view”.
3. **Use video file IDs** – Each file in `videos.json` needs the `id` from the Drive file URL (e.g. `https://drive.google.com/file/d/ABC123xyz/view` → `ABC123xyz`).
