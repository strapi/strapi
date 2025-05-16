import { Cog } from '@strapi/icons';
import { render, screen } from '@tests/utils';

import { WidgetRoot } from '../../pages/Home/HomePage';
import { Widget } from '../WidgetHelpers';

describe('Homepage Widget component', () => {
  it('should render the widget with info from props', () => {
    render(
      <WidgetRoot title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }} icon={Cog}>
        actual widget content
      </WidgetRoot>
    );

    expect(screen.queryByText(/loading widget/i)).not.toBeInTheDocument();
    expect(screen.getByText(/cool widget title/i)).toBeInTheDocument();
    expect(screen.getByText('actual widget content')).toBeInTheDocument();
  });

  it('should render a spinner while a widget is loading', () => {
    render(
      <WidgetRoot title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.Loading />
      </WidgetRoot>
    );

    expect(screen.getByText(/loading widget/i)).toBeInTheDocument();
    expect(screen.getByText(/cool widget title/i)).toBeInTheDocument();
  });

  it('should render an error message when a widget fails to load', () => {
    render(
      <WidgetRoot title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.Error />
      </WidgetRoot>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/couldn't load widget content/i)).toBeInTheDocument();
  });

  it('should render a custom error message when provided', () => {
    render(
      <WidgetRoot title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.Error>Custom error message</Widget.Error>
      </WidgetRoot>
    );

    expect(screen.getByText(/custom error message/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load widget content/i)).not.toBeInTheDocument();
  });

  it('should render a no data message when a widget has no data', () => {
    render(
      <WidgetRoot title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.NoData />
      </WidgetRoot>
    );

    expect(screen.getByText(/no content found/i)).toBeInTheDocument();
  });

  it('should render a custom no data message when provided', () => {
    render(
      <WidgetRoot title={{ defaultMessage: 'Cool widget title', id: 'notarealid' }}>
        <Widget.NoData>Custom no data message</Widget.NoData>
      </WidgetRoot>
    );

    expect(screen.getByText(/custom no data message/i)).toBeInTheDocument();
    expect(screen.queryByText(/no content found/i)).not.toBeInTheDocument();
  });
});
