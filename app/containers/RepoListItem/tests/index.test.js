/**
 * Test the repo list item
 */

import expect from 'expect';
import { shallow, mount } from 'enzyme';
import React from 'react';

import { IntlProvider } from 'react-intl';
import { RepoListItem } from '../index';
import ListItem from 'components/ListItem';

describe('<RepoListItem />', () => {
  let item;

  // Before each test reset the item data for safety
  beforeEach(() => {
    item = {
      owner: {
        login: 'mxstbr',
      },
      html_url: 'https://github.com/mxstbr/react-boilerplate',
      name: 'react-boilerplate',
      open_issues_count: 20,
      full_name: 'mxstbr/react-boilerplate',
    };
  });

  it('should render a ListItem', () => {
    const renderedComponent = shallow(
      <RepoListItem item={item} />
    );
    expect(renderedComponent.find(ListItem).length).toEqual(1);
  });

  it('should not render the current username', () => {
    const renderedComponent = mount(
      <IntlProvider locale="en">
        <RepoListItem item={item} currentUser={item.owner.login} />
      </IntlProvider>
    );
    expect(renderedComponent.text().indexOf(item.owner.login)).toBeLessThan(0);
  });

  it('should render usernames that are not the current one', () => {
    const renderedComponent = mount(
      <IntlProvider locale="en">
        <RepoListItem item={item} currentUser="nikgraf" />
      </IntlProvider>
    );
    expect(renderedComponent.text().indexOf(item.owner.login)).toBeGreaterThan(-1);
  });

  it('should render the repo name', () => {
    const renderedComponent = mount(
      <IntlProvider locale="en">
        <RepoListItem item={item} />
      </IntlProvider>
    );
    expect(renderedComponent.text().indexOf(item.name)).toBeGreaterThan(-1);
  });

  it('should render the issue count', () => {
    const renderedComponent = mount(
      <IntlProvider locale="en">
        <RepoListItem item={item} />
      </IntlProvider>
    );
    expect(renderedComponent.text().indexOf(item.open_issues_count)).toBeGreaterThan(1);
  });

  it('should render the IssueIcon', () => {
    const renderedComponent = mount(
      <IntlProvider locale="en">
        <RepoListItem item={item} />
      </IntlProvider>
    );
    expect(renderedComponent.find('svg').length).toEqual(1);
  });
});
