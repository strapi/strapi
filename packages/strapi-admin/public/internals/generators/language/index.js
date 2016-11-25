/**
 * Language Generator
 */
const exec = require('child_process').exec;

module.exports = {
  description: 'Add a langauge',
  prompts: [{
    type: 'input',
    name: 'language',
    message: 'What is the language you want to add i18n support for (e.g. "fr", "de")?',
    default: 'fr',
    validate: value => {
      if ((/.+/).test(value) && value.length === 2) {
        return true;
      }

      return '2 character language specifier is required';
    },
  }],

  actions: () => {
    const actions = [];
    actions.push({
      type: 'modify',
      path: '../../app/i18n.js',
      pattern: /('react-intl\/locale-data\/[a-z]+';\n)(?!.*'react-intl\/locale-data\/[a-z]+';)/g,
      templateFile: './language/intl-locale-data.hbs',
    });
    actions.push({
      type: 'modify',
      path: '../../app/i18n.js',
      pattern: /([\n\s'[a-z]+',)(?!.*[\n\s'[a-z]+',)/g,
      templateFile: './language/app-locale.hbs',
    });
    actions.push({
      type: 'modify',
      path: '../../app/i18n.js',
      pattern: /(from\s'.\/translations\/[a-z]+.json';\n)(?!.*from\s'.\/translations\/[a-z]+.json';)/g,
      templateFile: './language/translation-messages.hbs',
    });
    actions.push({
      type: 'modify',
      path: '../../app/i18n.js',
      pattern: /(addLocaleData\([a-z]+LocaleData\);\n)(?!.*addLocaleData\([a-z]+LocaleData\);)/g,
      templateFile: './language/add-locale-data.hbs',
    });
    actions.push({
      type: 'modify',
      path: '../../app/i18n.js',
      pattern: /([a-z]+:\sformatTranslationMessages\([a-z]+TranslationMessages\),\n)(?!.*[a-z]+:\sformatTranslationMessages\([a-z]+TranslationMessages\),)/g,
      templateFile: './language/format-translation-messages.hbs',
    });
    actions.push({
      type: 'add',
      path: '../../app/translations/{{language}}.json',
      templateFile: './language/translations-json.hbs',
      abortOnFail: true,
    });
    actions.push({
      type: 'modify',
      path: '../../app/app.js',
      pattern: /(System\.import\('intl\/locale-data\/jsonp\/[a-z]+\.js'\),\n)(?!.*System\.import\('intl\/locale-data\/jsonp\/[a-z]+\.js'\),)/g,
      templateFile: './language/polyfill-intl-locale.hbs',
    });
    actions.push(
      () => {
        const cmd = 'npm run extract-intl';
        exec(cmd, (err, result, stderr) => {
          if (err || stderr) {
            throw err || stderr;
          }
          process.stdout.write(result);
        });
      }
    );

    return actions;
  },
};
