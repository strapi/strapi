import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { useFolderStructure } from '../../../hooks/useFolderStructure';
import { DialogHeader } from '../DialogHeader';

jest.mock('../../../hooks/useFolderStructure');

const setup = props => {
  const withDefaults = {
    currentFolder: null,
    onChangeFolder: jest.fn(),
    ...props,
  };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}}>
          <DialogHeader {...withDefaults} />
        </IntlProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Upload || components || DialogHeader', () => {
  it('should render folder name and back button', () => {
    const handleChangeFolderSpy = jest.fn();
    const { queryByText } = setup({ currentFolder: 2, onChangeFolder: handleChangeFolderSpy });

    expect(queryByText('second child')).toBeInTheDocument();

    const goBackButton = screen.getByLabelText('Go back');
    expect(goBackButton).toBeInTheDocument();

    fireEvent.click(goBackButton);
    expect(handleChangeFolderSpy).toHaveBeenCalled();
  });

  it('should truncate long folder name', () => {
    useFolderStructure.mockReturnValueOnce({
      isLoading: false,
      error: null,
      data: [
        {
          value: null,
          label: 'Media Library',
          children: [
            {
              value: 1,
              label: 'This is a really really long folder name that should be truncated',
              children: [],
            },
          ],
        },
      ],
    });
    const { queryByText } = setup({ currentFolder: 1 });

    expect(
      queryByText('This is a really really long folder name that should be trun...')
    ).toBeInTheDocument();
  });

  it('should not render folder name and back button if the current folder is root', () => {
    const { queryByText } = setup();

    expect(queryByText('Cats')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
  });
});
