import React from 'react';
import { BaseLink } from '@strapi/design-system/BaseLink';
import { Flex } from '@strapi/design-system/Flex';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { Typography } from '@strapi/design-system/Typography';
import { render, fireEvent } from '@testing-library/react';

import { FolderCard } from '../FolderCard';
import { FolderCardBody } from '../FolderCardBody';
import { FolderCardCheckbox } from '../FolderCardCheckbox';

const ID_FIXTURE = 'folder-1';

// eslint-disable-next-line react/prop-types
const ComponentFixture = ({ children, ...props }) => {
  return (
    <ThemeProvider theme={lightTheme}>
      <FolderCard
        id={ID_FIXTURE}
        ariaLabel="Folder 1"
        href="/"
        startAction={<></>}
        onDoubleClick={() => {}}
        {...props}
      >
        {children || ''}
      </FolderCard>
    </ThemeProvider>
  );
};

describe('FolderCard', () => {
  it('renders and matches the snapshot', () => {
    const { container } = render(<ComponentFixture />);
    expect(container).toMatchSnapshot();
  });

  it('properly calls the onDoubleClick callback', () => {
    const callback = jest.fn();
    const { container } = render(<ComponentFixture onDoubleClick={callback} />);

    fireEvent(container.querySelector('a'), new MouseEvent('dblclick', { bubbles: true }));

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('has all required ids set when rendering a start action', () => {
    const { container } = render(
      <ComponentFixture startAction={<FolderCardCheckbox value={false} />}>
        <FolderCardBody as="h2">
          <BaseLink href="https://strapi.io" textDecoration="none">
            <Flex direction="column" alignItems="flex-start">
              <Typography variant="omega" fontWeight="semiBold">
                Pictures
              </Typography>
            </Flex>
          </BaseLink>
        </FolderCardBody>
      </ComponentFixture>
    );

    expect(container.querySelector(`[id="${ID_FIXTURE}-title"]`)).toBeInTheDocument();
    expect(container.querySelector(`[aria-labelledby="${ID_FIXTURE}-title"]`)).toBeInTheDocument();
  });
});
