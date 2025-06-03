import { handleTimeChange, handleTimeChangeEvent } from '../timeFormat';

describe('Time Logic', () => {
  describe('handleTimeChange', () => {
    it('should remove seconds from time string', () => {
      const result = handleTimeChange({
        value: '14:30:45.000',
        onChange: jest.fn(),
        name: 'timeField',
        type: 'time',
      });
      expect(result).toBe('14:30');
    });

    it('should not modify time string without seconds', () => {
      const result = handleTimeChange({
        value: '14:30',
        onChange: jest.fn(),
        name: 'timeField',
        type: 'time',
      });
      expect(result).toBe('14:30');
    });

    it('should return undefined for undefined input', () => {
      const result = handleTimeChange({
        value: undefined,
        onChange: jest.fn(),
        name: 'timeField',
        type: 'time',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('handleTimeChangeEvent', () => {
    it('should add seconds and milliseconds to time string', () => {
      const onChange = jest.fn();
      handleTimeChangeEvent(onChange, 'timeField', 'time', '14:30');
      expect(onChange).toHaveBeenCalledWith({
        target: { name: 'timeField', value: '14:30:00.000', type: 'time' },
      });
    });

    it('should not modify time string with seconds and milliseconds', () => {
      const onChange = jest.fn();
      handleTimeChangeEvent(onChange, 'timeField', 'time', '14:30:00.000');
      expect(onChange).toHaveBeenCalledWith({
        target: { name: 'timeField', value: '14:30:00.000', type: 'time' },
      });
    });

    it('should handle undefined input', () => {
      const onChange = jest.fn();
      handleTimeChangeEvent(onChange, 'timeField', 'time', undefined);
      expect(onChange).toHaveBeenCalledWith({
        target: { name: 'timeField', value: undefined, type: 'time' },
      });
    });
  });
});
