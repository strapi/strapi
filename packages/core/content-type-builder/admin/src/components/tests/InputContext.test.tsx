import * as React from 'react';

import { render, screen } from '@strapi/admin/strapi-admin/test';

import { Input } from '../AIChat/components/Input';

describe('Input context', () => {
  it('keeps the value stable until its input changes', () => {
    const renderConsumer = jest.fn();
    const Consumer = React.memo(() => {
      const { isLoading } = Input.useInput();

      renderConsumer(isLoading);

      return <span>{String(isLoading)}</span>;
    });
    const { rerender } = render(
      <Input.Root isLoading={false}>
        <Consumer />
      </Input.Root>
    );

    expect(screen.getByText('false')).toBeInTheDocument();
    expect(renderConsumer).toHaveBeenCalledTimes(1);

    rerender(
      <Input.Root isLoading={false}>
        <Consumer />
      </Input.Root>
    );

    expect(renderConsumer).toHaveBeenCalledTimes(1);

    rerender(
      <Input.Root isLoading>
        <Consumer />
      </Input.Root>
    );

    expect(screen.getByText('true')).toBeInTheDocument();
    expect(renderConsumer).toHaveBeenCalledTimes(2);
  });
});
