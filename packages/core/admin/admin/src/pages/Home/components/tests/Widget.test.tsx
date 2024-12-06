import { Cog } from '@strapi/icons';
import { render, screen } from '@tests/utils';

import { Widget } from '../Widget';

describe('Homepage Widget component', () => {
  it('should render the widget with info from props', () => {
    render(
      <Widget title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }} icon={Cog}>
        actual widget content
      </Widget>
    );

    expect(screen.queryByText(/loading widget/i)).not.toBeInTheDocument();
    expect(screen.getByText(/cool widget title/i)).toBeInTheDocument();
    expect(screen.getByText('actual widget content')).toBeInTheDocument();
  });

  it('should render a spinner while a widget is loading', () => {
    render(
      <Widget title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }} isLoading>
        actual widget content
      </Widget>
    );

    expect(screen.getByText(/loading widget/i)).toBeInTheDocument();
    expect(screen.getByText(/cool widget title/i)).toBeInTheDocument();
    expect(screen.queryByText('actual widget content')).not.toBeInTheDocument();
  });
});
