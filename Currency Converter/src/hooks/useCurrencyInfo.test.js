import { renderHook, waitFor } from '@testing-library/react';
import useCurrencyInfo from './useCurrencyInfo';
import { vi } from 'vitest';

global.fetch = vi.fn();

describe('useCurrencyInfo', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and return currency data', async () => {
        const mockData = { usd: { inr: 80 } };
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });

        const { result } = renderHook(() => useCurrencyInfo('usd'));

        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json')
        );

        await waitFor(() => {
            expect(result.current).toEqual({ inr: 80 });
        });
    });

    it('should handle API errors gracefully', async () => {
        fetch.mockRejectedValueOnce(new Error('API Error'));

        const { result } = renderHook(() => useCurrencyInfo('usd'));

        await waitFor(() => {
            expect(result.current).toEqual({});
        });
    });
});
