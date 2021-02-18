import React from 'react';
import { shallow } from 'enzyme';
import getComponents from '../getComponents';

describe('Content Type Builder | utils | getComponents', () => {
  it('should not crash', () => {
    getComponents('', {}, '', '', '', jest.fn());
  });

  it('should return the correct components', () => {
    const TestCompo1 = () => <div>TestCompo1</div>;
    const TestCompo2 = () => <div>TestCompo2</div>;

    const plugins = {
      test: {
        injectedComponents: [
          {
            plugin: 'content-type-builder.listView',
            area: 'list.link',
            component: TestCompo1,
            key: 'test.TestCompo1',
            props: {
              someProps: { test: 'test' },
              icon: 'fa-cog',
            },
          },
          {
            plugin: 'not.target.testContainer',
            area: 'right.links',
            component: TestCompo2,
            key: 'test.TestCompo2',
            props: {
              someProps: { test: 'test' },
              icon: 'fa-cog',
            },
          },
        ],
      },
    };

    const container = shallow(
      <div>
        {getComponents('listView', 'list.link', plugins, 'test', 'test', 'test', jest.fn())}
      </div>
    );

    expect(
      getComponents('listView', 'list.link', plugins, 'test', 'test', 'test', jest.fn())
    ).toHaveLength(1);

    expect(container.find(TestCompo1)).toHaveLength(1);
    expect(container.find(TestCompo2)).toHaveLength(0);
  });
});
