let playlists;
let orphanedPlaylists;
const accessTokenName = 'spotify-remix-access-token';
const refreshTokenName = 'spotify-remix-refresh-token';
const redirectTokenName = 'spotify-remix-redirect-to';
const appContentDiv = document.getElementById('app-content');

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
  appContentDiv.innerHTML += `<div>
                    <h3 class="white">Orphaned Remixes</h3>
                    <button onclick="removeOrphanedPlaylists()">Remove Orphaned Playlists</button>
                    <div class="playlist" id="orphan-playlists"></div>
                    </div>`;
  playlists.map(
    item =>
      (document.getElementById('orphan-playlists').innerHTML += `
                  <div class="card">
                  <h3 class="white">${item}</h3>
                  </div>`),
  );
}

function createOwnedPlaylists(playlists) {
  appContentDiv.innerHTML += `<div class="flex-center-hor">
        <div class="hover-white hover-pointer bg-green padding-100 bdr-rad-010 width-content margin-bottom-100" id="create-playlist-button" onclick="createPlaylist()">
          Create a Playlist
        </div>
        <span class="white font-size-big">Your Remixes</span>
        <div class="playlist" id="managed-playlists"></div>
        </div>`;
  playlists.map(
    item =>
      (document.getElementById('managed-playlists').innerHTML += `
                  <div class="card">
                    <div class="flex-hor-center">
                      <img src=${item.images[1].url} class="playlist-img"></img>
                    </div>
                    <h4 class="white">${item.name}</h3>
                    <div class="flex-space-even">
                      <div class="hover-white hover-pointer bg-green padding-100 bdr-rad-010 width-content">
                        <a class="z-1 black font-size-small" href=${item.external_urls.spotify}>Open on Spotify</a>
                      </div>
                      <div class="hover-white hover-pointer bg-green padding-100 bdr-rad-010 width-content" onclick="copyText('${window.location.protocol}//${window.location.host}/playlist?playlistId=${item.id}')">
                        <span class="z-1 black font-size-small" id="copy-invite-link">Copy Invite Link</span>
                      </div>
                    </div>
                  </div>`),
  );
}
function createFollowedPlaylists(playlists) {
  appContentDiv.innerHTML += `<div>
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
  appContentDiv.innerHTML = `<div class="flex-vert-center flex-just-center height-100">
    <span class="material-symbols-outlined white font-size-gigantic">search</span>
    <h2 class="white">Looks like don't have any Remixes!</h2>
    <h3 class="white margin-000">Start by either subscribing to a Remix or creating one.</h3>
    <div class="margin-100 hover-white hover-pointer bg-green padding-100 bdr-rad-010" id="create-playlist-button" onclick="createPlaylist()">
        Create a Remix
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
      appContentDiv.innerHTML = '';
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
    playlistButton.innerHTML = 'Create a New Remix';
    getPlaylistsAndBuildDivs();
  });
}

function copyText(text) {
  console.log(text);
  navigator.clipboard.writeText(text);
  document.getElementById('copy-invite-link').textContent = 'Copied!';
  setTimeout(() => (document.getElementById('copy-invite-link').textContent = 'Copy Invite Link'), 1500);
}

getAndSetTokens();
getPlaylistsAndBuildDivs();
