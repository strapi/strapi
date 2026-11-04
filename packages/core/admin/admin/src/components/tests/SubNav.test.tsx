import { render, screen } from '@tests/utils';

import { SubNav } from '../SubNav';

describe('SubNav', () => {
  it('renders static list children without explicit keys', () => {
    render(
      <SubNav.Main>
        <SubNav.Content>
          <SubNav.Sections>
            <SubNav.Section label="One">
              <SubNav.Link to="/a1" label="A1" />
              <SubNav.SubSection label="Nested">
                <SubNav.Link to="/a2" label="A2" />
                <SubNav.Link to="/a3" label="A3" />
              </SubNav.SubSection>
            </SubNav.Section>
            <SubNav.Section label="Two">
              <SubNav.Link to="/b1" label="B1" />
              <SubNav.Link to="/b2" label="B2" />
            </SubNav.Section>
          </SubNav.Sections>
        </SubNav.Content>
      </SubNav.Main>
    );

    expect(screen.getByRole('link', { name: 'A1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'A2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'A3' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'B1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'B2' })).toBeInTheDocument();
  });
});
