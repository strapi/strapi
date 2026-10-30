# @strapi/plugin-provenance

Records, field by field, whether content came from an AI, an admin user or an integration, and who reviewed it. It is the field-level layer of Agent Governance and needs the `cms-ai-governance` license feature: without it, the plugin records nothing and shows nothing.

It attests the channel a value came through. It does not detect AI text.

- Agents with their own identity are named as the writer of what they change.
- Writes through the Strapi MCP server are recorded as AI content without configuration.
- In **Settings > Provenance**, qualify each Content API token as an AI agent, a classic integration or mixed.
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

- An approval queue can tie an approval to the values the reviewer saw, and attribute the approved write to the agent, through the `approvals` service.

Top-level fields of `api::` content types are tracked. A component or dynamic zone counts as one field.
