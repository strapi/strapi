import { render, screen } from '@tests/utils';

import { DocumentStatus } from '../DocumentStatus';

describe('DocumentStatus', () => {
  it('should render a draft status by default', () => {
    render(<DocumentStatus />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it("should render the published status when the status is 'published'", () => {
    render(<DocumentStatus status="published" />);

    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it("should render the modified status when the status is 'modified'", () => {
    render(<DocumentStatus status="modified" />);

    expect(screen.getByText('Modified')).toBeInTheDocument();
  });

  it('should give any status that is not draft or published the alternative variant', () => {
    render(<DocumentStatus status="archived" />);

    expect(screen.getByText('Archived')).toBeInTheDocument();
  });
});
