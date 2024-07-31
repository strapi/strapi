import { Grid, Flex } from '@strapi/design-system';
import { PieChart, Pie as PieRecharts, Cell, Legend } from 'recharts';

import { colors } from '../../../utils/colors';

interface PieProps {
  data: Array<{ name: string; value: number }>;
  col?: number;
  s?: number;
}

export const Pie: React.FC<PieProps> = ({ data, col, s }) => {
  return (
    <Grid.Item col={col || 3} s={s || 6}>
      <Flex
        shadow="tableShadow"
        hasRadius
        padding={6}
        background="neutral0"
        direction="column"
        gap={4}
      >
        <PieChart width={730} height={250}>
          <Legend layout="horizontal" verticalAlign="top" align="center" />
          <PieRecharts
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#4945ff"
            paddingAngle={5}
            label
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </PieRecharts>
        </PieChart>
      </Flex>
    </Grid.Item>
  );
};
