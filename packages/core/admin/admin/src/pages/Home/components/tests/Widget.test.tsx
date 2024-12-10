import { Cog } from '@strapi/icons';
import { render, screen } from '@tests/utils';

import { Widget } from '../Widget';

describe('Homepage Widget component', () => {
  it('should render the widget with info from props', () => {
    render(
      <Widget.Root title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }} icon={Cog}>
        actual widget content
      </Widget.Root>
    );

    expect(screen.queryByText(/loading widget/i)).not.toBeInTheDocument();
    expect(screen.getByText(/cool widget title/i)).toBeInTheDocument();
    expect(screen.getByText('actual widget content')).toBeInTheDocument();
  });

  it('should render a spinner while a widget is loading', () => {
    render(
      <Widget.Root title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.Loading />
      </Widget.Root>
    );

    expect(screen.getByText(/loading widget/i)).toBeInTheDocument();
    expect(screen.getByText(/cool widget title/i)).toBeInTheDocument();
  });

  it('should render an error message when a widget fails to load', () => {
    render(
      <Widget.Root title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.Error />
      </Widget.Root>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/couldn't load widget content/i)).toBeInTheDocument();
  });

  it('should render a custom error message when provided', () => {
    render(
      <Widget.Root title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.Error>Custom error message</Widget.Error>
      </Widget.Root>
    );

    expect(screen.getByText(/custom error message/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load widget content/i)).not.toBeInTheDocument();
  });

  it('should render a no data message when a widget has no data', () => {
    render(
      <Widget.Root title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.NoData />
      </Widget.Root>
    );

    expect(screen.getByText(/no content found/i)).toBeInTheDocument();
  });

  it('should render a custom no data message when provided', () => {
    render(
      <Widget.Root title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.NoData>Custom no data message</Widget.NoData>
      </Widget.Root>
    );

    expect(screen.getByText(/custom no data message/i)).toBeInTheDocument();
    expect(screen.queryByText(/no content found/i)).not.toBeInTheDocument();
  });
});
