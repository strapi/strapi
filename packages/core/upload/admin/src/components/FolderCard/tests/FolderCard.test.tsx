import { Flex, DesignSystemProvider, Typography } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, LinkProps } from 'react-router-dom';

import { FolderCard } from '../FolderCard/FolderCard';
import { FolderCardBody } from '../FolderCardBody/FolderCardBody';
import { FolderCardBodyAction } from '../FolderCardBodyAction/FolderCardBodyAction';
import { FolderCardCheckbox } from '../FolderCardCheckbox/FolderCardCheckbox';

import type { FolderCardProps } from '../FolderCard/FolderCard';

const ID_FIXTURE = 'folder';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useId: () => `${ID_FIXTURE}-3`,
}));

const ComponentFixture = ({
  to,
  ...props
}: {
  to?: LinkProps['to'];
  props?: Partial<FolderCardProps>;
}) => {
  return (
    <DesignSystemProvider>
      <MemoryRouter>
        <FolderCard
          id={ID_FIXTURE}
          ariaLabel="Folder 1"
          startAction={null}
          onClick={() => {}}
          to={to}
          {...props}
        >
          <FolderCardBody>
            <FolderCardBodyAction onClick={() => {}} to={to}>
              <Flex direction="column" alignItems="flex-start">
                <Typography variant="omega" fontWeight="semiBold">
                  Pictures
                </Typography>
              </Flex>
            </FolderCardBodyAction>
          </FolderCardBody>
        </FolderCard>
      </MemoryRouter>
    </DesignSystemProvider>
  );
};

const setup = (props?: Partial<FolderCardProps>) => render(<ComponentFixture {...props} />);

describe('FolderCard', () => {
  test('renders and matches the snapshot', () => {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });

  test('properly calls the onClick callback', async () => {
    const callback = jest.fn();
    const { getByLabelText } = setup({ onClick: callback });

    const button = getByLabelText('Folder 1');
    await userEvent.click(button);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('has all required ids set when rendering a start action', () => {
    const { container, getByTestId, getByRole } = setup({
      startAction: <FolderCardCheckbox value={'false'} />,
    });

    expect(container).toMatchSnapshot();
    expect(getByTestId(`${ID_FIXTURE}-3-title`)).toBeInTheDocument();
    expect(getByRole('checkbox', { checked: false })).toBeInTheDocument();
  });

  test('renders as a link with to prop', () => {
    const { getByRole } = setup({
      to: '/michka-page',
    });

    const link = getByRole('link');
    expect(link).toHaveAttribute('href', '/michka-page');
  });

  test('renders as a button without to prop', () => {
    const { getByRole } = setup();

    const button = getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
