import { render } from '@testing-library/react';
import StrapiApp from '../StrapiApp';

describe('ADMIN | StrapiApp', () => {
  it('should render the app without plugins', () => {
    const app = StrapiApp({});

    render(app.render());
  });
});
