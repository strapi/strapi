import { render, screen } from '@tests/utils';

import { ModalForm } from '../NewUserForm';

jest.mock('@strapi/design-system', () => {
  const actual = jest.requireActual('@strapi/design-system');
  const React = jest.requireActual('react');
  const ActualContent = actual.Modal.Content;

  return {
    ...actual,
    Modal: {
      ...actual.Modal,
      Content: ({ onInteractOutside, children, ...props }: any) => {
        const [prevented, setPrevented] = React.useState(false);

        return React.createElement(
          ActualContent,
          props,
          React.createElement(
            'button',
            {
              type: 'button',
              'data-testid': 'simulate-outside-interaction',
              onClick: () => {
                onInteractOutside?.({
                  preventDefault: () => setPrevented(true),
                });
              },
            },
            'Simulate outside interaction'
          ),
          React.createElement('span', {
            'data-testid': 'outside-interaction-result',
            'data-prevented': String(prevented),
          }),
          children
        );
      },
    },
  };
});

jest.mock('../../../../../../hooks/useAdminRoles', () => ({
  useAdminRoles: jest.fn(() => ({
    roles: [],
    isLoading: false,
  })),
}));

jest.mock('../../../../../../services/users', () => ({
  useCreateUserMutation: jest.fn(() => [jest.fn()]),
}));

describe('<ModalForm />', () => {
  it('prevents outside interactions from dismissing the invite form', async () => {
    const onToggle = jest.fn();
    const { user } = render(<ModalForm onToggle={onToggle} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('outside-interaction-result')).toHaveAttribute(
      'data-prevented',
      'false'
    );

    await user.click(screen.getByTestId('simulate-outside-interaction'));

    expect(screen.getByTestId('outside-interaction-result')).toHaveAttribute(
      'data-prevented',
      'true'
    );
    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close modal' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
