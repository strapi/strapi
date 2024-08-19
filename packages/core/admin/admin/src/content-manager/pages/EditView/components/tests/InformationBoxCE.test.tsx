import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { render } from '@tests/utils';

import { InformationBoxCE } from '../InformationBoxCE';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
}));

describe('CONTENT MANAGER | EditView | InformationBoxCE', () => {
  const RealNow = Date.now;

  beforeAll(() => {
    window.Date.now = jest.fn(() => new Date('2022-09-20').getTime());
  });

  afterAll(() => {
    window.Date.now = RealNow;
  });

  it('renders the title and body of the Information component', () => {
    // @ts-expect-error – test purposes
    jest.mocked(useCMEditViewDataManager).mockImplementationOnce(() => ({
      initialData: {},
      isCreatingEntry: true,
    }));

    const { getByText } = render(<InformationBoxCE />);

    expect(getByText('Information')).toBeInTheDocument();
    expect(getByText('Last update')).toBeInTheDocument();
  });
});
