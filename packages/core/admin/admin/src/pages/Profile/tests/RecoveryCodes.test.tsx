import { within } from '@testing-library/react';
import { render, screen, waitFor } from '@tests/utils';

import { RecoveryCodes } from '../RecoveryCodes';

const CODES = ['ABCDE12345', 'FGHJK67890', 'MNPQR13579'];

/** jsdom's Blob has no `text()`. */
const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });

describe('RecoveryCodes', () => {
  // `userEvent.setup()` stubs `navigator.clipboard` as a getter-only property and reinstalls it on
  // every call, so a test replacing it needs `defineProperty` (assignment throws). This
  // save/restore keeps that override out of later tests and out of `user-event`'s own state.
  let originalClipboardDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  });

  afterEach(() => {
    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

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
    // After `render()`, because `userEvent.setup()` reinstalls its stub on every call.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(CODES.join('\n')));
  });

  it('downloads the codes as a text file from a revoked object URL, not a data: href', async () => {
    // jsdom has neither, and a `data:` href would leave the codes in the DOM, the status bar and
    // the download history for as long as the step is on screen.
    let blob: Blob | undefined;
    const createObjectURL = jest.fn((value: Blob) => {
      blob = value;
      return 'blob:recovery-codes';
    });
    const revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      const { user } = render(<RecoveryCodes codes={CODES} onAcknowledged={jest.fn()} />);

      expect(screen.queryByRole('link', { name: 'Download' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Download' }));

      expect(click).toHaveBeenCalledTimes(1);
      expect(await readBlob(blob!)).toBe(CODES.join('\n'));
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:recovery-codes');
    } finally {
      click.mockRestore();
    }
  });

  it('announces the codes: a labelled group of list items, with focus moved to its heading', () => {
    render(<RecoveryCodes codes={CODES} onAcknowledged={jest.fn()} />);

    const heading = screen.getByRole('heading', { name: `Your ${CODES.length} recovery codes` });
    expect(heading).toHaveFocus();
    const group = screen.getByRole('group', { name: `Your ${CODES.length} recovery codes` });
    expect(within(group).getAllByRole('listitem')).toHaveLength(CODES.length);
  });
});
