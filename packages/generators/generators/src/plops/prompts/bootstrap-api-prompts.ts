import type { PromptQuestion } from 'node-plop';

const questions: Array<PromptQuestion> = [
  {
    type: 'confirm',
    name: 'bootstrapApi',
    default: true,
    message: 'Bootstrap API related files?',
  },
];

export default questions;
