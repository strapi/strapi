import { render, screen } from '@tests/utils';

import { Form } from '../../../../../../components/Form';
import { HeadersInput } from '../HeadersInput';

const renderHeadersInput = (headers: Array<{ key: string; value: string }>) =>
  render(
    <Form method="POST" initialValues={{ headers }}>
      <HeadersInput />
    </Form>
  );

describe('HeadersInput', () => {
  it('keeps the existing rows mounted when a new header row is added', async () => {
    const { user } = renderHeadersInput([{ key: '', value: '' }]);

    const firstRowValue = screen.getByRole('textbox', { name: 'row 1 value' });

    await user.click(screen.getByRole('button', { name: 'Create new header' }));

    expect(await screen.findByRole('textbox', { name: 'row 2 value' })).toBeInTheDocument();

    // the pre-existing row must be the very same DOM node, i.e. its key was stable
    expect(screen.getByRole('textbox', { name: 'row 1 value' })).toBe(firstRowValue);
    // and the new row is a brand new node, i.e. it got a fresh key
    expect(screen.getByRole('textbox', { name: 'row 2 value' })).not.toBe(firstRowValue);
  });

  it('keeps the surviving rows mounted when a middle header row is removed', async () => {
    const { user } = renderHeadersInput([
      { key: 'Accept', value: 'first' },
      { key: 'Authorization', value: 'second' },
      { key: 'Date', value: 'third' },
    ]);

    const firstRowValue = screen.getByRole('textbox', { name: 'row 1 value' });
    const thirdRowValue = screen.getByRole('textbox', { name: 'row 3 value' });

    await user.click(screen.getByRole('button', { name: 'Remove header row 2' }));

    expect(screen.queryByRole('textbox', { name: 'row 3 value' })).not.toBeInTheDocument();

    // row 1 is untouched, row 3 shifted up to position 2 but is the same DOM node
    expect(screen.getByRole('textbox', { name: 'row 1 value' })).toBe(firstRowValue);
    expect(screen.getByRole('textbox', { name: 'row 2 value' })).toBe(thirdRowValue);
    expect(thirdRowValue).toHaveValue('third');
  });
});
