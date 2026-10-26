# @strapi/plugin-provenance

Records, field by field, whether content was written by an AI, a human or an integration, and who reviewed it.

- Writes through the Strapi MCP server are recorded as AI content without configuration.
- In **Settings > Provenance**, qualify each API token as an AI agent, a classic integration or mixed.
- Clients can declare AI output with a header for the whole request:

  ```http
  Strapi-Provenance: source=ai; model="claude-opus-5-5"; agent="seo-bot"
  ```

  or per field on content API writes:

  ```json
  {
    "data": { "description": "…", "price": 42 },
    "provenance": { "description": { "source": "ai", "model": "claude-opus-5-5" } }
  }
  ```

  A client can declare AI, never lower an AI write to human.

- The edit view shows the provenance of each field and lets editors mark fields as AI or as reviewed. A review is tied to the reviewed value: editing the field afterwards invalidates it.
- `GET /api/provenance/entries/:uid/:documentId` exposes the provenance of a published entry to front ends that display AI labels.

Only top-level scalar fields of `api::` content types are tracked for now.
