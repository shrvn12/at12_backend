const { default: axios } = require('axios');
var express = require('express');
require('dotenv').config();
var router = express.Router();
const YTMusic = require('ytmusic-api');

const ytmusic = new YTMusic()

function parseYouTubeDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  const hours = parseInt(match?.[1]) || 0;
  const minutes = parseInt(match?.[2]) || 0;
  const seconds = parseInt(match?.[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}


router.get('/', function(req, res, next) {
  res.render('index', { title: 'AT12' });
});

router.get('/search', async (req, res) => {
  try {
    // Initialize ytmusic library
    await ytmusic.initialize();

    const query = req.query.query;

    // Validate the query parameter
    if (!query || query === "null") {
      return res.status(400).send('Query missing or invalid!');
    }

    // Get search suggestions using ytmusic
    const result = await ytmusic.getSearchSuggestions(query);

    // Send the result as JSON response
    return res.json(result);
  } catch (err) {
    // Log the error and send a 500 status response
    console.error('Error during search:', err);
    return res.status(500).json({ error: 'An error occurred while processing the request.', details: err.message });
  }
});

router.get('/searchSong', async (req, res) => {
  try {
    // Initialize ytmusic library
    await ytmusic.initialize();

    const query = req.query.query;

    // Validate the query parameter
    if (!query || query === "null") {
      return res.status(400).send('Query missing or invalid!');
    }

    // Search for songs using the provided query
    const songs = await ytmusic.searchSongs(query);

    // Return the search results as JSON
    return res.json(songs);
  } catch (err) {
    // Log the error and send a 500 status response
    console.error('Error during song search:', err);
    return res.status(500).json({ error: 'An error occurred while processing the request.', details: err.message });
  }
});

router.get('/getQueue', async (req, res) => {
  try {
    console.log('Initializing ytmusic...');
    await ytmusic.initialize();

    const { query, videoId: providedVideoId } = req.query;
    let videoId = providedVideoId; // Allow reassignment

    console.log('Received query:', query);
    console.log('Received videoId:', videoId);

    // Validate input
    if ((!query || query === "null") && !videoId) {
      return res.status(400).send('Query/videoId missing or invalid!');
    }

    // Fetch videoId if not provided
    if (!videoId) {
      console.log('Fetching videoId using query...');
      const songs = await ytmusic.searchSongs(query);

      videoId = songs[0]?.videoId; // Use the first result's videoId
      if (!videoId) {
        return res.status(404).send('No video found for the given query.');
      }
    }

    // Fetch playlist items
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=RDAMVM${videoId}&key=${process.env.KEY}&maxResults=50`;
    console.log('Fetching playlist from URL:', apiUrl);

    const response = await axios.get(apiUrl);
    const items = response.data.items;

    if (!items || items.length === 0) {
      return res.status(404).send('No playlist items found.');
    }

    // Map playlist items to a structured format
    const list = items.map(item => ({
      id: item.snippet?.resourceId?.videoId,
      thumbnails: item.snippet?.thumbnails,
      title: item.snippet?.title,
      artist: { name: item.snippet?.videoOwnerChannelTitle }, // Placeholder for artist
      channel: item.snippet?.videoOwnerChannelTitle
    }));

    return res.json(list);
  } catch (err) {
    console.error('Error fetching queue:', err);
    return res.status(500).json({
      error: 'An error occurred while processing the request.',
      details: err.message,
    });
  }
});

// router.get('/getInfo', async (req, res) => {
//   const { id: videoId } = req.query;
//   await ytmusic.initialize();

//   // Validate the video ID parameter
//   if (!videoId) {
//     return res.status(400).send('Video ID is required.');
//   }

//   try {
//     console.log('Fetching video details...');
//     // Fetch video information from the YouTube API
//     const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${process.env.KEY}`;
//     const response = await fetch(apiUrl);
//     const data = await response.json();
//     // Check if the response contains video data
//     if (!data.items || data.items.length === 0) {
//       return res.status(404).send('Video not found.');
//     }

//     // Extract basic video details
//     const videoDetails = data.items[0];
//     const videoInfo = {
//       id: videoId,
//       title: videoDetails.snippet?.title,
//       stats: videoDetails.statistics,
//       artist: videoDetails.snippet?.channelTitle, // Placeholder for artist details
//       thumbnails: videoDetails.snippet?.thumbnails,
//       channelId: videoDetails.snippet?.channelId,
//       descrption: videoDetails.snippet?.description,
//       publishedAt: videoDetails.snippet?.publishedAt,
//       duration: parseYouTubeDuration(videoDetails.contentDetails?.duration) || 0, // Convert ISO 8601 duration to seconds
//     };

//     return res.json(videoInfo);
//   } catch (err) {
//     console.error('Error fetching video info:', err);
//     return res.status(500).json({
//       error: 'An error occurred while fetching video info.',
//       details: err.message,
//     });
//   }
// });

router.get('/getInfo', async (req, res) => {
  const { id: videoId } = req.query;
  await ytmusic.initialize();

  if (!videoId) {
    return res.status(400).send('Video ID is required.');
  }

  try {
    console.log('Fetching video details...');
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${process.env.KEY}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return res.status(404).send('Video not found.');
    }

    const videoDetails = data.items[0];
    const rawTitle = videoDetails.snippet?.title || '';
    const cleanedTitle = rawTitle
      .split('|')[0]
      .split('-')
      .slice(0, 2)
      .map(s => s.trim())
      .join(' ')
      .trim(); // Clean title: take first two elements after cleanup
    const durationISO = videoDetails.contentDetails?.duration;
    const duration = parseYouTubeDuration(durationISO);

    const videoInfo = {
      id: videoId,
      title: rawTitle,
      stats: videoDetails.statistics,
      artist: videoDetails.snippet?.channelTitle,
      thumbnails: videoDetails.snippet?.thumbnails,
      channelId: videoDetails.snippet?.channelId,
      description: videoDetails.snippet?.description,
      publishedAt: videoDetails.snippet?.publishedAt,
      duration,
      lyrics: null,
    };

    // Fetch lyrics
    const lyricsRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleanedTitle)}`);
    if (lyricsRes.ok) {
      const lyricsData = await lyricsRes.json();

      const filteredByDuration = lyricsData.filter(song => {
        return song.duration && Math.abs(Math.round(song.duration) - duration) <= 5;
      });

      const withSynced = filteredByDuration.find(song => song.syncedLyrics);
      const withPlain = filteredByDuration.find(song => song.plainLyrics);

      if (withSynced || withPlain) {
        videoInfo.lyrics = withSynced?.syncedLyrics || withPlain?.plainLyrics;
      }
    } else {
      console.warn('Lrclib fetch failed with status', lyricsRes.status);
    }

    return res.json(videoInfo);
  } catch (err) {
    console.error('Error fetching video info:', err);
    return res.status(500).json({
      error: 'An error occurred while fetching video info.',
      details: err.message,
    });
  }
});

router.get('/homeSections', async (req, res) => {
  try {
    console.log('Initializing ytmusic for India...');
    // Initialize with India region (GL) and English language (HL)
    await ytmusic.initialize({ GL: 'IN', HL: 'en' })

    console.log('Fetching India-specific home sections...');
    const result = await ytmusic.getHomeSections()

    return res.json(result)
  } catch (err) {
    console.error('Error fetching home sections:', err)
    return res.status(500).json({
      error: 'Failed to fetch India-specific home sections.',
      details: err.message,
    })
  }
})

router.get('/lyrics', async (req, res) => {
  const query = req.query.q || "";
  const duration = parseInt(req.query.duration);

  if (!query.length) {
    return res.status(400).send('Query is missing');
  }

  if (isNaN(duration)) {
    return res.status(400).send('Duration (in seconds) is required and must be a number');
  }

  try {
    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch lyrics');
    }

    const data = await response.json();
    const durationFiltered = data.filter(song => {
      const songDuration = Math.round(song.duration); // in seconds
      return Math.abs(songDuration - duration) <= 3;
    });

    const synced = durationFiltered.find(song => song.syncedLyrics);
    const plain = durationFiltered.find(song => song.plainLyrics);
    return res.json(synced || plain || { message: 'No lyrics found matching criteria' });

  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal server error');
  }
});


module.exports = router;
