import { render, screen } from '@tests/utils';
import { IntlProvider } from 'react-intl';

import { FormLayout } from '../FormLayout';

jest.mock('../InputRenderer', () => ({
  InputRenderer: ({ label, placeholder }: { label: string; placeholder?: string }) => (
    <div>
      <span data-testid="label">{label}</span>
      <span data-testid="placeholder">{placeholder ?? 'none'}</span>
    </div>
  ),
}));

const layout = (placeholder?: string) =>
  [
    [
      [
        {
          attribute: { type: 'string' },
          label: 'Title',
          name: 'title',
          placeholder,
          size: 12,
          type: 'string',
        },
      ],
    ],
  ] as any;

const document = { schema: { uid: 'api::article.article' } } as any;

const renderLayout = (placeholder?: string, messages: Record<string, string> = {}) =>
  render(<FormLayout layout={layout(placeholder)} document={document} />, {
    renderOptions: {
      wrapper: ({ children }) => (
        <IntlProvider locale="en" messages={messages} onError={() => {}}>
          {children}
        </IntlProvider>
      ),
    },
  });

describe('<FormLayout /> placeholder', () => {
  it('falls back to the configured placeholder when there is no translation', () => {
    renderLayout('Type a title');

    expect(screen.getByTestId('placeholder')).toHaveTextContent('Type a title');
  });

  it('uses the translation registered for the .placeholder key', () => {
    renderLayout('Type a title', {
      'content-manager.content-types.api::article.article.title.placeholder': 'Escribe un título',
    });

    expect(screen.getByTestId('placeholder')).toHaveTextContent('Escribe un título');
  });

  it('does not invent a placeholder when none is configured', () => {
    renderLayout(undefined, {
      'content-manager.content-types.api::article.article.title.placeholder': 'Escribe un título',
    });

    expect(screen.getByTestId('placeholder')).toHaveTextContent('none');
  });
});
