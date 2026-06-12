import { getEditViewShortcut } from '../keyboardShortcuts';

const createEvent = (init: KeyboardEventInit): KeyboardEvent => new KeyboardEvent('keydown', init);

describe('getEditViewShortcut', () => {
  describe('save', () => {
    it('returns "save" for Cmd + Enter (macOS)', () => {
      expect(getEditViewShortcut(createEvent({ key: 'Enter', metaKey: true }))).toBe('save');
    });

    it('returns "save" for Ctrl + Enter (Windows/Linux)', () => {
      expect(getEditViewShortcut(createEvent({ key: 'Enter', ctrlKey: true }))).toBe('save');
    });

    it('returns "save" for Cmd + S as an alias', () => {
      expect(getEditViewShortcut(createEvent({ key: 's', metaKey: true }))).toBe('save');
    });

    it('returns "save" for Ctrl + S as an alias', () => {
      expect(getEditViewShortcut(createEvent({ key: 's', ctrlKey: true }))).toBe('save');
    });

    it('is case-insensitive for the S alias (e.g. CapsLock on)', () => {
      expect(getEditViewShortcut(createEvent({ key: 'S', metaKey: true }))).toBe('save');
    });
  });

  describe('publish', () => {
    it('returns "publish" for Cmd + Shift + Enter (macOS)', () => {
      expect(
        getEditViewShortcut(createEvent({ key: 'Enter', metaKey: true, shiftKey: true }))
      ).toBe('publish');
    });

    it('returns "publish" for Ctrl + Shift + Enter (Windows/Linux)', () => {
      expect(
        getEditViewShortcut(createEvent({ key: 'Enter', ctrlKey: true, shiftKey: true }))
      ).toBe('publish');
    });
  });

  describe('no shortcut', () => {
    it('returns null without a platform modifier', () => {
      expect(getEditViewShortcut(createEvent({ key: 'Enter' }))).toBeNull();
      expect(getEditViewShortcut(createEvent({ key: 's' }))).toBeNull();
      expect(getEditViewShortcut(createEvent({ key: 'Enter', shiftKey: true }))).toBeNull();
    });

    it('returns null for Cmd/Ctrl + Shift + S (publish has no S alias)', () => {
      expect(
        getEditViewShortcut(createEvent({ key: 's', metaKey: true, shiftKey: true }))
      ).toBeNull();
    });

    it('returns null for unrelated keys with a platform modifier', () => {
      expect(getEditViewShortcut(createEvent({ key: 'a', metaKey: true }))).toBeNull();
      expect(getEditViewShortcut(createEvent({ key: 'k', ctrlKey: true }))).toBeNull();
      expect(getEditViewShortcut(createEvent({ key: 'Escape', metaKey: true }))).toBeNull();
    });
  });
});
