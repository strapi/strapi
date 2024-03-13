import { render, screen } from '@tests/utils';

import { DocumentStatus } from '../DocumentStatus';

describe('DocumentStatus', () => {
  it('should render a draft status by default', () => {
    render(<DocumentStatus />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toHaveStyle({
      color: 'rgb(73, 69, 255)',
    });
  });

  it("should render the published status when the status is 'published'", () => {
    render(<DocumentStatus status="published" />);

    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Published')).toHaveStyle({ color: 'rgb(50, 128, 72)' });
  });

  it("should render the modified status when the status is 'modified'", () => {
    render(<DocumentStatus status="modified" />);

    expect(screen.getByText('Modified')).toBeInTheDocument();
    expect(screen.getByText('Modified')).toHaveStyle({ color: 'rgb(151, 54, 232)' });
  });

  it('should give any status that is not draft or published the alternative variant', () => {
    render(<DocumentStatus status="archived" />);

    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toHaveStyle({ color: 'rgb(151, 54, 232)' });
  });
});
