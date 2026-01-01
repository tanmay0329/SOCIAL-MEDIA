import { render, screen, fireEvent } from '@testing-library/react';
import { InputBox } from './index';
import { vi } from 'vitest';

describe('InputBox Component', () => {
    it('renders label and input correctly', () => {
        render(<InputBox label="From" amount={100} currencyOptions={['usd', 'inr']} />);
        expect(screen.getByText('From')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Amount')).toHaveValue(100);
    });

    it('calls onAmountChange when input changes', () => {
        const handleChange = vi.fn();
        render(<InputBox label="From" amount={0} onAmountChange={handleChange} />);
        
        const input = screen.getByPlaceholderText('Amount');
        fireEvent.change(input, { target: { value: '50' } });

        expect(handleChange).toHaveBeenCalledWith(50);
    });

    it('calls onCurrencyChange when currency is selected', () => {
        const handleCurrencyChange = vi.fn();
        render(
            <InputBox 
                label="From" 
                amount={0} 
                currencyOptions={['usd', 'inr']} 
                onCurrencyChange={handleCurrencyChange} 
                selectCurrency="usd" 
            />
        );

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'inr' } });

        expect(handleCurrencyChange).toHaveBeenCalledWith('inr');
    });

    it('disables input when amountDisable is true', () => {
        render(<InputBox label="To" amount={100} amountDisable={true} />);
        const input = screen.getByPlaceholderText('Amount');
        expect(input).toBeDisabled();
    });
});
