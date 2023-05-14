import type { PromptQuestion } from 'node-plop';

const questions: Array<PromptQuestion> = [
  {
    type: 'confirm',
    name: 'useDraftAndPublish',
    default: false,
    message: 'Use draft and publish?',
  },
];

export default questions;
