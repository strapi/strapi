import { shallow } from 'enzyme';

import NotFoundPage from '../index';

describe('<NotFoundPage />', () => {
  it('should not crash', () => {
    shallow(<NotFoundPage />);
  });
});
