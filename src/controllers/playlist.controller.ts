import express, { Router } from 'express';
import { SpotifyService } from '../services/spotify/spotify.service';

export const playlistController: Router = express.Router();

const spotifyService = new SpotifyService();

// Should show all of the playlists that a user is subscribed to?
// Maybe should only be subset of playlists that we manage?
playlistController.get('/playlists', async (req, res) => {
  const { authorization } = req.headers;
  if (authorization) {
    spotifyService
      .getUserPlaylists(authorization)
      .then(x => res.send(x))
      .catch(e => {
        console.log(e);
        res.send(e);
      });
  } else {
    res.status(400).send('Missing access token!');
  }
});

playlistController.get('/playlist/:playlistId/subscribe', (req, res) => {
  if (req.headers.authorization && req.params.playlistId) {
    spotifyService.subscribeToPlaylist(req.headers.authorization, req.params.playlistId).then(x => {
      res.send(x);
    });
  }
  res.status(400).send('PlaylistId or Authorization header missing!');
});

// Should create a new playlist for the user that is public and available to be shared with others.
playlistController.post('/playlist', (req, res) => {
  const { authorization } = req.headers;
  if (authorization) {
    spotifyService
      .createUserPlaylist(authorization)
      .then(x => res.send(x.data))
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  } else {
    res.status(400).send('Missing access token!');
  }
});

// Should delete the given playlist by Id
playlistController.delete('/playlist/:playlistId', (req, _res) => {
  const { accessToken } = req.body;
  return spotifyService.removeUserPlaylist(accessToken);
});

playlistController.post('/playlist/subscribe', (req, _res) => {
  const { playlistId, accessToken } = req.body;
  return spotifyService.subscribeToPlaylist(accessToken, playlistId);
});
