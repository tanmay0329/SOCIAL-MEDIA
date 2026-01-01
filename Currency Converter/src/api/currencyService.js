/**
 * Fetches currency data from the API.
 * @param {string} currency - The currency code (e.g., 'usd').
 * @returns {Promise<object>} - The currency data.
 */
export const fetchCurrencyRates = async (currency) => {
    if (!currency) return {};
    const lowerCurrency = currency.toLowerCase();
    try {
        const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${lowerCurrency}.json`);
        if (!response.ok) {
            throw new Error(`Failed to fetch rates for ${lowerCurrency}`);
        }
        const data = await response.json();
        return data[lowerCurrency] || {};
    } catch (error) {
        console.error("Service Error:", error);
        throw error;
    }
};
