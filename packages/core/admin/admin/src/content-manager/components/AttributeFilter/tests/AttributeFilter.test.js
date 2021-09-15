// import React from 'react';
// import { render, fireEvent } from '@testing-library/react';
// import { BrowserRouter } from 'react-router-dom';
// import AttributeFilter from '..';
// import addressCt from '../../../../../../../../admin-test-utils/lib/fixtures/collectionTypes/address';
// import addressMetaData from '../../../../../../../../admin-test-utils/lib/fixtures/metaData/address';

// class MockDate extends Date {
//   constructor() {
//     super(1992, 5, 21);
//   }
// }

// jest.mock('react-intl', () => ({
//   // eslint-disable-next-line react/prop-types
//   FormattedMessage: ({ id }) => <option value={id}>{id}</option>,
// }));

// jest.mock('@strapi/helper-plugin', () => ({
//   ...jest.requireActual('@strapi/helper-plugin'),
//   useRBACProvider: () => ({
//     allPermissions: [
//       {
//         id: 198,
//         action: 'plugin::content-manager.explorer.create',
//         subject: 'api::address.address',
//         properties: {
//           fields: [
//             'postal_coder',
//             'categories',
//             'cover',
//             'images',
//             'city',
//             'likes',
//             'json',
//             'slug',
//             'notrepeat_req.name',
//             'repeat_req.name',
//             'repeat_req_min.name',
//           ],
//           locales: ['en'],
//         },
//         conditions: [],
//       },
//       {
//         id: 199,
//         action: 'plugin::content-manager.explorer.read',
//         subject: 'api::address.address',
//         properties: {
//           fields: [
//             'postal_coder',
//             'categories',
//             'cover',
//             'images',
//             'city',
//             'likes',
//             'json',
//             'slug',
//             'notrepeat_req.name',
//             'repeat_req.name',
//             'repeat_req_min.name',
//           ],
//           locales: ['en'],
//         },
//         conditions: [],
//       },
//       {
//         id: 200,
//         action: 'plugin::content-manager.explorer.update',
//         subject: 'api::address.address',
//         properties: {
//           fields: [
//             'postal_coder',
//             'categories',
//             'cover',
//             'images',
//             'city',
//             'likes',
//             'json',
//             'slug',
//             'notrepeat_req.name',
//             'repeat_req.name',
//             'repeat_req_min.name',
//           ],
//           locales: ['en'],
//         },
//         conditions: [],
//       },
//       {
//         id: 258,
//         action: 'plugin::content-manager.explorer.delete',
//         subject: 'api::address.address',
//         properties: { locales: ['en'] },
//         conditions: [],
//       },
//       {
//         id: 269,
//         action: 'plugin::content-manager.explorer.publish',
//         subject: 'api::address.address',
//         properties: { locales: ['en'] },
//         conditions: [],
//       },
//     ],
//   }),
// }));

// const renderComponent = () =>
//   render(
//     <BrowserRouter>
//       <AttributeFilter
//         contentType={addressCt}
//         metaData={addressMetaData}
//         slug="api::address.address"
//       />
//     </BrowserRouter>
//   );

// describe('AttributeFilter', () => {
//   let realDate;

//   beforeEach(() => {
//     realDate = global.Date;
//     global.Date = MockDate;
//   });

//   afterEach(() => {
//     global.Date = realDate;
//   });

//   it('snapshots the filter dropdown with a set of valid fields', () => {
//     const { container } = renderComponent();

//     expect(container.querySelector('#ct-filter')).toMatchInlineSnapshot(`
//       .c0 {
//         width: 100%;
//         height: 3.4rem;
//         padding: 0 1rem;
//         font-weight: 400;
//         font-size: 1.3rem;
//         cursor: pointer;
//         outline: 0;
//         border: 1px solid #E3E9F3;
//         border-radius: 2px;
//         color: #333740;
//         background-color: #ffffff;
//         padding-right: 30px;
//         -webkit-appearance: none;
//         -moz-appearance: none;
//         appearance: none;
//         -webkit-appearance: none;
//         -moz-appearance: none;
//         background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjMiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNLjAxOCAwaDIwYTIgMiAwIDAgMSAyIDJ2MjhhMiAyIDAgMCAxLTIgMmgtMjBWMHoiIGZpbGw9IiNGQUZBRkIiLz48ZyBmaWxsLXJ1bGU9Im5vbnplcm8iIGZpbGw9IiNCM0I1QjkiPjxwYXRoIGQ9Ik0xNC4wMTggMTguMzc1YS4zNi4zNiAwIDAgMS0uMTEyLjI2NGwtMi42MjUgMi42MjVhLjM2LjM2IDAgMCAxLS4yNjMuMTExLjM2LjM2IDAgMCAxLS4yNjQtLjExMWwtMi42MjUtMi42MjVhLjM2LjM2IDAgMCAxLS4xMTEtLjI2NC4zNi4zNiAwIDAgMSAuMTExLS4yNjQuMzYuMzYgMCAwIDEgLjI2NC0uMTExaDUuMjVhLjM2LjM2IDAgMCAxIC4yNjMuMTExLjM2LjM2IDAgMCAxIC4xMTIuMjY0ek04LjAxOCAxNWEuMzYuMzYgMCAwIDEgLjExMS0uMjY0bDIuNjI1LTIuNjI1YS4zNi4zNiAwIDAgMSAuMjY0LS4xMTEuMzYuMzYgMCAwIDEgLjI2My4xMTFsMi42MjUgMi42MjVhLjM2LjM2IDAgMCAxIC4xMTIuMjY0LjM2LjM2IDAgMCAxLS4xMTIuMjY0LjM2LjM2IDAgMCAxLS4yNjMuMTExaC01LjI1YS4zNi4zNiAwIDAgMS0uMjY0LS4xMTEuMzYuMzYgMCAwIDEtLjExMS0uMjY0eiIvPjwvZz48L2c+PC9zdmc+Cg==);
//         background-repeat: no-repeat;
//         background-position: right;
//       }

//       .c0::-webkit-input-placeholder {
//         color: #919BAE;
//       }

//       .c0:focus {
//         border-color: #78caff;
//       }

//       .c0:disabled {
//         background-color: #FAFAFB;
//         cursor: not-allowed;
//         color: #9ea7b8;
//         opacity: 1;
//       }

//       <select
//         autocomplete="off"
//         class="c0"
//         id="ct-filter"
//         name="ct-filter"
//         tabindex="0"
//       >
//         <option
//           value="categories"
//         >
//           categories
//         </option>
//         <option
//           value="city"
//         >
//           city
//         </option>
//         <option
//           value="created_at"
//         >
//           created_at
//         </option>
//         <option
//           value="id"
//         >
//           id
//         </option>
//         <option
//           value="likes"
//         >
//           likes
//         </option>
//         <option
//           value="postal_coder"
//         >
//           postal_coder
//         </option>
//         <option
//           value="slug"
//         >
//           slug
//         </option>
//         <option
//           value="updated_at"
//         >
//           updated_at
//         </option>
//       </select>
//     `);
//   });

//   it('snapshots the comparator dropdown with a set of valid comparator for the type', () => {
//     const { container } = renderComponent();

//     expect(container.querySelector('#comparator')).toMatchInlineSnapshot(`
//       .c0 {
//         width: 100%;
//         height: 3.4rem;
//         padding: 0 1rem;
//         font-weight: 400;
//         font-size: 1.3rem;
//         cursor: pointer;
//         outline: 0;
//         border: 1px solid #E3E9F3;
//         border-radius: 2px;
//         color: #333740;
//         background-color: #ffffff;
//         padding-right: 30px;
//         -webkit-appearance: none;
//         -moz-appearance: none;
//         appearance: none;
//         -webkit-appearance: none;
//         -moz-appearance: none;
//         background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjMiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNLjAxOCAwaDIwYTIgMiAwIDAgMSAyIDJ2MjhhMiAyIDAgMCAxLTIgMmgtMjBWMHoiIGZpbGw9IiNGQUZBRkIiLz48ZyBmaWxsLXJ1bGU9Im5vbnplcm8iIGZpbGw9IiNCM0I1QjkiPjxwYXRoIGQ9Ik0xNC4wMTggMTguMzc1YS4zNi4zNiAwIDAgMS0uMTEyLjI2NGwtMi42MjUgMi42MjVhLjM2LjM2IDAgMCAxLS4yNjMuMTExLjM2LjM2IDAgMCAxLS4yNjQtLjExMWwtMi42MjUtMi42MjVhLjM2LjM2IDAgMCAxLS4xMTEtLjI2NC4zNi4zNiAwIDAgMSAuMTExLS4yNjQuMzYuMzYgMCAwIDEgLjI2NC0uMTExaDUuMjVhLjM2LjM2IDAgMCAxIC4yNjMuMTExLjM2LjM2IDAgMCAxIC4xMTIuMjY0ek04LjAxOCAxNWEuMzYuMzYgMCAwIDEgLjExMS0uMjY0bDIuNjI1LTIuNjI1YS4zNi4zNiAwIDAgMSAuMjY0LS4xMTEuMzYuMzYgMCAwIDEgLjI2My4xMTFsMi42MjUgMi42MjVhLjM2LjM2IDAgMCAxIC4xMTIuMjY0LjM2LjM2IDAgMCAxLS4xMTIuMjY0LjM2LjM2IDAgMCAxLS4yNjMuMTExaC01LjI1YS4zNi4zNiAwIDAgMS0uMjY0LS4xMTEuMzYuMzYgMCAwIDEtLjExMS0uMjY0eiIvPjwvZz48L2c+PC9zdmc+Cg==);
//         background-repeat: no-repeat;
//         background-position: right;
//       }

//       .c0::-webkit-input-placeholder {
//         color: #919BAE;
//       }

//       .c0:focus {
//         border-color: #78caff;
//       }

//       .c0:disabled {
//         background-color: #FAFAFB;
//         cursor: not-allowed;
//         color: #9ea7b8;
//         opacity: 1;
//       }

//       <select
//         autocomplete="off"
//         class="c0"
//         id="comparator"
//         name="comparator"
//         tabindex="0"
//       >
//         <option
//           value="components.FilterOptions.FILTER_TYPES.="
//         >
//           components.FilterOptions.FILTER_TYPES.=
//         </option>
//         <option
//           value="components.FilterOptions.FILTER_TYPES._ne"
//         >
//           components.FilterOptions.FILTER_TYPES._ne
//         </option>
//         <option
//           value="components.FilterOptions.FILTER_TYPES._lt"
//         >
//           components.FilterOptions.FILTER_TYPES._lt
//         </option>
//         <option
//           value="components.FilterOptions.FILTER_TYPES._lte"
//         >
//           components.FilterOptions.FILTER_TYPES._lte
//         </option>
//         <option
//           value="components.FilterOptions.FILTER_TYPES._gt"
//         >
//           components.FilterOptions.FILTER_TYPES._gt
//         </option>
//         <option
//           value="components.FilterOptions.FILTER_TYPES._gte"
//         >
//           components.FilterOptions.FILTER_TYPES._gte
//         </option>
//         <option
//           value="components.FilterOptions.FILTER_TYPES._contains"
//         >
//           components.FilterOptions.FILTER_TYPES._contains
//         </option>
//         <option
//           value="components.FilterOptions.FILTER_TYPES._containss"
//         >
//           components.FilterOptions.FILTER_TYPES._containss
//         </option>
//       </select>
//     `);
//   });

//   it('changes the input component when selecting an attribute with a different type', () => {
//     const { container } = renderComponent();

//     fireEvent.change(container.querySelector('#ct-filter'), { target: { value: 'updated_at' } });

//     expect(container.querySelector('#date')).toMatchInlineSnapshot(`
//       .c0 {
//         width: 100%;
//         height: 3.4rem;
//         padding: 0 1rem;
//         font-weight: 400;
//         font-size: 1.3rem;
//         cursor: text;
//         outline: 0;
//         border: 1px solid #E3E9F3;
//         border-radius: 2px;
//         color: #333740;
//         background-color: transparent;
//         padding-left: calc(3.4rem + 1rem);
//       }

//       .c0::-webkit-input-placeholder {
//         color: #919BAE;
//       }

//       .c0:focus {
//         border-color: #78caff;
//       }

//       .c0:disabled {
//         background-color: #FAFAFB;
//         cursor: not-allowed;
//         color: #9ea7b8;
//       }

//       <input
//         autocomplete="off"
//         class="c0"
//         id="date"
//         name="start_date"
//         tabindex="0"
//         type="text"
//         value="June 21, 1992"
//       />
//     `);
//   });

//   it('pushes the query in the URl when validating the filter form using the "equal comparator"', () => {
//     const { container } = renderComponent();

//     fireEvent.change(container.querySelector('#input'), { target: { value: 'hello world' } });
//     fireEvent.click(container.querySelector('[type="submit"]'));

//     expect(window.location.href).toBe(
//       'http://localhost:4000/admin?_where[0][categories.name]=hello%20world&page=1'
//     );
//   });

//   it('pushes the query in the URl when validating the filter form using the "not equal comparator"', () => {
//     const { container } = renderComponent();

//     fireEvent.change(container.querySelector('#comparator'), {
//       target: { value: 'components.FilterOptions.FILTER_TYPES._ne' },
//     });

//     fireEvent.change(container.querySelector('#input'), { target: { value: 'hello world' } });
//     fireEvent.click(container.querySelector('[type="submit"]'));

//     expect(window.location.href).toBe(
//       'http://localhost:4000/admin?_where[0][categories.name]=hello%20world&_where[1][categories.namecomponents.FilterOptions.FILTER_TYPES._ne]=hello%20world&page=1'
//     );
//   });
// });

test.todo('test filters');
