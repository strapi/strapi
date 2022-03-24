import React from 'react';
import { BaseLink } from '@strapi/design-system/BaseLink';
import { Flex } from '@strapi/design-system/Flex';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Typography } from '@strapi/design-system/Typography';
import { render, fireEvent, act } from '@testing-library/react';

import { FolderCard } from '../FolderCard';
import { FolderCardBody } from '../FolderCardBody';
import { FolderCardCheckbox } from '../FolderCardCheckbox';

const ID_FIXTURE = 'folder';

// eslint-disable-next-line react/prop-types
const ComponentFixture = props => {
  return (
    <ThemeProvider theme={lightTheme}>
      <FolderCard
        id={ID_FIXTURE}
        ariaLabel="Folder 1"
        startAction={<></>}
        onDoubleClick={() => {}}
        {...props}
      >
        <FolderCardBody as="h2">
          <BaseLink href="https://strapi.io" textDecoration="none">
            <Flex direction="column" alignItems="flex-start">
              <Typography variant="omega" fontWeight="semiBold">
                Pictures
              </Typography>
            </Flex>
          </BaseLink>
        </FolderCardBody>
      </FolderCard>
    </ThemeProvider>
  );
};

const setup = props => render(<ComponentFixture {...props} />);

describe('FolderCard', () => {
  test('renders and matches the snapshot', () => {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });

  test('properly calls the onDoubleClick callback', () => {
    const callback = jest.fn();
    const { container } = setup({ onDoubleClick: callback });

    act(() => {
      fireEvent(container.querySelector('button'), new MouseEvent('dblclick', { bubbles: true }));
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
});
