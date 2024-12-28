import { render, screen, fireEvent } from '@tests/utils';

import { useField } from '../../Form';
import { DateInput } from '../Date';

jest.mock('../../Form', () => ({
  useField: jest.fn(),
}));

describe('DateInput Component', () => {
  const setupTest = (initialValue: string | null = null, error: string | null = null) => {
    const mockField = {
      value: initialValue,
      onChange: jest.fn(),
      error,
    };
    (useField as jest.Mock).mockReturnValue(mockField);
    return mockField;
  };

  it('should handle initial date display correctly', () => {
    setupTest('2024-12-07T00:00:00.000Z');
    render(<DateInput type="date" name="testDate" label="Test Date" />);

    expect(screen.getByRole('combobox')).toHaveValue('12/07/2024');
  });

  it('should handle date selection and store in UTC format', () => {
    const mockField = setupTest(null);
    render(<DateInput type="date" name="testDate" label="Test Date" />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '12/07/2024' } });
    fireEvent.blur(input);

    expect(mockField.onChange).toHaveBeenCalledWith('testDate', '2024-12-07T00:00:00.000Z');
  });

  it('should handle clearing the date', () => {
    const mockField = setupTest('2024-12-07T00:00:00.000Z');
    render(<DateInput type="date" name="testDate" label="Test Date" />);

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(mockField.onChange).toHaveBeenCalledWith('testDate', null);
  });

  it('should keep consistent date value after multiple selections', () => {
    const mockField = setupTest(null);
    render(<DateInput type="date" name="testDate" label="Test Date" />);

    const input = screen.getByRole('combobox');

    // First selection
    fireEvent.change(input, { target: { value: '12/07/2024' } });
    fireEvent.blur(input);

    // Second selection
    fireEvent.change(input, { target: { value: '12/08/2024' } });
    fireEvent.blur(input);

    // Check final value
    const lastCall = mockField.onChange.mock.lastCall;
    expect(lastCall).toEqual(['testDate', '2024-12-08T00:00:00.000Z']);
  });

  it('should revert to last valid date on blur if current value is invalid', () => {
    // Start with a valid date
    const mockField = setupTest('2024-12-07T00:00:00.000Z');
    render(<DateInput type="date" name="testDate" label="Test Date" />);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'invalid-date' } });
    fireEvent.blur(input);
    expect(mockField.onChange).toHaveBeenCalledWith('testDate', '2024-12-07T00:00:00.000Z');
  });
});
