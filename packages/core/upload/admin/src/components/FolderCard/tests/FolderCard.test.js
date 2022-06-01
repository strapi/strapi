import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Flex } from '@strapi/design-system/Flex';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Typography } from '@strapi/design-system/Typography';
import { render, fireEvent, act } from '@testing-library/react';

import { FolderCard } from '../FolderCard';
import { FolderCardBody } from '../FolderCardBody';
import { FolderCardCheckbox } from '../FolderCardCheckbox';
import { FolderCardBodyAction } from '../FolderCardBodyAction';

const ID_FIXTURE = 'folder';

// eslint-disable-next-line react/prop-types
const ComponentFixture = ({ to, ...props }) => {
  return (
    <ThemeProvider theme={lightTheme}>
      <MemoryRouter>
        <FolderCard
          id={ID_FIXTURE}
          ariaLabel="Folder 1"
          startAction={<></>}
          onClick={() => {}}
          to={to}
          {...props}
        >
          <FolderCardBody as="h2">
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
    </ThemeProvider>
  );
};

const setup = props => render(<ComponentFixture {...props} />);

describe('FolderCard', () => {
  test('renders and matches the snapshot', () => {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });

  test('properly calls the onClick callback', () => {
    const callback = jest.fn();
    const { container } = setup({ onClick: callback });

    act(() => {
      fireEvent(container.querySelector('button'), new MouseEvent('click', { bubbles: true }));
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('has all required ids set when rendering a start action', () => {
    const { container } = setup({
      startAction: <FolderCardCheckbox value={false} />,
    });

    expect(container).toMatchSnapshot();
    expect(container.querySelector(`[id="${ID_FIXTURE}-3-title"]`)).toBeInTheDocument();
    expect(
      container.querySelector(`[aria-labelledby="${ID_FIXTURE}-3-title"]`)
    ).toBeInTheDocument();
  });

  test('renders as a link with to prop', () => {
    const { container } = setup({
      to: '/michka-page',
    });

    const link = container.querySelector('a[aria-hidden=true]');
    expect(link).toHaveAttribute('href', '/michka-page');
  });

  test('renders as a button without to prop', () => {
    const { container } = setup();

    expect(container.querySelector('button[aria-hidden=true]')).toBeInTheDocument();
  });
});
