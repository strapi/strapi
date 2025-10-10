// TODO: find a better naming convention for the file that was an index file before
import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import en from '../../../translations/en.json';
import { UploadProgress, UploadProgressProps } from '../UploadProgress';

type MessageKeys = keyof typeof en;

const enKeys = Object.keys(en) as MessageKeys[];

const messageForPlugin = enKeys.reduce(
  (acc: { [key in MessageKeys]: string }, curr: MessageKeys) => {
    acc[curr] = `upload.${en[curr]}`;
    return acc;
  },
  {} as { [key in MessageKeys]: string }
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const renderCompo = (props: UploadProgressProps) => {
  const target = document.createElement('div');
  document.body.appendChild(target);

  return render(
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider>
        <IntlProvider locale="en" messages={messageForPlugin} defaultLocale="en">
          <UploadProgress error={undefined} {...props} />
        </IntlProvider>
      </DesignSystemProvider>
    </QueryClientProvider>,
    { container: target }
  );
};

describe('<UploadProgress />', () => {
  it('renders with no error', () => {
    renderCompo({ onCancel: jest.fn() });

    // Ensure progress bar is present
    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('data-state', 'indeterminate');

    // Check for the progress label
    expect(screen.getByText('0/100%')).toBeInTheDocument();

    // Check for the cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('renders with an error', () => {
    renderCompo({ error: new Error('Something went wrong'), onCancel: jest.fn() });

    const errorIcon = screen.getByLabelText('Something went wrong');
    expect(errorIcon).toBeInTheDocument();
  });

  it('cancel the upload when pressing cancel', () => {
    const onCancelSpy = jest.fn();

    renderCompo({ onCancel: onCancelSpy });

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancelSpy).toHaveBeenCalled();
  });
});
