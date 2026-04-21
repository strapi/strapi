'use strict';

const core = require('@actions/core');
const github = require('@actions/github');

const BLOCKING_LABELS = [`flag: 💥 Breaking change`, `flag: don't merge`, `flag: documentation`];

async function main() {
  try {
    const labels = github.context.payload.pull_request?.labels ?? [];

    const blockingLabels = labels.filter((label) => BLOCKING_LABELS.includes(label.name));

    if (blockingLabels.length > 0) {
      core.setFailed(
        `The PR has been labelled with a blocking label (${blockingLabels
          .map((label) => label.name)
          .join(', ')}).`
      );

      return;
    }

    const sourceLabelCount = labels.filter((label) => label.name.startsWith('source: ')).length;
    const issueLabelCount = labels.filter((label) => label.name.startsWith('pr: ')).length;

    if (sourceLabelCount !== 1) {
      core.setFailed(`The PR must have one and only one 'source:' label.`);
    }

    if (issueLabelCount !== 1) {
      core.setFailed(`The PR must have one and only one 'pr:' label.`);
    }

    const baseRef = github.context.payload.pull_request?.base?.ref;
    const milestone = github.context.payload.pull_request?.milestone;
    const requiresMilestone = baseRef === 'develop';
    const isMissingMilestone = milestone === null || milestone === undefined;

    if (requiresMilestone === true && isMissingMilestone === true) {
      core.setFailed(`The PR must have a milestone.`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main.BLOCKING_LABELS = BLOCKING_LABELS;

if (require.main === module) {
  main();
} else {
  module.exports = main;
}
