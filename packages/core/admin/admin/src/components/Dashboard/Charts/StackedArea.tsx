import { Grid, Flex } from '@strapi/design-system';
import { Legend, ResponsiveContainer, Area, Tooltip, YAxis, XAxis, AreaChart } from 'recharts';

import { colors } from '../../../utils/colors';

interface StackedAreaProps {
  data: Array<{ [key: string]: string }>; // Adjusted type to allow dynamic keys
  col?: number;
  s?: number;
}

export const StackedArea: React.FC<StackedAreaProps> = ({ data, col, s }) => {
  const keys = data?.length > 0 ? Object.keys(data[0]).filter((key) => key !== 'month') : [];

  return (
    <Grid.Item col={col || 6} s={s || 6}>
      <Flex
        shadow="tableShadow"
        hasRadius
        padding={6}
        background="neutral0"
        direction="column"
        gap={4}
        height="100%"
      >
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />

            {keys.map((key, index) => (
              <Area
                key={`area-${key}`}
                type="monotone"
                stackId="1"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Flex>
    </Grid.Item>
  );
};
