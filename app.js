// frontend/app.js

const videoPlayer = document.getElementById('videoPlayer');
const noteInput = document.getElementById('noteInput');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const videoIndexSpan = document.getElementById('videoIndex');
const videoTotalSpan = document.getElementById('videoTotal');
const classifierNameSelect = document.getElementById('classifierName');
const loadingSpinner = document.getElementById('loadingSpinner');

let allVideos = [];
let currentIndex = 0;
// Google Drive direct download link format for streaming
const STREAM_URL_BASE = "https://drive.google.com/uc?export=download&id=";

// Function to show/hide loading spinner
function showLoading(isLoading) {
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
    // Hide video element when loading to prevent flickering or incomplete frames
    videoPlayer.style.display = isLoading ? 'none' : 'block';
}

const LOAD_TIMEOUT_MS = 12000;

function handleVideoLoadFail(video, reason) {
    showLoading(false);
    console.error("Video load failed:", video?.name, video?.id, reason);
    alert(`Video failed to load: ${video?.name || 'Unknown'}. Replace DUMMY_ID in videos.json with real Google Drive file IDs. Skipping...`);
    handleSwipe('skip');
}

// Function to load a video
async function loadVideo(index) {
    if (index >= 0 && index < allVideos.length) {
        showLoading(true);
        currentIndex = index;
        const video = allVideos[currentIndex];

        if (String(video.id || '').toUpperCase().includes('DUMMY')) {
            handleVideoLoadFail(video, 'Placeholder ID');
            return;
        }

        videoPlayer.src = STREAM_URL_BASE + video.id;
        noteInput.value = '';

        videoIndexSpan.textContent = currentIndex + 1;
        videoTotalSpan.textContent = allVideos.length;

        let loadSettled = false;
        const settle = (reason) => {
            if (loadSettled) return;
            loadSettled = true;
            clearTimeout(loadTimeout);
            videoPlayer.oncanplaythrough = null;
            videoPlayer.onerror = null;
            if (reason === 'ok') {
                showLoading(false);
                videoPlayer.play().catch(e => console.warn("Autoplay prevented:", e));
            } else {
                handleVideoLoadFail(video, reason);
            }
        };

        const loadTimeout = setTimeout(() => settle('timeout'), LOAD_TIMEOUT_MS);
        videoPlayer.oncanplaythrough = () => settle('ok');
        videoPlayer.onerror = () => settle('error');

        videoPlayer.load();
    } else if (allVideos.length > 0) {
        // All videos processed
        alert("All videos classified! You've reached the end.");
        videoPlayer.style.display = 'none'; // Hide video player
        showLoading(false);
    } else {
        // No videos loaded at all
        alert("No videos available to classify. Please check videos.json.");
        showLoading(false);
    }
}

// Function to save classification
async function saveClassification(action) {
    const video = allVideos[currentIndex];
    const data = {
        index: video.index, // Original index from videos.json
        filename: video.name,
        drive_file_id: video.id,
        action: action, // 'left', 'right', or 'skip'
        note: noteInput.value,
        classified_by: classifierNameSelect.value,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            // Handle HTTP errors
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        console.log(`Classification saved: ${action} for ${video.name}`);
        return true; // Indicate success
    } catch (error) {
        console.error("Error saving classification:", error);
        alert(`Failed to save classification: ${error.message}. Please try again.`);
        return false; // Indicate failure
    }
}

// Handle swipe action (left, right, or skip)
async function handleSwipe(action) {
    // Disable buttons to prevent double-submitting
    leftButton.disabled = true;
    rightButton.disabled = true;
    
    const saved = await saveClassification(action);
    
    // Re-enable buttons
    leftButton.disabled = false;
    rightButton.disabled = false;

    // Advance on success, or on skip (so load failures don't trap the user)
    if (saved || action === 'skip') {
        loadVideo(currentIndex + 1);
    }
}

// Event Listeners
leftButton.addEventListener('click', () => handleSwipe('left'));
rightButton.addEventListener('click', () => handleSwipe('right'));

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Only respond to key presses if no input field is focused
    if (document.activeElement === noteInput) {
        return;
    }

    if (event.key === 'ArrowLeft') {
        handleSwipe('left');
    } else if (event.key === 'ArrowRight') {
        handleSwipe('right');
    } else if (event.key === ' ') {
        event.preventDefault(); // Prevent page scrolling with spacebar
        if (videoPlayer.paused) {
            videoPlayer.play();
        } else {
            videoPlayer.pause();
        }
    }
});

// Load videos data and initial progress
async function init() {
    try {
        // Load videos.json
        const videosResponse = await fetch('videos.json');
        if (!videosResponse.ok) {
            throw new Error(`Failed to load videos.json: ${videosResponse.status}`);
        }
        allVideos = await videosResponse.json();

        const hasRealIds = allVideos.some(v => !String(v?.id || '').toUpperCase().includes('DUMMY'));
        if (!hasRealIds && allVideos.length > 0) {
            alert('videos.json contains only placeholder IDs (DUMMY_ID). Add real Google Drive file IDs to play videos. Use get_files.py to fetch IDs from a Drive folder.');
            showLoading(false);
            return;
        }

        videoTotalSpan.textContent = allVideos.length;

        // Fetch current progress (fallback to 0 on failure)
        let lastIndex = 0;
        try {
            const progressResponse = await fetch('/api/progress');
            if (progressResponse.ok) {
                const progressData = await progressResponse.json();
                lastIndex = parseInt(progressData.last_index, 10);
                if (isNaN(lastIndex) || lastIndex < 0 || lastIndex >= allVideos.length) {
                    lastIndex = 0;
                }
            }
        } catch (e) {
            console.warn('Could not load progress, starting from beginning:', e);
        }

        currentIndex = lastIndex;
        loadVideo(currentIndex);

    } catch (error) {
        console.error("Error initializing app:", error);
        alert(`Failed to initialize app: ${error.message}. Check console for details.`);
        showLoading(false); // Hide loading on error
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Optional: Hide note input when video plays, show when paused
videoPlayer.addEventListener('pause', () => {
    // You might want to keep it visible if the user prefers to type while watching
    // For now, let's keep it simple and assume it's always available
});

videoPlayer.addEventListener('play', () => {
    // No specific action for now
});
