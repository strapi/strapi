import { render, screen } from '@tests/utils';

import { FormLayout } from '../FormLayout';

jest.mock('../InputRenderer', () => ({
  InputRenderer: ({ name, label }: { name: string; label: string }) => (
    <div data-testid={`field-${name}`}>{label}</div>
  ),
}));

describe('FormLayout', () => {
  it('does not forward responsive grid sizing props to the DOM', () => {
    render(
      <FormLayout
        document={{ schema: { uid: 'api::article.article' } } as never}
        layout={[
          [
            [
              {
                name: 'title',
                label: 'Title',
                size: 6,
                type: 'text',
                attribute: { type: 'text' },
              },
            ],
          ],
        ]}
      />
    );

    const field = screen.getByTestId('field-title');

    expect(field).toHaveTextContent('Title');
    // eslint-disable-next-line testing-library/no-node-access
    expect(field.parentElement).not.toHaveAttribute('col');
  });
});
