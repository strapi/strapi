const core = require('@actions/core');
const { context } = require('@actions/github');

async function main() {
  try {
    console.log(context.payload.pull_request.labels);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
