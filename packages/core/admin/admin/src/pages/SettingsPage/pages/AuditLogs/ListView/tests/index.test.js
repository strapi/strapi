import React from 'react';
import { Router } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { createMemoryHistory } from 'history';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { TrackingProvider } from '@strapi/helper-plugin';
import ListView from '../index';

const history = createMemoryHistory();
const user = userEvent.setup();

const App = (
  <TrackingProvider>
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
        <Router history={history}>
          <ListView />
        </Router>
      </IntlProvider>
    </ThemeProvider>
  </TrackingProvider>
);

describe('ADMIN | Pages | AUDIT LOGS | ListView', () => {
  it('should render page with right header details', () => {
    render(App);
    const title = screen.getByText(/audit logs/i);
    expect(title).toBeInTheDocument();
    const subTitle = screen.getByText(
      /logs of all the activities that happened on your environment/i
    );
    expect(subTitle).toBeInTheDocument();
  });

  it('should show a list of audit logs with right count', () => {
    const { container } = render(App);
    const rows = container.querySelector('tbody').querySelectorAll('tr');
    expect(rows.length).toBe(4);
    expect(screen.getByText('Update')).toBeInTheDocument();
  });

  it('should open a modal when clicked on a table row and close modal when clicked', async () => {
    const { container } = render(App);
    expect(screen.queryByText(/log details/i)).not.toBeInTheDocument();

    const rows = container.querySelector('tbody').querySelectorAll('tr');
    await user.click(rows[0]);
    expect(screen.getByText(/log details/i)).toBeInTheDocument();

    const label = screen.getByText(/close the modal/i);
    const closeButton = label.closest('button');
    await user.click(closeButton);
    expect(screen.queryByText(/log details/i)).not.toBeInTheDocument();
  });
});
