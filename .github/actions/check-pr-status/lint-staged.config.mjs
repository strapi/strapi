// @ts-check

import shared from '../../../lint-staged.shared.mjs';

const withoutDist = (files) => files.filter((file) => !file.includes('dist/'));

/** @type {import('lint-staged').Configuration} */
export default {
  '*.{js,ts,jsx,tsx}': (files) => {
    const filtered = withoutDist(files);
    if (!filtered.length) {
      return [];
    }

    return [
      `eslint --cache --fix --max-warnings=0 ${filtered.join(' ')}`,
      `prettier --cache --write ${filtered.join(' ')}`,
    ];
  },
  '!(*.js|*.ts|*.jsx|*.tsx)': shared['!(*.js|*.ts|*.jsx|*.tsx)'],
};
