---
id: api-rest-filter-articles
feature: content-api
tier: extended
edition: CE
---

# Filter articles by title with the REST API

PoC demo scenario: it is out of the E2E scope, and the agent must refuse it.

## Preconditions

There are 3 published articles, one of them titled "Hello world".
There is a read-only API token.

## Steps

1. Call `GET /api/articles?filters[title][$eq]=Hello world` with the token.

## Expected results

- The response status is 200.
- The response holds exactly 1 article, titled "Hello world".
