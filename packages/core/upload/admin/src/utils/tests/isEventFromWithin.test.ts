import type { SyntheticEvent } from 'react';

import { isEventFromWithin } from '../isEventFromWithin';

const eventFor = (currentTarget: unknown, target: unknown) =>
  ({ currentTarget, target }) as unknown as SyntheticEvent;

describe('isEventFromWithin', () => {
  it('accepts the current target itself and its descendants', () => {
    const row = document.createElement('div');
    const button = document.createElement('button');
    row.appendChild(button);

    expect(isEventFromWithin(eventFor(row, row))).toBe(true);
    expect(isEventFromWithin(eventFor(row, button))).toBe(true);
  });

  it('rejects a target rendered outside the current target, as a portal is', () => {
    const row = document.createElement('div');
    const portal = document.createElement('div');
    document.body.append(row, portal);

    expect(isEventFromWithin(eventFor(row, portal))).toBe(false);
  });

  it('rejects an event with no usable nodes', () => {
    const row = document.createElement('div');

    expect(isEventFromWithin(eventFor(row, null))).toBe(false);
    expect(isEventFromWithin(eventFor(null, row))).toBe(false);
    expect(isEventFromWithin(eventFor(window, row))).toBe(false);
  });
});
