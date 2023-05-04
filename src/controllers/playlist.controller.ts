import express, { Router } from 'express';
import { SpotifyService } from '../services/spotify/spotify.service';

export const playlistController: Router = express.Router();

const spotifyService = new SpotifyService();

playlistController.get('/playlists', (req, res) => {
  console.log(
    JSON.stringify({
      level: 'log',
      name: 'playlistController',
      route: '/playlists',
      method: 'GET',
      time: new Date(),
      message: `/playlists route hit calling spotifyService.getUserPlaylists()`,
    }),
  );
  const accessToken = req.headers.authorization?.split(' ')[1];
  if (accessToken) {
    spotifyService
      .getUserPlaylists(accessToken)
      .then(x => {
        console.log(
          JSON.stringify({
            level: 'log',
            name: 'playlistController',
            route: '/playlists',
            method: 'GET',
            time: new Date(),
            message: `spotifyService.getUserPlaylists() call succeeded`,
          }),
        );
        res.send(x);
      })
      .catch(e => {
        console.error(
          JSON.stringify({
            level: 'log',
            name: 'playlistController',
            route: '/playlists',
            method: 'GET',
            time: new Date(),
            message: `spotifyService.getUserPlaylists() call failed`,
            error: e,
          }),
        );
        if (e?.message === 'Unable to authenticate user') {
          res.status(401).send(e);
        } else {
          res.status(500).send(e);
        }
      });
  } else {
    console.log(
      JSON.stringify({
        level: 'error',
        name: 'playlistController',
        route: '/playlists',
        method: 'GET',
        time: new Date(),
        message: `returning 400, missing accessToken`,
      }),
    );
    res.status(400).send('Missing access token!');
  }
});

playlistController.put('/playlist/:playlistId/subscribe', (req, res) => {
  const accessToken = req?.headers?.authorization?.split(' ')[1];
  const { playlistId } = req.params;

  console.log(
    JSON.stringify({
      level: 'log',
      name: 'playlistController',
      route: `/playlist/${playlistId}/subscribe`,
      method: 'PUT',
      time: new Date(),
      message: `/playlist/${playlistId}/subscribe route hit - calling SpotifyService.subscribeToPlaylist()`,
    }),
  );

  if (accessToken && playlistId) {
    spotifyService
      .subscribeToPlaylist(accessToken, playlistId)
      .then(subscribedUser => {
        if (subscribedUser) {
          console.log(
            JSON.stringify({
              level: 'log',
              name: 'playlistController',
              route: `/playlist/${playlistId}/subscribe`,
              method: 'PUT',
              time: new Date(),
              message: `spotifyService.subscribeToPlaylist() call succeeded with ${subscribedUser} - calling spotifyService.refreshPlaylist(${playlistId})`,
            }),
          );
          // Intentionally not returning this as it might take awhile.
          spotifyService
            .refreshPlaylist(playlistId)
            .then(_ => {
              console.log(
                JSON.stringify({
                  level: 'log',
                  name: 'playlistController',
                  route: `/playlist/${playlistId}/subscribe`,
                  method: 'PUT',
                  time: new Date(),
                  message: `spotifyService.refreshPlaylist(${playlistId}) call succeeded`,
                }),
              );
            })
            .catch(e => {
              console.log(
                JSON.stringify({
                  level: 'error',
                  name: 'playlistController',
                  route: `/playlist/${playlistId}/subscribe`,
                  method: 'PUT',
                  time: new Date(),
                  message: `spotifyService.refreshPlaylist(${playlistId}) call failed`,
                  error: e,
                }),
              );
            });
          res.status(200).send({ message: 'Successfully subscribed to the playlist! A refresh will occur shortly...' });
        } else {
          console.log(
            JSON.stringify({
              level: 'log',
              name: 'playlistController',
              route: `/playlist/${playlistId}/subscribe`,
              method: 'PUT',
              time: new Date(),
              message: `spotifyService.subscribeToPlaylist() call succeeded with ${subscribedUser} however, this user is already subscribed.)`,
            }),
          );
          res.status(204).send('You are already a member of this playlist.');
        }
      })
      .catch(e => {
        console.log(
          JSON.stringify({
            level: 'log',
            name: 'playlistController',
            route: `/playlist/${playlistId}/subscribe`,
            method: 'PUT',
            time: new Date(),
            message: `spotifyService.subscribeToPlaylist() call failed.`,
            error: e,
          }),
        );
        res.status(500).send('Unable to subscribe to the playlist. Please try again later.');
      });
  } else {
    console.log(
      JSON.stringify({
        level: 'error',
        name: 'playlistController',
        route: `/playlist/${playlistId}/subscribe`,
        method: 'PUT',
        time: new Date(),
        message: `spotifyService.subscribeToPlaylist() call was not initiated due to missing playlistId=${!playlistId} or authorization=${!accessToken}`,
      }),
    );
    res.status(400).send('PlaylistId or Authorization header missing!');
  }
});

playlistController.post('/playlist', (req, res) => {
  const { authorization } = req.headers;
  console.log(
    JSON.stringify({
      level: 'log',
      name: 'playlistController',
      route: `/playlist`,
      method: 'POST',
      time: new Date(),
      message: `/playlist route hit attempting to call spotifyService.createUserPlaylist()`,
    }),
  );
  if (authorization) {
    spotifyService
      .createUserPlaylist(authorization)
      .then(() => {
        console.log(
          JSON.stringify({
            level: 'log',
            name: 'playlistController',
            route: `/playlist`,
            method: 'POST',
            time: new Date(),
            message: `spotifyService.createUserPlaylist() succeeded`,
          }),
        );
        res.send();
      })
      .catch(e => {
        console.log(
          JSON.stringify({
            level: 'log',
            name: 'playlistController',
            route: `/playlist`,
            method: 'POST',
            time: new Date(),
            message: `spotifyService.createUserPlaylist() failed`,
            error: e,
          }),
        );
        res.status(500).send(e);
      });
  } else {
    console.log(
      JSON.stringify({
        level: 'error',
        name: 'playlistController',
        route: `/playlist`,
        method: 'POST',
        time: new Date(),
        message: `spotifyService.createUserPlaylist() not called due to missing accessToken`,
      }),
    );
    res.status(400).send('Missing access token!');
  }
});

// Should delete the given playlist by Id
playlistController.delete('/playlist', async (req, res) => {
  const { playlists } = req.body;
  const { authorization } = req.headers;
  console.log(
    JSON.stringify({
      level: 'log',
      name: 'playlistController',
      route: `/playlist`,
      method: 'DELETE',
      time: new Date(),
      message: `/playist route hit - calling spotifyService.removePlaylist()`,
    }),
  );
  if (authorization && playlists) {
    const accessToken = authorization.split(' ')[1];
    try {
      const removal = await spotifyService.removePlaylist(accessToken, playlists);
      console.log(
        JSON.stringify({
          level: 'log',
          name: 'playlistController',
          route: `/playlist`,
          method: 'DELETE',
          time: new Date(),
          message: `spotifyService.removePlaylist() succeeded`,
        }),
      );
      res.send(removal);
    } catch (e) {
      console.error(
        JSON.stringify({
          level: 'error',
          name: 'playlistController',
          route: `/playlist`,
          method: 'DELETE',
          time: new Date(),
          message: `spotifyService.removePlaylist() failed`,
          error: e,
        }),
      );
      res.status(500).send(e);
    }
  } else {
    let message;
    if (!authorization) {
      message = 'Missing authorization header';
    } else if (!playlists) {
      message = 'Missing playlists';
    }
    console.log(
      JSON.stringify({
        level: 'log',
        name: 'playlistController',
        route: `/playlist`,
        method: 'DELETE',
        time: new Date(),
        message: `spotifyService.removePlaylist() call not initiated due to missing authorization=${!authorization} or playlists=${!playlists.length}`,
      }),
    );
    res.status(400).send(message);
  }
});

playlistController.post('/refresh/:playlistId', (req, res) => {
  const { playlistId } = req.params;
  const { authorization } = req.headers;
  console.log(
    JSON.stringify({
      level: 'log',
      name: 'playlistController',
      route: `/refresh/${playlistId}`,
      method: 'POST',
      time: new Date(),
      message: `/refresh/${playlistId} hit attempting to call spotifyService.refreshPlaylist(${playlistId})`,
    }),
  );

  if (playlistId && authorization === process.env.SPOTIFY_REMIX_API_KEY) {
    spotifyService
      .refreshPlaylist(playlistId)
      .then(_ => {
        console.log(
          JSON.stringify({
            level: 'log',
            name: 'playlistController',
            route: `/refresh/${playlistId}`,
            method: 'POST',
            time: new Date(),
            message: `spotifyService.refreshPlaylist(${playlistId}) call succeeded`,
            response: _,
          }),
        );
        res.status(200).send('Successfully refreshed the playlist.');
      })
      .catch(e => {
        console.log(
          JSON.stringify({
            level: 'log',
            name: 'playlistController',
            route: `/refresh/${playlistId}`,
            method: 'POST',
            time: new Date(),
            message: `spotifyService.refreshPlaylist(${playlistId}) call failed`,
            error: e,
          }),
        );
        res.status(500).send('Unable to refresh to the playlist. Please try again later.');
      });
  } else {
    console.log(
      JSON.stringify({
        level: 'log',
        name: 'playlistController',
        route: `/refresh/${playlistId}`,
        method: 'POST',
        time: new Date(),
        message: `spotifyService.refreshPlaylist(${playlistId}) call not initiated due to missing playlistId=${!playlistId} or authorization=${!authorization}`,
      }),
    );
    res.status(400).send('PlaylistId or authorization header missing!');
  }
});

playlistController.get('/playlist/:playlistId/history', (req, res) => {
  const { playlistId } = req.params;
  console.log(
    JSON.stringify({
      level: 'log',
      name: 'playlistController',
      route: `/playlist/:playlistId/history`,
      method: 'GET',
      time: new Date(),
      message: `/playlist/${playlistId}/history hit attempting to call spotifyService.getPlaylistHistory(${playlistId})`,
    }),
  );
  if (playlistId) {
    spotifyService.getPlaylistHistory(playlistId).then(x => {
      console.log(
        JSON.stringify({
          level: 'log',
          name: 'playlistController',
          route: `/playlist/:playlistId/history`,
          method: 'GET',
          time: new Date(),
          message: `spotifyService.getPlaylistHistory(${playlistId}) succeeded`,
        }),
      );
      res.send(x);
    });
  } else {
    console.error(
      JSON.stringify({
        level: 'error',
        name: 'playlistController',
        route: `/playlist/:playlistId/history`,
        method: 'GET',
        time: new Date(),
        message: `spotifyService.getPlaylistHistory(${playlistId}) was not initiated due to missing playlistId=${playlistId}`,
      }),
    );
    res.status(400).send('PlaylistId missing!');
  }
});
