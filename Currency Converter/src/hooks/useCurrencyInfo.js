import { useEffect, useState } from "react";
import { fetchCurrencyRates } from "../api/currencyService";

function useCurrencyInfo(currency) {
    const [data, setData] = useState({});

    useEffect(() => {
        const loadData = async () => {
            try {
                const result = await fetchCurrencyRates(currency);
                console.log("Hook Fetch Result:", result);
                setData(result);
            } catch (error) {
                setData({});
            }
        }
        loadData();
    }, [currency])

    return data;
}

export default useCurrencyInfo;
