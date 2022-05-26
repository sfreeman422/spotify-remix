# TODO:

- May not be prioritizing TOP songs properly. since we concat liked with top, and liked likely has more than top, we may be incidentally favoring liked. May help to break out top and liked into their own keys, select as much as you can from top and then fall back to liked after?
- Fix subbed playlists not showing up - This stems from an issue where auth gets a new token and we try to get a playlist by that token and then we are unable to actually find the playlist because the following occurs with another accessToken.
- See if you can show a different name in the playlist rather than screenname since some ppl are just numbers. This will require saving user emails. Maybe use regex to remove the @email.com section and instead just grab the persons email username and use that as a replacement for their userId.
- Consider grouping by genre/bpm or some other similarity.
- Add ability to unsubscribe from a playlist
- Consider unsubscribing users who no longer follow a given playlist
- Consider a way to easily clean up orphaned playlists
- Better styling
- Performance profiling
