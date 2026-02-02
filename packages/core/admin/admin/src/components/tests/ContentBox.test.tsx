import { ExternalLink } from '@strapi/icons';
import { GlassesSquare } from '@strapi/icons/symbols';
import { render as renderRTL, screen } from '@tests/utils';

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
          <ExternalLink
            data-testid="end-action-icon"
            color="neutral600"
            width="1.2rem"
            height="1.2rem"
            style={{
              marginLeft: '0.8rem',
            }}
          />
        }
        titleEllipsis={false}
        {...props}
      />
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
