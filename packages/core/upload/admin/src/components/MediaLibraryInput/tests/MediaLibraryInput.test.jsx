import React from 'react';

import { Form } from '@strapi/admin/strapi-admin';
import { screen, render } from '@tests/utils';

import { MediaLibraryInput } from '../index';

describe('<MediaLibraryInput />', () => {
  it('renders and matches the snapshot', () => {
    render(<MediaLibraryInput name="test" label="default message" required />, {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form onSubmit={jest.fn()} method="POST">
            {children}
          </Form>
        ),
      },
    });

    expect(screen.getByRole('button')).toMatchInlineSnapshot(`
      .c0 {
        width: 100%;
        height: 100%;
      }

      .c1 {
        gap: 12px;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        display: flex;
      }

      .c2 {
        font-size: 1.2rem;
        line-height: 1.33;
        color: #666687;
        font-weight: 600;
      }

      .c3 {
        align-items: center;
      }

      <button
        class="c0 c1"
        style="cursor: pointer;"
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="#4945ff"
          height="3.2rem"
          viewBox="0 0 32 32"
          width="3.2rem"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 3a13 13 0 1 0 13 13A13.016 13.016 0 0 0 16 3m5 14h-4v4a1 1 0 0 1-2 0v-4h-4a1 1 0 0 1 0-2h4v-4a1 1 0 0 1 2 0v4h4a1 1 0 0 1 0 2"
          />
        </svg>
        <span
          class="c2 c3"
          style="text-align: center;"
        >
          Click to add an asset or drag and drop one in this area
        </span>
      </button>
    `);
  });
});
