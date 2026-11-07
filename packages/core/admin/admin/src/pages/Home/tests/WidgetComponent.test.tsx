import { render, screen } from '@tests/utils';

import { WidgetComponent } from '../HomePage';

const LoadedWidget = () => <p>widget content</p>;

describe('WidgetComponent', () => {
  it('renders the widget once its module loads', async () => {
    render(<WidgetComponent component={() => Promise.resolve(LoadedWidget)} columnWidth={6} />);

    expect(await screen.findByText('widget content')).toBeInTheDocument();
    expect(screen.queryByText(/loading widget content/i)).not.toBeInTheDocument();
  });

  it('renders the widget error state when its module fails to load', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <WidgetComponent
        component={() => Promise.reject(new Error('Loading chunk failed'))}
        columnWidth={6}
      />
    );

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText("Couldn't load widget content.")).toBeInTheDocument();
    expect(screen.queryByText(/loading widget content/i)).not.toBeInTheDocument();
    expect(screen.queryByText('widget content')).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
