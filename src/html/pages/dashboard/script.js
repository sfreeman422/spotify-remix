let playlists;
const accessTokenName = 'spotify-remix-access-token';
const refreshTokenName = 'spotify-remix-refresh-token';
const redirectTokenName = 'spotify-remix-redirect-to';

function setTokens(accessToken, refreshToken) {
  localStorage.setItem(accessTokenName, accessToken);
  localStorage.setItem(refreshTokenName, refreshToken);
}

function getAndSetTokens() {
  const redirectTo = localStorage.getItem(redirectTokenName);
  const params = new URLSearchParams(window.location.search);
  const paramAccessToken = params.get('accessToken');
  const paramRefreshToken = params.get('refreshToken');

  if (redirectTo) {
    setTokens(paramAccessToken, paramRefreshToken);
    localStorage.removeItem(redirectTokenName);
    window.location = redirectTo;
  }

  if (paramAccessToken && paramRefreshToken) {
    setTokens(paramAccessToken, paramRefreshToken);
  } else {
    window.location = `${window.location.protocol}//${window.location.host}/login`;
  }
}

function getPlaylistsAndBuildDivs() {
  const accessToken = localStorage.getItem('spotify-remix-access-token');
  fetch('/playlists', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then(x => x.json())
    .then(x => {
      const playlistDiv = document.getElementById('playlists');
      playlistDiv.innerHTML = '';
      playlists = x;
      if (x.orphanPlaylists && x.orphanPlaylists.length > 0) {
        playlistDiv.innerHTML += `<div>
                    <h3 class="white">Orphaned Remixes</h3>
                    <button onclick="removeOrphanedPlaylists()">Remove Orphaned Playlists</button>
                    <div class="playlist" id="orphan-playlists"></div>
                    </div>`;
        x.orphanPlaylists.map(
          item =>
            (document.getElementById('orphan-playlists').innerHTML += `
                  <div class="card">
                  <h3>${item}</h3>
                  </div>`),
        );
      }

      playlistDiv.innerHTML += `<div>
                    <h3 class="white">Your Remixes</h3>
                    <button id="create-playlist-button" onclick="createPlaylist()">Create a New Remix Playlist</button>
                    <div class="playlist" id="managed-playlists"></div>
                    </div>`;

      if (x.ownedPlaylists && x.ownedPlaylists.length > 0) {
        x.ownedPlaylists.map(
          item =>
            (document.getElementById('managed-playlists').innerHTML += `
                  <div class="card">
                  <h3>${item.name}</h3>
                  <p>${item.tracks.total} tracks</p>
                  <a href=${item.external_urls.spotify}>${item.external_urls.spotify}</a>
                  <p>${item.description}</p>
                  <p>Invite your friends using this link:</p>
                  <a href="${window.location.protocol}//${window.location.host}/playlist?playlistId=${item.id}">
                    <span>${window.location.protocol}//${window.location.host}/playlist?playlistId=${item.id}</span>
                  </a>
                  </div>`),
        );
      }

      document.getElementById('playlists').innerHTML += `<div>
                    <h3 class="white">Your Followed Remixes</h3>
                    <div class="playlist" id="subbed-playlists"></div>
                    </div>`;

      if (x.subscribedPlaylists && x.subscribedPlaylists.length > 0) {
        x.subscribedPlaylists.map(
          item =>
            (document.getElementById('subbed-playlists').innerHTML += `<div class="card">
                  <h3>${item.name}</h3>
                  <p>${item.tracks.total} tracks</p>
                  <a href=${item.external_urls.spotify}>${item.external_urls.spotify}</a>
                  <p>${item.description}</p>
                  <p>Invite your friends using this link:</p>
                  <a href="${window.location.protocol}//${window.location.host}/playlist?playlistId=${item.id}">
                    <span>${window.location.protocol}//${window.location.host}/playlist?playlistId=${item.id}</span>
                  </a>
                  </div>`),
        );
      } else {
        document.getElementById(
          'playlists',
        ).innerHtml = `<h1 class="white">No playlists found. Create a remix to get started.</h1>`;
      }
      return x;
    });
}

function removeOrphanedPlaylists() {
  const accessToken = localStorage.getItem('spotify-remix-access-token');
  fetch(`/playlist`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playlists: playlists.orphanPlaylists,
    }),
  }).then(x => {
    getPlaylistsAndBuildDivs();
  });
}
function createPlaylist() {
  const accessToken = localStorage.getItem('spotify-remix-access-token');
  const playlistButton = document.getElementById('create-playlist-button');
  playlistButton.innerHTML = '<span>Loading... (This may take awhile, please do not exit the page.)</span>';
  playlistButton.disabled = true;
  fetch('/playlist', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  }).then(() => {
    playlistButton.innerHTML = 'Create a New Remix Playlist';
    playlistButton.disabled = false;
    getPlaylistsAndBuildDivs();
  });
}

getAndSetTokens();
getPlaylistsAndBuildDivs();
