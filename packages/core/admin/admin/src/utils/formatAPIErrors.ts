export const formatAPIErrors = ({ data }: { data: Record<string, string[]> }) => {
  try {
    return Object.keys(data).reduce(
      (acc: Record<string, { id: string; defaultMessage: string }>, current) => {
        const errorMessage = data[current][0];
        acc[current] = {
          id: errorMessage,
          defaultMessage: errorMessage,
        };

        return acc;
      },
      {}
    );
  } catch (err) {
    return {};
  }
};
