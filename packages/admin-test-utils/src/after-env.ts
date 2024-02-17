import '@testing-library/jest-dom';
import 'jest-styled-components';
import 'whatwg-fetch';

// Note: We set this here because setting it in the config is broken for projects: https://github.com/jestjs/jest/issues/9696
// Also, there are issues with async tests unless it is set at global scope: https://github.com/jestjs/jest/issues/11543
jest.setTimeout(60 * 1000);
