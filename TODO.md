# TODO:

- Add refresh token logic in the form of some sort of middleware that upon failure for an error that is 401 statusCode + statusText 'Unauthorized' then we use the refresh token to get a new token and retry our call.
- Add retry logic for rate limting from the API (this is especially necessary when adding a bunch of songs) OR use batch logic and define a position in which youd like to insert the song to reduce calls significantly and maintain the expected order.
