import builder from './builder';
import componentCategories from './component-categories';
import components from './components';
import contentTypes from './content-types';

// to prevent breaking changes, we need to keep the hyphenated names for now
// TODO: do we actually need to do this? Is it public? Investigate if it's safe to change the exports to use camelCase
// TODO V5: remove the hyphenated names and export directly
const exportObject = {
  builder,
  'component-categories': componentCategories,
  components,
  'content-types': contentTypes,
};

export default exportObject;
