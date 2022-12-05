import express, { Router } from 'express';
import { SpotifyService } from '../services/spotify/spotify.service';

export const playlistController: Router = express.Router();

const spotifyService = new SpotifyService();

playlistController.get('/playlists', (req, res) => {
  console.log('playlistController - GET - /playlists has been called');
  console.log(req);
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (accessToken) {
    spotifyService
      .getUserPlaylists(accessToken)
      .then(x => {
        console.log('playlistController - GET - /playlists call as been completed.');
        console.log(x);
        res.send(x);
      })
      .catch(e => {
        console.log('playlistController - GET - /playlists call as been errored.');
        console.error(e.message);
        if (e?.message === 'Unable to authenticate user') {
          res.status(401).send(e);
        } else {
          res.status(500).send(e);
        }
      });
  } else {
    console.log('playlistController - GET - /playlists call as been errored due to a missing access token.');
    res.status(400).send('Missing access token!');
  }
});

playlistController.put('/playlist/:playlistId/subscribe', (req, res) => {
  const accessToken = req?.headers?.authorization?.split(' ')[1];
  const { playlistId } = req.params;

  console.log('playlistController - PUT - /playlist/:playlistId/subscribe has been called');
  console.log(req);

  if (accessToken && playlistId) {
    console.log(
      'playlistController - PUT - /playlist/:playlistId/subscribe call has initiated subscribeToPlaylist method for ',
      playlistId,
    );
    spotifyService
      .subscribeToPlaylist(accessToken, playlistId)
      .then(subscribedUser => {
        console.log(
          'playlistController - PUT - /playlist/:playlistId/subscribe call has completed subscribeToPlaylist method for ',
          playlistId,
        );
        console.log(subscribedUser);
        if (subscribedUser) {
          console.log(
            'playlistController - PUT - /playlist/:playlistId/subscribe call is calling spotifyService.refreshPlaylist for ',
            playlistId,
          );
          // Intentionally not returning this as it might take awhile.
          spotifyService
            .refreshPlaylist(playlistId)
            .then(_ => {
              console.log(
                'playlistController - PUT - /playlist/:playlistId/subscribe spotifyService.refreshPlaylist for ',
                playlistId,
                ' has completed successfully',
              );
            })
            .catch(e => {
              console.log(
                'playlistController - PUT - /playlist/:playlistId/subscribe spotifyService.refreshPlaylist for ',
                playlistId,
                ' has failed.',
              );
              console.error(e);
            });
          res.status(200).send({ message: 'Successfully subscribed to the playlist! A refresh will occur shortly...' });
        } else {
          res.status(204).send('You are already a member of this playlist.');
        }
      })
      .catch(e => {
        console.log(
          'playlistController - PUT - /playlist/:playlistId/subscribe call to subscribeToPlaylist method for ',
          playlistId,
          ' has failed',
        );
        console.error(e);
        res.status(500).send('Unable to subscribe to the playlist. Please try again later.');
      });
  } else {
    res.status(400).send('PlaylistId or Authorization header missing!');
  }
});

playlistController.post('/playlist', (req, res) => {
  const { authorization } = req.headers;
  console.log(
    'playlistController - POST - /playlist call has initiated createUserPlayslist with authorization: ',
    authorization,
  );
  if (authorization) {
    spotifyService
      .createUserPlaylist(authorization)
      .then(() => {
        console.log(
          'playlistController - POST - /playlist call to createUserPlayslist with authorization: ',
          authorization,
          ' has succeeded',
        );
        res.send();
      })
      .catch(e => {
        console.log(
          'playlistController - POST - /playlist call to createUserPlayslist with authorization: ',
          authorization,
          ' has failed',
        );
        console.error(e);
        res.status(500).send(e);
      });
  } else {
    res.status(400).send('Missing access token!');
  }
});

// Should delete the given playlist by Id
playlistController.delete('/playlist', async (req, res) => {
  const { playlists } = req.body;
  const { authorization } = req.headers;
  if (authorization && playlists) {
    const accessToken = authorization.split(' ')[1];
    try {
      const removal = await spotifyService.removePlaylist(accessToken, playlists);
      res.send(removal);
    } catch (e) {
      // This should not just be a 500 but should be more reflective of true error state.
      res.status(500).send(e);
    }
  } else {
    let message;
    if (!authorization) {
      message = 'Missing authorization header';
    } else if (!playlists) {
      message = 'Missing playlists';
    }
    res.status(400).send(message);
  }
});

playlistController.post('/refresh/:playlistId', (req, res) => {
  const { playlistId } = req.params;
  const { authorization } = req.headers;
  console.log(
    'playlistController - POST - /refresh/:playlistId call has initiated refreshPlaylist with authorization: ',
    authorization,
    ' and playlistId ',
    playlistId,
  );

  if (playlistId && authorization === process.env.SPOTIFY_REMIX_API_KEY) {
    spotifyService
      .refreshPlaylist(playlistId)
      .then(_ => {
        console.log(
          'playlistController - POST - /refresh/:playlistId call has initiated refreshPlaylist with authorization: ',
          authorization,
          ' and playlistId ',
          playlistId,
          ' has succeeded',
        );
        console.log(_);
        res.status(200).send('Successfully refreshed the playlist.');
      })
      .catch(e => {
        console.log(
          'playlistController - POST - /refresh/:playlistId call has initiated refreshPlaylist with authorization: ',
          authorization,
          ' and playlistId ',
          playlistId,
          ' has failed',
        );
        console.error(e);
        res.status(500).send('Unable to refresh to the playlist. Please try again later.');
      });
  } else {
    console.log(
      'playlistController - POST - /refresh/:playlistId call has with authorization: ',
      authorization,
      ' and playlistId ',
      playlistId,
      ' has failed due to missing playlistId or authorization header',
    );
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
