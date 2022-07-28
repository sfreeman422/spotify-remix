let playlists;
let orphanedPlaylists;
const accessTokenName = 'spotify-remix-access-token';
const refreshTokenName = 'spotify-remix-refresh-token';
const redirectTokenName = 'spotify-remix-redirect-to';
const playlistDiv = document.getElementById('playlists');

function setTokens(accessToken, refreshToken) {
  localStorage.setItem(accessTokenName, accessToken);
  localStorage.setItem(refreshTokenName, refreshToken);
}

function getAndSetTokens() {
  const redirectTo = localStorage.getItem(redirectTokenName);
  const params = new URLSearchParams(window.location.search);
  const paramAccessToken = params.get('accessToken');
  const paramRefreshToken = params.get('refreshToken');
  const storageAccessToken = localStorage.getItem(accessTokenName);
  const storageRefreshToken = localStorage.getItem(refreshTokenName);

  if (redirectTo) {
    setTokens(paramAccessToken, paramRefreshToken);
    localStorage.removeItem(redirectTokenName);
    window.location = redirectTo;
  }

  if (paramAccessToken && paramRefreshToken) {
    setTokens(paramAccessToken, paramRefreshToken);
  } else if (storageAccessToken && storageRefreshToken) {
    return;
  } else {
    window.location = `${window.location.protocol}//${window.location.host}/login`;
  }
}

function createOrphanedPlaylists(playlists) {
  orphanedPlaylists = playlists;
  playlistDiv.innerHTML += `<div>
                    <h3 class="white">Orphaned Remixes</h3>
                    <button onclick="removeOrphanedPlaylists()">Remove Orphaned Playlists</button>
                    <div class="playlist" id="orphan-playlists"></div>
                    </div>`;
  playlists.map(
    item =>
      (document.getElementById('orphan-playlists').innerHTML += `
                  <div class="card">
                  <h3>${item}</h3>
                  </div>`),
  );
}

function createOwnedPlaylists(playlists) {
  playlistDiv.innerHTML += `<div>
        <h3 class="white">Your Remixes</h3>
        <button id="create-playlist-button" onclick="createPlaylist()">Create a New Remix Playlist</button>
        <div class="playlist" id="managed-playlists"></div>
        </div>`;
  playlists.map(
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
function createFollowedPlaylists(playlists) {
  playlistDiv.innerHTML += `<div>
                    <h3 class="white">Your Followed Remixes</h3>
                    <div class="playlist" id="subbed-playlists"></div>
                    </div>`;
  playlists.map(
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
}
function createEmptySection() {
  playlistDiv.innerHTML = `<div class="flex-vert-center flex-just-center">
    <span class="material-symbols-outlined white font-size-gigantic">search</span>
    <h2 class="white">Looks like don't have any playlists!</h2>
    <h3 class="white margin-000">Start by either subscribing to a playlist or creating one.</h3>
    <div class="margin-100 hover-white hover-pointer bg-green padding-100 bdr-rad-010" id="create-playlist-button" onclick="createPlaylist()">
        Create a Playlist
      </div>
  </div>`;
}

function getPlaylistsAndBuildDivs() {
  const accessToken = localStorage.getItem('spotify-remix-access-token');
  fetch('/playlists', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      cache: 'no-store',
    },
  })
    .then(x => x.json())
    .then(playlistInfo => {
      playlistDiv.innerHTML = '';
      const { orphanPlaylists, ownedPlaylists, subscribedPlaylists } = playlistInfo;
      const hasOrphanPlaylists = orphanPlaylists && orphanPlaylists.length > 0;
      const hasOwnedPlaylists = ownedPlaylists && ownedPlaylists.length > 0;
      const hasSubscribedPlaylists = subscribedPlaylists && subscribedPlaylists.length > 0;
      if (hasOrphanPlaylists) {
        createOrphanedPlaylists(orphanPlaylists);
      }

      if (hasOwnedPlaylists) {
        createOwnedPlaylists(ownedPlaylists);
      }

      if (hasSubscribedPlaylists) {
        createFollowedPlaylists(subscribedPlaylists);
      }

      if (!hasOrphanPlaylists && !hasOwnedPlaylists && !hasSubscribedPlaylists) {
        createEmptySection();
      }
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
      playlists: orphanedPlaylists,
    }),
  }).then(x => {
    orphanedPlaylists = undefined;
    getPlaylistsAndBuildDivs();
  });
}
function createPlaylist() {
  const accessToken = localStorage.getItem('spotify-remix-access-token');
  const playlistButton = document.getElementById('create-playlist-button');
  playlistButton.innerHTML = '<span>Loading... (This may take awhile, please do not exit the page.)</span>';
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
