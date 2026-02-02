import { render, screen } from '@tests/utils';

import { AddStage } from '../AddStage';

describe('AddStage', () => {
  it('should render a button to add a stage', () => {
    const { getByText, getByRole } = render(<AddStage>Add stage</AddStage>);

    // Check that the button exists and contains the text
    const button = getByRole('button');
    expect(button).toBeInTheDocument();
    expect(getByText('Add stage')).toBeInTheDocument();

    // Check that component structure contains Typography and Flex components
    const typographyElement = button.querySelector('*'); // This targets the first child, which should be the Typography component
    expect(typographyElement).toBeInTheDocument();
  });
});
