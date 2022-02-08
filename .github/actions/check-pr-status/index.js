const core = require('@actions/core');
const { context } = require('@actions/github');

const BLOCKING_LABELS = [`flag: 💥 Breaking change`, `flag: don't merge`];

async function main() {
  try {
    const labels = context.payload.pull_request?.labels;
    const milestone = context.payload.pull_request?.milestone;

    const hasBlockingLabel = labels.some(label => BLOCKING_LABELS.includes(label));
    if (hasBlockingLabel) {
      core.setFailed(`This PR has been labelled with a blocking label (${BLOCKING_LABELS})`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
