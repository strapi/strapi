import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { render } from '@tests/utils';

import { Information } from '../Information';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn(),
}));

describe('CONTENT MANAGER | EditView | Information', () => {
  const realNow = Date.now;

  beforeAll(() => {
    window.Date.now = jest.fn(() => new Date('2022-09-20').getTime());
  });

  afterAll(() => {
    window.Date.now = realNow;
  });

  it('renders and matches the snaphsot in case an entry is created', () => {
    // @ts-expect-error – testing purposes
    jest.mocked(useCMEditViewDataManager).mockImplementationOnce(() => ({
      initialData: {},
      isCreatingEntry: true,
    }));

    const { getByText, getAllByText } = render(
      <Information.Root>
        <Information.Title />
        <Information.Body />
      </Information.Root>
    );

    expect(getByText('Created')).toBeInTheDocument();
    expect(getByText('Last update')).toBeInTheDocument();
    expect(getAllByText('By').length).toBe(2);
    expect(getAllByText('now').length).toBe(2);
    expect(getAllByText('-').length).toBe(2);
  });

  it('renders and matches the snaphsot in case an entry is edited', () => {
    jest.mocked(useCMEditViewDataManager).mockImplementationOnce(() => ({
      initialData: {
        updatedAt: 'Fri Jan 13 2022 13:10:14 GMT+0100',
        // @ts-expect-error – testing purposes
        updatedBy: {
          id: 1,
          firstname: 'First name',
          lastname: 'Last name',
          email: 'first@last.com',
        },

        createdAt: 'Fri Jan 13 2022 12:10:14 GMT+0100',
        // @ts-expect-error – testing purposes
        createdBy: {
          firstname: 'First name',
          lastname: 'Last name',
          email: 'first@last.com',
        },
      },
      isCreatingEntry: false,
    }));

    const { getAllByText } = render(
      <Information.Root>
        <Information.Title />
        <Information.Body />
      </Information.Root>
    );

    expect(getAllByText('8 months ago').length).toBe(2);
    expect(getAllByText('First name Last name').length).toBe(2);
  });

  it('renders and matches the snaphsot in case a username is set', () => {
    jest.mocked(useCMEditViewDataManager).mockImplementationOnce(() => ({
      initialData: {
        updatedAt: 'Fri Jan 13 2022 13:10:14 GMT+0100',
        // @ts-expect-error – testing purposes
        updatedBy: {
          firstname: 'First name',
          lastname: 'Last name',
          username: 'user@strapi.io',
          email: 'user@strapi.io',
        },

        createdAt: 'Fri Jan 13 2022 12:10:14 GMT+0100',
        // @ts-expect-error – testing purposes
        createdBy: {
          firstname: 'First name',
          lastname: 'Last name',
          username: 'user@strapi.io',
          email: 'user@strapi.io',
        },
      },
      isCreatingEntry: false,
    }));

    const { queryByText, getAllByText } = render(
      <Information.Root>
        <Information.Title />
        <Information.Body />
      </Information.Root>
    );

    expect(getAllByText('user@strapi.io').length).toBe(2);
    expect(queryByText('First name')).not.toBeInTheDocument();
    expect(queryByText('Last name')).not.toBeInTheDocument();
  });
});
