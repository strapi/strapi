import { lightTheme, ThemeProvider, Icon } from '@strapi/design-system';
import { GlassesSquare, ExternalLink } from '@strapi/icons';
import { render as renderRTL, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { ContentBox, ContentBoxProps } from '../ContentBox';

describe('ContentBox', () => {
  const render = (props?: Partial<ContentBoxProps>) => ({
    ...renderRTL(
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
        {...props}
      />,
      {
        wrapper: ({ children }) => (
          <ThemeProvider theme={lightTheme}>
            <IntlProvider locale="en" messages={{}} textComponent="span">
              {children}
            </IntlProvider>
          </ThemeProvider>
        ),
      }
    ),
  });

  it('renders with all provided props', async () => {
    render();
    expect(screen.getByText('Code example')).toBeInTheDocument();
    expect(
      screen.getByText('Learn by testing real project developed by the community')
    ).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByTestId('end-action-icon')).toBeInTheDocument();
  });

  it('truncates title greater than 70 characters with ellipsis', () => {
    render({
      title: 'ContentBox Testing Title Ellipsis When Length is Greater Than 70 Characters',
      titleEllipsis: true,
    });

    expect(
      screen.getByText('ContentBox Testing Title Ellipsis When Length is Greater Than 70 Chara...')
    ).toBeInTheDocument();
  });
});
