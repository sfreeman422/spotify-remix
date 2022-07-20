# TODO:

- Fix double click bug when joining a playlist
- Fix bug where UI does not refresh when removing orphaned playlists.
- Fix subbed playlists not showing up - This stems from an issue where auth gets a new token and we try to get a playlist by that token and then we are unable to actually find the playlist because the following occurs with another accessToken.
- See if you can show a different name in the playlist rather than screenname since some ppl are just numbers. This will require saving user emails. Maybe use regex to remove the @email.com section and instead just grab the persons email username and use that as a replacement for their userId.
- Add ability to unsubscribe from a playlist
- Consider unsubscribing users who no longer follow a given playlist
- Consider a way to easily clean up orphaned playlists
- Better styling
- Performance profiling
