require('shelljs/global');

/**
 * Adds mark check symbol
 */
function addCheckMark(callback) {
  process.stdout.write(' ✓');
  callback();
}

if (!which('git')) {
  echo('Sorry, this script requires git');
  exit(1);
}

if (!test('-e', 'internals/templates')) {
  echo('The example is deleted already.');
  exit(1);
}

process.stdout.write('Cleanup started...');

// Cleanup components folder
rm('-rf', 'app/components/*');

// Cleanup containers folder
rm('-rf', 'app/containers/*');
mkdir('-p', 'app/containers/App');
mkdir('-p', 'app/containers/NotFoundPage');
mkdir('-p', 'app/containers/HomePage');
cp('internals/templates/appContainer.js', 'app/containers/App/index.js');
cp('internals/templates/notFoundPage/notFoundPage.js', 'app/containers/NotFoundPage/index.js');
cp('internals/templates/notFoundPage/messages.js', 'app/containers/NotFoundPage/messages.js');
cp('internals/templates/homePage/homePage.js', 'app/containers/HomePage/index.js');
cp('internals/templates/homePage/messages.js', 'app/containers/HomePage/messages.js');

// Handle Translations
mkdir('-p', 'app/translations');
cp('internals/templates/translations/en.json',
  'app/translations/en.json');

// move i18n file
cp('internals/templates/i18n.js',
  'app/i18n.js');

// Copy LanguageProvider
mkdir('-p', 'app/containers/LanguageProvider');
mkdir('-p', 'app/containers/LanguageProvider/tests');
cp('internals/templates/languageProvider/actions.js',
  'app/containers/LanguageProvider/actions.js');
cp('internals/templates/languageProvider/constants.js',
  'app/containers/LanguageProvider/constants.js');
cp('internals/templates/languageProvider/languageProvider.js',
  'app/containers/LanguageProvider/index.js');
cp('internals/templates/languageProvider/reducer.js',
  'app/containers/LanguageProvider/reducer.js');
cp('internals/templates/languageProvider/selectors.js',
  'app/containers/LanguageProvider/selectors.js');
cp('internals/templates/styles.css', 'app/containers/App/styles.css');

// Copy selectors
mkdir('app/containers/App/tests');
cp('internals/templates/selectors.js',
  'app/containers/App/selectors.js');
cp('internals/templates/selectors.test.js',
  'app/containers/App/tests/selectors.test.js');

// Utils
rm('-rf', 'app/utils');
mkdir('app/utils');
mkdir('app/utils/tests');
cp('internals/templates/asyncInjectors.js',
  'app/utils/asyncInjectors.js');
cp('internals/templates/asyncInjectors.test.js',
  'app/utils/tests/asyncInjectors.test.js');

// Replace the files in the root app/ folder
cp('internals/templates/app.js', 'app/app.js');
cp('internals/templates/index.html', 'app/index.html');
cp('internals/templates/reducers.js', 'app/reducers.js');
cp('internals/templates/routes.js', 'app/routes.js');
cp('internals/templates/store.js', 'app/store.js');
cp('internals/templates/store.test.js', 'app/tests/store.test.js');

// Remove the templates folder
rm('-rf', 'internals/templates');

process.stdout.write(' ✓');

// Commit the changes
if (exec('git add . --all && git commit -qm "Remove default example"').code !== 0) {
  echo('\nError: Git commit failed');
  exit(1);
}

echo('\nCleanup done. Happy Coding!!!');
