# TODO:

- Continue implementing APIResponse interface for HTTP Responses and expose accessToken and refreshToken in UI. Update UI to store accessToken and refreshToken when it exists on a given response.
- Fix double click bug when joining a playlist - in subscribe.html dont just immediately refresh tokens. instead, handle failures by refreshing the token and trying again. perhaps we can also just change this on the API to do that automatically, and if the failure persists after X retries, send back an error.
- Fix subbed playlists not showing up - This stems from an issue where auth gets a new token and we try to get a playlist by that token and then we are unable to actually find the playlist because the following occurs with another accessToken.
- See if you can show a different name in the playlist rather than screenname since some ppl are just numbers. This will require saving user emails. Maybe use regex to remove the @email.com section and instead just grab the persons email username and use that as a replacement for their userId.
- Handle a situation where a users token has expired - this doesnt work right now and is broken.
- Add ability to unsubscribe from a playlist
- Add ability to name your playlist upon creation
- Consider unsubscribing users who no longer follow a given playlist
- Consider a way to easily clean up orphaned playlists
- Better copy writing
- Performance profiling
