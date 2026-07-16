'use strict';

const core = require('@actions/core');
const github = require('@actions/github');

const BLOCKING_LABELS = [`flag: 💥 Breaking change`, `flag: don't merge`];
const QA_REQUIRED_LABEL = 'needs-qa';
const QA_COMPLETION_LABELS = ['qa-done', 'qa-skipped'];
const STRAPI_ENGINEER_ASSOCIATIONS = ['MEMBER', 'OWNER'];

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

    const labelNames = labels.map((label) => label.name);
    const needsQa = labelNames.includes(QA_REQUIRED_LABEL);
    const hasQaResolution = QA_COMPLETION_LABELS.some((label) => labelNames.includes(label));

    if (needsQa === true && hasQaResolution === false) {
      core.setFailed(
        `The PR has been labelled with '${QA_REQUIRED_LABEL}' and must be resolved with one of: ${QA_COMPLETION_LABELS.join(
          ', '
        )}.`
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
    const authorAssociation = github.context.payload.pull_request?.author_association;
    const isStrapiEngineer = STRAPI_ENGINEER_ASSOCIATIONS.includes(authorAssociation);

    if (baseRef === 'main') {
      core.info(`PR author_association: ${authorAssociation ?? 'undefined'}`);

      if (isStrapiEngineer === false) {
        core.setFailed(
          'Community PRs must target `develop`, not `main`. Please edit the PR and change the base branch to `develop`.'
        );

        return;
      }
    }

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
main.QA_REQUIRED_LABEL = QA_REQUIRED_LABEL;
main.QA_COMPLETION_LABELS = QA_COMPLETION_LABELS;
main.STRAPI_ENGINEER_ASSOCIATIONS = STRAPI_ENGINEER_ASSOCIATIONS;

if (require.main === module) {
  main();
} else {
  module.exports = main;
}
