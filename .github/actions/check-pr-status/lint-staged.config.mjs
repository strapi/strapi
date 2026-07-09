import shared from '../../../lint-staged.shared.mjs';

const jsPattern = '*.{js,ts,jsx,tsx}';
const jsTasks = shared[jsPattern];

export default {
  ...shared,
  [jsPattern]: (filenames) => {
    const filtered = filenames.filter((filename) => !filename.includes('/dist/'));

    if (!filtered.length) {
      return [];
    }

    return jsTasks.flatMap((task) => filtered.map((filename) => `${task} ${filename}`));
  },
};
