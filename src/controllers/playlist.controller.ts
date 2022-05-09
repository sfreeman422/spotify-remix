import express, { Router } from 'express';
import { SpotifyService } from '../services/spotify/spotify.service';

export const playlistController: Router = express.Router();

const spotifyService = new SpotifyService();

playlistController.get('/playlists', async (req, res) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (accessToken) {
    spotifyService
      .getUserPlaylists(accessToken)
      .then(x => res.send(x))
      .catch(e => {
        console.log(e);
        res.send(e);
      });
  } else {
    res.status(400).send('Missing access token!');
  }
});

playlistController.put('/playlist/:playlistId/subscribe', async (req, res) => {
  const accessToken = req?.headers?.authorization?.split(' ')[1];
  const { playlistId } = req.params;

  if (accessToken && playlistId) {
    const subscribedUser = await spotifyService.subscribeToPlaylist(accessToken, playlistId).catch(e => {
      console.error(e);
      res.status(500).send('Unable to subscribe to the playlist. Please try again later.');
    });
    if (subscribedUser) {
      // refresh the playlist;
      spotifyService
        .populatePlaylist(playlistId)
        .then(_ => {
          res.status(200).send('Successfully subscribed and populated the playlist.');
        })
        .catch(e => {
          console.error(e);
          res.status(500).send('Unable to populate the playlist. Please try again later');
        });
    } else {
      res.status(204).send('You are already a member of this playlist.');
    }
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
