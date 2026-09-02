import { render, screen } from '@tests/utils';

import { RecoveryCodes } from '../RecoveryCodes';

const CODES = ['ABCDE12345', 'FGHJK67890', 'MNPQR13579'];

describe('RecoveryCodes', () => {
  it('lists every code and disables acknowledging until the checkbox is ticked', async () => {
    const onAcknowledged = jest.fn();
    const { user } = render(<RecoveryCodes codes={CODES} onAcknowledged={onAcknowledged} />);

    CODES.forEach((code) => expect(screen.getByText(code)).toBeInTheDocument());

    const done = screen.getByRole('button', { name: 'I have saved my recovery codes' });
    expect(done).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /saved these codes/i }));
    expect(done).toBeEnabled();

    await user.click(done);
    expect(onAcknowledged).toHaveBeenCalledTimes(1);
  });

  it('copies all codes as one line each', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    const { user } = render(<RecoveryCodes codes={CODES} onAcknowledged={jest.fn()} />);
    // `render()`'s `user` (`userEvent.setup()`) stubs `navigator.clipboard` itself (see
    // `@testing-library/user-event`'s `attachClipboardStubToView`), as a getter-only property
    // that it reinstalls on every `setup()` call -- so the override has to happen after
    // `render()`, and `Object.assign` can't replace a getter-only property at all (it throws
    // "Cannot set property clipboard ... which has only a getter"); `defineProperty` replaces
    // the whole descriptor instead.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith(CODES.join('\n'));
  });

  it('offers a text download of the codes', () => {
    render(<RecoveryCodes codes={CODES} onAcknowledged={jest.fn()} />);

    const link = screen.getByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('download', 'strapi-recovery-codes.txt');
    expect(link).toHaveAttribute('href', expect.stringMatching(/^data:text\/plain/));
    expect(decodeURIComponent(link.getAttribute('href')!.split(',')[1])).toBe(CODES.join('\n'));
  });
});
