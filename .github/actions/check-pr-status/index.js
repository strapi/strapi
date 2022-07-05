const core = require('@actions/core');
const github = require('@actions/github');

const BLOCKING_LABELS = [`flag: 💥 Breaking change`, `flag: don't merge`, `flag: documentation`];

async function main() {
  try {
    const labels = github.context.payload.pull_request?.labels ?? [];

    const blockingLabels = labels.filter(label => BLOCKING_LABELS.includes(label.name));

    if (blockingLabels.length > 0) {
      core.setFailed(
        `The PR has been labelled with a blocking label (${blockingLabels
          .map(label => label.name)
          .join(', ')}).`
      );

      return;
    }

    const sourceLabelCount = labels.filter(label => label.name.startsWith('source: ')).length;
    const issueLabelCount = labels.filter(label => label.name.startsWith('pr: ')).length;

    if (sourceLabelCount !== 1) {
      core.setFailed(`The PR must have one and only one 'source:' label.`);
    }

    if (issueLabelCount !== 1) {
      core.setFailed(`The PR must have one and only one 'pr:' label.`);
    }

    // NOTE: to avoid manual work, this is commented until we can set the workflow to trigger on pull_request milestone changes.
    // ref: https://github.community/t/feature-request-add-milestone-changes-as-activity-type-to-pull-request/16778/16
    /*
     const milestone = context.payload.pull_request?.milestone;
     const hasMilestone = !!milestone;
     if (!hasMilestone) {
       core.setFailed(`The PR must have a milestone.`);
     }
     */
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
