---
title: Response time
---

The `X-Response-Time` header records the response time for requests in HTTP servers. The response time is defined here as the elapsed time from when a request enters the application to when the headers are written out to the client.

## Configuration

Configuration:

- Key: `responseTime`
- Environment: `development`
- Location: `./config/environments/development/server.json`
- Type: `boolean`

Example:

```js
{
  "responseTime": true
}
```

Notes:

- Set to `false` to disable the response time header.
