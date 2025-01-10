const { default: axios } = require('axios');
var express = require('express');
require('dotenv').config();
var router = express.Router();
const YTMusic = require('ytmusic-api');

const ytmusic = new YTMusic()
/* GET users listing. */
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
  await ytmusic.initialize();
  const query = req.query.query;
  
  // Check if the query parameter is missing or invalid
  if (!query || query === "null") {
    return res.status(400).send('Query missing or invalid!');
  }

  try {
    // Search for songs using ytmusic
    const songs = await ytmusic.searchSongs(query);
    const videoId = songs[0]?.videoId;
    console.log(videoId);
    if (!videoId) {
      return res.status(404).send('No video found for the given query.');
    }

    // Fetch playlist items from YouTube API
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=RDAMVM${videoId}&key=${process.env.key}&maxResults=100`);
    
    // Map the playlist items to the desired structure
    const list = response.data.items.map(item => ({
      id: item.snippet?.resourceId?.videoId,
      thumbnails: item.snippet?.thumbnails
    }));

    return res.json(list);
  } catch (err) {
    // Handle any errors that occur during the process
    console.error('Error fetching queue:', err);
    return res.status(500).json({ error: 'An error occurred while processing the request.', details: err.message });
  }
});

router.get('/getInfo', async (req, res) => {
  const videoId = req.query.id;

  // Validate the ID parameter
  if (!videoId) {
    return res.status(400).send('Video ID is required');
  }

  try {
    // Fetch video information from the YouTube API
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${process.env.key}`);
    const data = await response.json();

    // Check if the response contains video data
    if (!data.items || data.items.length === 0) {
      return res.status(404).send('Video not found');
    }

    // Extract relevant video details
    const videoDetails = data.items[0];
    const videoInfo = {
      id: videoId,
      title: videoDetails.snippet?.title,
      stats: videoDetails.statistics,
      artist: videoDetails.snippet?.channelTitle,
    };

    // Send the video information as a JSON response
    return res.json(videoInfo);
  } catch (err) {
    // Log any error and send a 500 status response
    console.error('Error fetching video info:', err);
    return res.status(500).json({ error: 'An error occurred while fetching video info.', details: err.message });
  }
});

module.exports = router;
