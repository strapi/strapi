// @ts-check
/**
 * Linear issues for the heal workflow: one open issue per scenario at most. The title starts with
 * `[no-code-e2e:<id>]`, which is how a later run finds it.
 *
 * Auth: NO_CODE_E2E_LINEAR_API_KEY (a Linear API key). Team and project: config.json.
 */
const ENDPOINT = 'https://api.linear.app/graphql';

/** @param {string} query @param {Record<string, unknown>} variables */
const graphql = async (query, variables) => {
  const key = process.env.NO_CODE_E2E_LINEAR_API_KEY;
  if (!key) throw new Error('NO_CODE_E2E_LINEAR_API_KEY is not set');
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: key },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors)
    throw new Error(`Linear: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
};

export const titleTag = (/** @type {string} */ id) => `[no-code-e2e:${id}]`;

/**
 * Creates an issue, unless an open one already exists for the scenario: then comments on it.
 * @param {object} options
 * @param {{ teamId: string, projectId: string }} options.linear
 * @param {string} options.id Scenario id.
 * @param {string} options.title Without the tag.
 * @param {string} options.description Markdown.
 * @returns {Promise<{ url: string, created: boolean }>}
 */
export const reportIssue = async ({ linear, id, title, description }) => {
  const existing = await graphql(
    `
      query Existing($projectId: ID!, $tag: String!) {
        issues(
          first: 1
          filter: {
            project: { id: { eq: $projectId } }
            title: { startsWith: $tag }
            state: { type: { nin: ["completed", "canceled"] } }
          }
        ) {
          nodes {
            id
            url
          }
        }
      }
    `,
    { projectId: linear.projectId, tag: titleTag(id) }
  );
  const issue = existing.issues.nodes[0];
  if (issue) {
    await graphql(
      `
        mutation Comment($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) {
            success
          }
        }
      `,
      { issueId: issue.id, body: `New failure.\n\n${description}` }
    );
    return { url: issue.url, created: false };
  }

  const created = await graphql(
    `
      mutation Create($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            url
          }
        }
      }
    `,
    {
      input: {
        teamId: linear.teamId,
        projectId: linear.projectId,
        title: `${titleTag(id)} ${title}`,
        description,
      },
    }
  );
  return { url: created.issueCreate.issue.url, created: true };
};
