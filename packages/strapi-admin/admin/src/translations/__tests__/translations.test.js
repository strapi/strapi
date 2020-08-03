const fs = require('fs');
const en = require('../en.json');

const trads = fs
  .readdirSync(`${__dirname}/../`)
  .filter(filename => filename.match(/.*\.json$/))
  .map(langFilename => langFilename.replace('.json', ''))
  .filter(langName => langName !== 'en')
  .reduce(
    (trads, langName) => ({
      ...trads,
      [langName]: require(`../${langName}.json`), // eslint-disable-line import/no-dynamic-require, global-require
    }),
    {}
  );

xdescribe('translations', () => {
  describe('all languages have same keys', () => {
    const enKeys = Object.values(en).sort();

    Object.entries(trads).forEach(([langName, lang]) => {
      test(`"en" and "${langName}" have the same keys`, () => {
        const langKeys = Object.keys(lang).sort();

        expect(langKeys).toEqual(enKeys);
      });
    });
  });
});
