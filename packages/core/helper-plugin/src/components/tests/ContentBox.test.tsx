import { lightTheme, ThemeProvider, Icon } from '@strapi/design-system';
import { GlassesSquare, ExternalLink } from '@strapi/icons';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { ContentBox } from '../ContentBox';

const App = (
  <ThemeProvider theme={lightTheme}>
    <IntlProvider locale="en" messages={{}} textComponent="span">
      <ContentBox
        title="Code example"
        subtitle="Learn by testing real project developed by the community"
        icon={<GlassesSquare data-testid="icon" />}
        iconBackground="alternative100"
        endAction={
          <Icon
            data-testid="end-action-icon"
            as={ExternalLink}
            color="neutral600"
            width={3}
            height={3}
            marginLeft={2}
          />
        }
        titleEllipsis={false}
      />
    </IntlProvider>
  </ThemeProvider>
);

describe('ContentBox', () => {
  it('renders with all provided props', async () => {
    render(App);

    expect(screen.getByText('Code example')).toBeInTheDocument();
    expect(
      screen.getByText('Learn by testing real project developed by the community')
    ).toBeInTheDocument();

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByTestId('icon').parentElement).toHaveStyle('background: rgb(246, 236, 252)');
    expect(screen.getByTestId('end-action-icon')).toBeInTheDocument();
  });
});
