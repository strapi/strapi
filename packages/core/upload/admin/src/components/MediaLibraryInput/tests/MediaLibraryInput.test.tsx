import { Form } from '@strapi/admin/strapi-admin';
import { screen, render } from '@tests/utils';

import { MediaLibraryInput } from '../MediaLibraryInput';

describe('<MediaLibraryInput />', () => {
  it('renders and matches the snapshot', () => {
    render(<MediaLibraryInput attribute={{}} name="test" label="default message" required />, {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form onSubmit={jest.fn()} method="POST">
            {children}
          </Form>
        ),
      },
    });

    const button = screen.getByRole('button');

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click to add an asset or drag and drop one in this area');
    expect(button).toHaveAttribute('type', 'button');
  });
});
