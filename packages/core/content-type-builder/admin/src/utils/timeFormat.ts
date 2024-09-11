type TimeChangeHandler = (params: {
  target: { name: string; value: string | undefined; type: string };
}) => void;

type TimeChangeParams = {
  value?: string;
  onChange: TimeChangeHandler;
  name: string;
  type: string;
};

// The backend sends a value which has the following format: '00:45:00.000'
// but the time picker only supports hours & minutes so we need to mutate the value
const removeSeconds = (time: string): string => {
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
};

// we need to send back the value with the same '00:45:00.000' format
const addSecondsAndMilliseconds = (time: string): string => {
  return time.split(':').length === 2 ? `${time}:00.000` : time;
};

const formatTimeForInput = (value?: string): string | undefined => {
  if (!value) return;
  return value.split(':').length > 2 ? removeSeconds(value) : value;
};

const formatTimeForOutput = (value?: string): string | undefined => {
  if (!value) return undefined;
  return addSecondsAndMilliseconds(value);
};

export const handleTimeChange = ({ value }: TimeChangeParams): string | undefined => {
  const formattedInputTime = formatTimeForInput(value);

  return formattedInputTime;
};

export const handleTimeChangeEvent = (
  onChange: TimeChangeHandler,
  name: string,
  type: string,
  time?: string
): void => {
  const formattedOutputTime = formatTimeForOutput(time);

  onChange({
    target: {
      name,
      value: formattedOutputTime,
      type,
    },
  });
};
