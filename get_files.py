import requests
import json

def list_public_drive_folder_file_ids(folder_id, api_key):
    """
    Lists file IDs and names from a public Google Drive folder.
    """
    url = "https://www.googleapis.com/drive/v3/files"
    params = {
        'q': f"'{folder_id}' in parents and trashed=false",
        'key': api_key,
        'fields': 'files(id, name), nextPageToken',
        'pageSize': 1000  # You can list up to 1000 files at a time
    }

    all_files = []
    page_token = None

    while True:
        if page_token:
            params['pageToken'] = page_token

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            files = data.get('files', [])
            for file in files:
                all_files.append({
                    'id': file['id'],
                    'name': file['name']
                })

            page_token = data.get('nextPageToken')
            if not page_token:
                break

        except requests.exceptions.RequestException as e:
            print(f"Error making API request: {e}")
            return []
        except ValueError:
            print("Error: Could not parse JSON response.")
            return []

    return all_files


if __name__ == "__main__":
    FOLDER_ID = "1F8qZ5oPohSNVhkg8Di-YXdCpN2jKkcnC"
    API_KEY = "AIzaSyDysjQLiMPVwXGkwLLhWby7nRek-jYPtzA"  # <-- PASTE YOUR API KEY HERE

    if API_KEY == "YOUR_GOOGLE_API_KEY":
        print("Please replace 'YOUR_GOOGLE_API_KEY' with your actual API key.")
    else:
        file_ids_and_names = list_public_drive_folder_file_ids(FOLDER_ID, API_KEY)

        if file_ids_and_names:
            video_list = []

            for idx, item in enumerate(file_ids_and_names):
                if ".mp4" in item['name'].lower():
                    try:
                        # Extract number from filename like: "Useful Product Hacks (123).mp4"
                        video_index = int(item['name'].split('(')[1].split(')')[0])

                        video_list.append({
                            "index": video_index,
                            "name": item['name'],
                            "id": item['id']
                        })

                    except (IndexError, ValueError):
                        # Fallback for files that don't match naming pattern
                        video_list.append({
                            "index": idx + 1,
                            "name": item['name'],
                            "id": item['id']
                        })

            # Sort by extracted index
            video_list.sort(key=lambda x: x['index'])

            # Save to JSON file
            with open('videos.json', 'w') as f:
                json.dump(video_list, f, indent=2)

            print("Successfully created 'videos.json' with all your video files.")
        else:
            print("No files found or an error occurred.")
