import { render, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useAIAvailability } from '../../../../../../hooks/useAIAvailability';
import { AIUsage } from '../AIUsage';

jest.mock('../../../../../../hooks/useAIAvailability');

describe('<AIUsage />', () => {
  const getAiUsage = jest.fn(() =>
    HttpResponse.json({
      data: {
        cmsAiCreditsUsed: 10,
        subscription: {
          cmsAiEnabled: true,
          cmsAiCreditsBase: 100,
          cmsAiCreditsMaxUsage: 100,
        },
      },
    })
  );

  beforeEach(() => {
    jest.clearAllMocks();
    getAiUsage.mockClear();
    server.use(http.get('/admin/ai-usage', getAiUsage));
  });

  test('does not request AI usage when AI is not available', async () => {
    jest.mocked(useAIAvailability).mockReturnValue(false);

    const { queryByText } = render(<AIUsage />);

    await waitFor(() => expect(queryByText('AI Usage')).not.toBeInTheDocument());

    expect(getAiUsage).not.toHaveBeenCalled();
  });

  test('requests AI usage when AI is available', async () => {
    jest.mocked(useAIAvailability).mockReturnValue(true);

    render(<AIUsage />);

    await waitFor(() => expect(getAiUsage).toHaveBeenCalled());
  });
});
