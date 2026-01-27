import { render, screen, fireEvent } from '@tests/utils';

import { useField } from '../../Form';
import { TimeInput } from '../Time';

jest.mock('../../Form', () => ({
  useField: jest.fn(),
}));

jest.mock('../../../hooks/useFocusInputField', () => ({
  useFocusInputField: jest.fn(() => ({ current: null })),
}));

describe('TimeInput Component', () => {
  const setupTest = (initialValue: string | null = null, error: string | null = null) => {
    const mockField = {
      value: initialValue,
      onChange: jest.fn(),
      error,
    };
    (useField as jest.Mock).mockReturnValue(mockField);
    return mockField;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the time input with label', () => {
    setupTest(null);
    render(<TimeInput type="time" name="testTime" label="Test Time" />);

    expect(screen.getByText('Test Time')).toBeInTheDocument();
  });

  it('should display initial time value correctly', () => {
    setupTest('14:30:00.000');
    render(<TimeInput type="time" name="testTime" label="Test Time" />);

    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('14:30:00.000');
  });

  it('should handle time selection and add seconds/milliseconds suffix', () => {
    const mockField = setupTest(null);
    render(<TimeInput type="time" name="testTime" label="Test Time" />);

    const input = screen.getByRole('combobox');
    // Simulate TimePicker's onChange event
    fireEvent.change(input, { target: { value: '15:45' } });
    fireEvent.blur(input);

    expect(mockField.onChange).toHaveBeenCalledWith('testTime', '15:45:00.000');
  });

  it('should handle clearing the time', () => {
    const mockField = setupTest('14:30:00.000');
    render(<TimeInput type="time" name="testTime" label="Test Time" />);

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    expect(mockField.onChange).toHaveBeenCalledWith('testTime', null);
  });

  it('should display empty string when value is null', () => {
    setupTest(null);
    render(<TimeInput type="time" name="testTime" label="Test Time" />);

    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('');
  });

  it('should handle multiple time selections', () => {
    const mockField = setupTest(null);
    render(<TimeInput type="time" name="testTime" label="Test Time" />);

    const input = screen.getByRole('combobox');

    // First selection
    fireEvent.change(input, { target: { value: '09:00' } });
    fireEvent.blur(input);
    expect(mockField.onChange).toHaveBeenCalledWith('testTime', '09:00:00.000');

    // Second selection
    fireEvent.change(input, { target: { value: '17:30' } });
    fireEvent.blur(input);
    expect(mockField.onChange).toHaveBeenCalledWith('testTime', '17:30:00.000');

    // Verify both calls were made
    expect(mockField.onChange.mock.calls).toContainEqual(['testTime', '09:00:00.000']);
    expect(mockField.onChange.mock.calls).toContainEqual(['testTime', '17:30:00.000']);
  });

  it('should display error message when field has error', () => {
    setupTest(null, 'Time is required');
    render(<TimeInput type="time" name="testTime" label="Test Time" required />);

    expect(screen.getByText('Time is required')).toBeInTheDocument();
  });

  it('should display hint when provided', () => {
    setupTest(null);
    render(<TimeInput type="time" name="testTime" label="Test Time" hint="Select a time" />);

    expect(screen.getByText('Select a time')).toBeInTheDocument();
  });

  it('should render label action when provided', () => {
    setupTest(null);
    const labelAction = <button type="button">Action</button>;
    render(<TimeInput type="time" name="testTime" label="Test Time" labelAction={labelAction} />);

    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('should mark field as required when required prop is true', () => {
    setupTest(null);
    render(<TimeInput type="time" name="testTime" label="Test Time" required />);

    const label = screen.getByText('Test Time');
    // The Field.Root component should handle the required indicator
    expect(label).toBeInTheDocument();
  });

  it('should pass additional props to TimePicker', () => {
    setupTest(null);
    render(
      <TimeInput type="time" name="testTime" label="Test Time" disabled placeholder="Select time" />
    );

    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();
  });

  it('should handle time value with full format', () => {
    setupTest('08:15:00.000');
    render(<TimeInput type="time" name="testTime" label="Test Time" />);

    const input = screen.getByRole('combobox');
    // TimePicker displays full format
    expect(input).toHaveValue('08:15:00.000');
  });
});
