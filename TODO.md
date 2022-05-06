# TODO:

- Add refresh token logic in the form of some sort of middleware that upon failure for an error that is 401 statusCode + statusText 'Unauthorized' then we use the refresh token to get a new token and retry our call. There is an interceptor in index.ts that we may be able to take advantage of, but need to be sure that it will ONLY trigger for an expired bearer token.
- Determine why rate limiting is seemingly not getting 2-4 songs consistently - is it a data quality issue or is it a retry logic issue?
- Better styling
