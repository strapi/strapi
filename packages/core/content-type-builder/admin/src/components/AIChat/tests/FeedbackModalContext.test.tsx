import * as React from 'react';

import { act, render, screen } from '@strapi/admin/strapi-admin/test';

import { FeedbackProvider, useFeedbackModal } from '../FeedbackModal';

/**
 * Opening the modal mounts `FeedbackModal`, whose `useFeedback` reaches for the
 * chat context that this test deliberately does not mount. The provider under
 * test owns none of that, so the hook is stubbed at the module boundary.
 */
jest.mock('../hooks/useFeedback', () => ({
  useFeedback: () => ({
    downvoteMessage: jest.fn(),
    isPending: false,
  }),
}));

/**
 * A memoised consumer only re-renders when the context value identity changes,
 * which is exactly what the provider's `useMemo` controls. Render counts pin
 * stability, the recorded values pin propagation of every field.
 */
const createConsumer = () => {
  const renderConsumer = jest.fn();
  const Consumer = React.memo(function Consumer() {
    const value = useFeedbackModal();

    renderConsumer(value);

    return (
      <span data-testid="consumer">
        {`${value.isFeedbackModalOpen}|${String(value.currentMessageId)}`}
      </span>
    );
  });

  return { renderConsumer, Consumer };
};

type FeedbackModalValue = ReturnType<typeof useFeedbackModal>;

const lastValue = (spy: jest.Mock): FeedbackModalValue => spy.mock.calls.at(-1)?.[0];

describe('FeedbackModal context', () => {
  it('keeps the value stable when the provider re-renders', () => {
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <FeedbackProvider>
        <Consumer />
      </FeedbackProvider>
    );

    expect(screen.getByTestId('consumer')).toHaveTextContent('false|null');
    expect(renderConsumer).toHaveBeenCalledTimes(1);

    rerender(
      <FeedbackProvider>
        <Consumer />
      </FeedbackProvider>
    );

    expect(renderConsumer).toHaveBeenCalledTimes(1);
  });

  it('propagates `currentMessageId` and `isFeedbackModalOpen` when the modal is opened', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <FeedbackProvider>
        <Consumer />
      </FeedbackProvider>
    );

    act(() => {
      lastValue(renderConsumer).openFeedbackModal('message-1');
    });

    expect(lastValue(renderConsumer).isFeedbackModalOpen).toBe(true);
    expect(lastValue(renderConsumer).currentMessageId).toBe('message-1');
    expect(screen.getByTestId('consumer')).toHaveTextContent('true|message-1');
  });

  it('propagates a later `openFeedbackModal` for another message', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <FeedbackProvider>
        <Consumer />
      </FeedbackProvider>
    );

    act(() => {
      lastValue(renderConsumer).openFeedbackModal('message-1');
    });
    act(() => {
      lastValue(renderConsumer).openFeedbackModal('message-2');
    });

    expect(lastValue(renderConsumer).currentMessageId).toBe('message-2');
  });

  it('propagates the reset state when the modal is closed', () => {
    const { renderConsumer, Consumer } = createConsumer();

    render(
      <FeedbackProvider>
        <Consumer />
      </FeedbackProvider>
    );

    act(() => {
      lastValue(renderConsumer).openFeedbackModal('message-1');
    });
    act(() => {
      lastValue(renderConsumer).closeFeedbackModal();
    });

    expect(lastValue(renderConsumer).isFeedbackModalOpen).toBe(false);
    expect(lastValue(renderConsumer).currentMessageId).toBe(null);
    expect(screen.getByTestId('consumer')).toHaveTextContent('false|null');
  });

  it('keeps both callback identities stable across state changes', () => {
    const { renderConsumer, Consumer } = createConsumer();
    const { rerender } = render(
      <FeedbackProvider>
        <Consumer />
      </FeedbackProvider>
    );

    const { openFeedbackModal, closeFeedbackModal } = lastValue(renderConsumer);

    rerender(
      <FeedbackProvider>
        <Consumer />
      </FeedbackProvider>
    );

    act(() => {
      openFeedbackModal('message-1');
    });

    expect(lastValue(renderConsumer).openFeedbackModal).toBe(openFeedbackModal);
    expect(lastValue(renderConsumer).closeFeedbackModal).toBe(closeFeedbackModal);
  });
});
