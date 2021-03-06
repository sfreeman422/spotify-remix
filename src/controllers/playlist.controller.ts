import express, { Router } from 'express';
import { SpotifyService } from '../services/spotify/spotify.service';

export const playlistController: Router = express.Router();

const spotifyService = new SpotifyService();

playlistController.get('/playlists', (req, res) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (accessToken) {
    spotifyService
      .getUserPlaylists(accessToken)
      .then(x => res.send(x))
      .catch(e => {
        console.log(e);
        res.status(500).send(e);
      });
  } else {
    res.status(400).send('Missing access token!');
  }
});

playlistController.put('/playlist/:playlistId/subscribe', (req, res) => {
  const accessToken = req?.headers?.authorization?.split(' ')[1];
  const { playlistId } = req.params;

  if (accessToken && playlistId) {
    spotifyService
      .subscribeToPlaylist(accessToken, playlistId)
      .then(subscribedUser => {
        if (subscribedUser) {
          // Intentionally not returning this as it might take awhile.
          spotifyService
            .refreshPlaylist(playlistId)
            .then(_ => console.log('Successfully refresh playlist', playlistId))
            .catch(e => {
              console.error('Unable to refresh playlist', playlistId);
              console.error(e);
            });
          res.status(200).send({ message: 'Successfully subscribed to the playlist! A refresh will occur shortly...' });
        } else {
          res.status(204).send('You are already a member of this playlist.');
        }
      })
      .catch(e => {
        console.error(e);
        res.status(500).send('Unable to subscribe to the playlist. Please try again later.');
      });
  } else {
    res.status(400).send('PlaylistId or Authorization header missing!');
  }
});

// Should create a new playlist for the user that is public and available to be shared with others.
playlistController.post('/playlist', (req, res) => {
  const { authorization } = req.headers;
  if (authorization) {
    spotifyService
      .createUserPlaylist(authorization)
      .then(_ => res.send())
      .catch(e => {
        console.error(e);
        res.status(500).send(e);
      });
  } else {
    res.status(400).send('Missing access token!');
  }
});

// Should delete the given playlist by Id
playlistController.delete('/playlist', (req, res) => {
  const { playlists } = req.body;
  const { authorization } = req.headers;
  if (authorization && playlists) {
    const accessToken = authorization.split(' ')[1];
    res.send(spotifyService.removePlaylist(accessToken, playlists));
  } else {
    res.status(400).send('Missing authorization or playlists');
  }
});

playlistController.post('/refresh/:playlistId', (req, res) => {
  const { playlistId } = req.params;
  const { authorization } = req.headers;

  if (playlistId && authorization === process.env.SPOTIFY_REMIX_API_KEY) {
    spotifyService
      .refreshPlaylist(playlistId)
      .then(_ => {
        res.status(200).send('Successfully refreshed the playlist.');
      })
      .catch(e => {
        console.error(e);
        res.status(500).send('Unable to refresh to the playlist. Please try again later.');
      });
  } else {
    res.status(400).send('PlaylistId or authorization header missing!');
  }
});

playlistController.get('/playlist/:playlistId/history', (req, res) => {
  const { playlistId } = req.params;

  if (playlistId) {
    spotifyService.getPlaylistHistory(playlistId).then(x => res.send(x));
  } else {
    res.status(400).send('PlaylistId or authorization header missing!');
  }
});
