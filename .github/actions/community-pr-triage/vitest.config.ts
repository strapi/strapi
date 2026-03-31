import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      // Provide test values so config.ts doesn't fall back to empty strings
      LINEAR_CPR_TEAM_ID: 'test-cpr-team-id',
      LINEAR_CMS_TEAM_ID: 'test-cms-team-id',
      LINEAR_CMS_GITHUB_TEAM_ID: 'test-cms-github-team-id',
      LINEAR_PROJECT_ID: 'test-project-id',
      LINEAR_STATUS_TODO: 'test-status-todo',
      LINEAR_STATUS_DONE: 'test-status-done',
      LINEAR_STATUS_CANCELED: 'test-status-canceled',
      LINEAR_LABELS: JSON.stringify({
        'pr: fix': 'a850ce54-33cd-4917-a06a-4d2df6dafab2',
        'pr: feature': '5e7646f1-4f73-4d37-9b2b-3ededc0c2475',
        'pr: enhancement': '54d83c27-3456-4fb9-98e2-15fab6c0eb3d',
        'pr: chore': 'f0230cb8-d531-4a6c-9836-c4278741fb38',
        'pr: doc': '6711572b-0ab3-4a0d-9338-eac4479d8191',
        admin: '334b6c23-7d07-484a-94a9-97cf42f8dca1',
      }),
      LINEAR_TRIAGE_LABELS: JSON.stringify({
        priority: {
          urgent: '97df26d2-ff52-4316-8f5b-1e3cfdda5953',
          high: 'a912f8bf-60bc-4f07-9cef-4cf46e50e45b',
          normal: 'ca37c53e-5bef-4ce9-9c44-ffc92ecc27ad',
          low: '183c4f99-bcc9-4ca1-86fd-9c30d1938da6',
        },
        complexity: {
          low: '97a5f309-56f9-43e2-b167-c89eb90bf1ec',
          medium: '6b790ca7-536d-4b88-8987-4b46ef8322c6',
          high: 'f96080ae-4e07-40cb-b647-c9b55f7c0b7e',
          very_high: 'b9938950-ff7e-4480-b169-3f6cc2e5d082',
        },
        quickWin: '24eb891f-061f-4d38-8f13-6a9e89f5a983',
        hasLinkedIssue: '9d9d30d6-d201-40f1-bf65-1b51d43f95e5',
        ci: {
          passing: 'a9f94fde-ac2d-4e67-8a57-2271ae9172cb',
          failing: '077d0c67-6ce2-4ab0-802b-f9ded8009373',
          pending: 'a3ace5ee-7ffd-498c-bc79-0cd2660c9cd1',
        },
      }),
    },
  },
});
