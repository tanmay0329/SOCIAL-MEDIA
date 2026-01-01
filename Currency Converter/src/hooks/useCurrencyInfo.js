import { useEffect, useState } from "react";

function useCurrencyInfo(currency) {
    const [data, setData] = useState({});
    useEffect(() => {
        if (!currency) return;
        const lowerCurrency = currency.toLowerCase();
        fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${lowerCurrency}.json`)
            .then((res) => res.json())
            .then((res) => {
                const result = res[lowerCurrency] || {};
                console.log("Hook Fetch Result:", result);
                setData(result);
            })
            .catch((err) => {
                console.error("Currency API Error:", err);
                setData({});
            });
    }, [currency])

    return data;
}

export default useCurrencyInfo;
