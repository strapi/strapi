// import React from 'react';
// import { render } from '@testing-library/react';
// import { IntlProvider } from 'react-intl';
// import { Router } from 'react-router-dom';
// import { createMemoryHistory } from 'history';
// import { useQueryParams } from '@strapi/helper-plugin';
// import Theme from '../../../../../../../components/Theme';
// import DynamicTable from '../index';

// jest.mock('@strapi/helper-plugin', () => ({
//   ...jest.requireActual('@strapi/helper-plugin'),
//   useQueryParams: jest.fn(() => [{ query: {} }, jest.fn()]),
// }));

// // eslint-disable-next-line react/prop-types
// const makeApp = ({
//   canDelete = true,
//   canUpdate = true,
//   headers,
//   rows = [],
//   withBulkActions = true,
//   withMainAction = true,
// }) => (
//   <IntlProvider messages={{ en: {} }} textComponent="span" locale="en">
//     <Theme>
//       <Router history={createMemoryHistory()}>
//         <DynamicTable
//           canDelete={canDelete}
//           canUpdate={canUpdate}
//           rows={rows}
//           headers={headers}
//           withBulkActions={withBulkActions}
//           withMainAction={withMainAction}
//         />
//       </Router>
//     </Theme>
//   </IntlProvider>
// );

// describe('DynamicTable', () => {
//   it('renders and matches the snapshot', () => {
//     const headers = [
//       {
//         name: 'firstname',
//         key: 'firstname',
//         metadatas: { label: 'Name', sortable: true },
//       },
//       {
//         key: 'email',
//         name: 'email',
//         metadatas: { label: 'Email', sortable: true },
//       },
//     ];
//     const app = makeApp({ headers });
//     const { container, getByText } = render(app);

//     expect(container.firstChild).toMatchInlineSnapshot(`
//       .c12 {
//         font-weight: 400;
//         font-size: 0.875rem;
//         line-height: 1.43;
//         color: #32324d;
//       }

//       .c13 {
//         font-weight: 600;
//         line-height: 1.14;
//       }

//       .c14 {
//         font-weight: 600;
//         font-size: 0.6875rem;
//         line-height: 1.45;
//         text-transform: uppercase;
//       }

//       .c0 {
//         box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
//       }

//       .c1 {
//         background: #ffffff;
//       }

//       .c3 {
//         padding-right: 24px;
//         padding-left: 24px;
//       }

//       .c9 {
//         display: -webkit-box;
//         display: -webkit-flex;
//         display: -ms-flexbox;
//         display: flex;
//         -webkit-flex-direction: row;
//         -ms-flex-direction: row;
//         flex-direction: row;
//         -webkit-align-items: center;
//         -webkit-box-align: center;
//         -ms-flex-align: center;
//         align-items: center;
//       }

//       .c10 {
//         margin: 0;
//         height: 18px;
//         min-width: 18px;
//         border-radius: 4px;
//         border: 1px solid #c0c0cf;
//         -webkit-appearance: none;
//         background-color: #ffffff;
//       }

//       .c10:checked {
//         background-color: #4945ff;
//         border: 1px solid #4945ff;
//       }

//       .c10:checked:after {
//         content: '';
//         display: block;
//         position: relative;
//         background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSJ3aGl0ZSIKICAvPgo8L3N2Zz4=) no-repeat no-repeat center center;
//         width: 10px;
//         height: 10px;
//         left: 50%;
//         top: 50%;
//         -webkit-transform: translateX(-50%) translateY(-50%);
//         -ms-transform: translateX(-50%) translateY(-50%);
//         transform: translateX(-50%) translateY(-50%);
//       }

//       .c10:checked:disabled:after {
//         background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEwIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHBhdGgKICAgIGQ9Ik04LjU1MzIzIDAuMzk2OTczQzguNjMxMzUgMC4zMTYzNTUgOC43NjA1MSAwLjMxNTgxMSA4LjgzOTMxIDAuMzk1NzY4TDkuODYyNTYgMS40MzQwN0M5LjkzODkzIDEuNTExNTcgOS45MzkzNSAxLjYzNTkgOS44NjM0OSAxLjcxMzlMNC4wNjQwMSA3LjY3NzI0QzMuOTg1OSA3Ljc1NzU1IDMuODU3MDcgNy43NTgwNSAzLjc3ODM0IDcuNjc4MzRMMC4xMzg2NiAzLjk5MzMzQzAuMDYxNzc5OCAzLjkxNTQ5IDAuMDYxNzEwMiAzLjc5MDMyIDAuMTM4NTA0IDMuNzEyNEwxLjE2MjEzIDIuNjczNzJDMS4yNDAzOCAyLjU5NDMyIDEuMzY4NDMgMi41OTQyMiAxLjQ0NjggMi42NzM0OEwzLjkyMTc0IDUuMTc2NDdMOC41NTMyMyAwLjM5Njk3M1oiCiAgICBmaWxsPSIjOEU4RUE5IgogIC8+Cjwvc3ZnPg==) no-repeat no-repeat center center;
//       }

//       .c10:disabled {
//         background-color: #dcdce4;
//         border: 1px solid #c0c0cf;
//       }

//       .c10:indeterminate {
//         background-color: #4945ff;
//         border: 1px solid #4945ff;
//       }

//       .c10:indeterminate:after {
//         content: '';
//         display: block;
//         position: relative;
//         color: white;
//         height: 2px;
//         width: 10px;
//         background-color: #ffffff;
//         left: 50%;
//         top: 50%;
//         -webkit-transform: translateX(-50%) translateY(-50%);
//         -ms-transform: translateX(-50%) translateY(-50%);
//         transform: translateX(-50%) translateY(-50%);
//       }

//       .c10:indeterminate:disabled {
//         background-color: #dcdce4;
//         border: 1px solid #c0c0cf;
//       }

//       .c10:indeterminate:disabled:after {
//         background-color: #8e8ea9;
//       }

//       .c15 {
//         border: 0;
//         -webkit-clip: rect(0 0 0 0);
//         clip: rect(0 0 0 0);
//         height: 1px;
//         margin: -1px;
//         overflow: hidden;
//         padding: 0;
//         position: absolute;
//         width: 1px;
//       }

//       .c5 {
//         width: 100%;
//         white-space: nowrap;
//       }

//       .c2 {
//         position: relative;
//         border-radius: 4px 4px 0 0;
//       }

//       .c2:before {
//         background: linear-gradient(90deg,#000000 0%,rgba(0,0,0,0) 100%);
//         opacity: 0.2;
//         position: absolute;
//         height: 100%;
//         box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
//         width: 8px;
//         left: 0;
//       }

//       .c2:after {
//         background: linear-gradient(270deg,#000000 0%,rgba(0,0,0,0) 100%);
//         opacity: 0.2;
//         position: absolute;
//         height: 100%;
//         box-shadow: 0px 1px 4px rgba(33,33,52,0.1);
//         width: 8px;
//         right: 0;
//         top: 0;
//       }

//       .c4 {
//         overflow-x: auto;
//       }

//       .c6 {
//         border-bottom: 1px solid #eaeaef;
//       }

//       .c7 {
//         border-bottom: 1px solid #eaeaef;
//       }

//       .c7 td,
//       .c7 th {
//         padding: 16px;
//       }

//       .c7 td:first-of-type,
//       .c7 th:first-of-type {
//         padding: 0 4px;
//       }

//       .c8 {
//         vertical-align: middle;
//         text-align: left;
//         color: #666687;
//         outline-offset: -4px;
//       }

//       .c8 input {
//         vertical-align: sub;
//       }

//       .c11 svg {
//         height: 0.25rem;
//       }

//       .c24 {
//         font-weight: 500;
//         font-size: 1rem;
//         line-height: 1.25;
//         color: #666687;
//       }

//       .c19 {
//         background: #ffffff;
//         padding: 64px;
//       }

//       .c21 {
//         padding-bottom: 24px;
//       }

//       .c23 {
//         padding-bottom: 16px;
//       }

//       .c20 {
//         display: -webkit-box;
//         display: -webkit-flex;
//         display: -ms-flexbox;
//         display: flex;
//         -webkit-flex-direction: column;
//         -ms-flex-direction: column;
//         flex-direction: column;
//         -webkit-align-items: center;
//         -webkit-box-align: center;
//         -ms-flex-align: center;
//         align-items: center;
//         text-align: center;
//       }

//       .c22 svg {
//         height: 5.5rem;
//       }

//       .c16 tr:last-of-type {
//         border-bottom: none;
//       }

//       .c17 {
//         border-bottom: 1px solid #eaeaef;
//       }

//       .c17 td,
//       .c17 th {
//         padding: 16px;
//       }

//       .c17 td:first-of-type,
//       .c17 th:first-of-type {
//         padding: 0 4px;
//       }

//       .c18 {
//         vertical-align: middle;
//         text-align: left;
//         color: #666687;
//         outline-offset: -4px;
//       }

//       .c18 input {
//         vertical-align: sub;
//       }

//       <div
//         class="c0"
//       >
//         <div
//           class="c1 c2"
//         >
//           <div
//             class="c3 c4"
//           >
//             <table
//               aria-colcount="4"
//               aria-rowcount="1"
//               class="c5"
//             >
//               <thead
//                 class="c6"
//               >
//                 <tr
//                   aria-rowindex="1"
//                   class="c7"
//                 >
//                   <th
//                     aria-colindex="1"
//                     class="c8"
//                   >
//                     <div
//                       class="c9"
//                     >
//                       <input
//                         aria-label="Select all entries"
//                         class="c10"
//                         tabindex="0"
//                         type="checkbox"
//                       />
//                       <span
//                         class="c11"
//                       />
//                     </div>
//                   </th>
//                   <th
//                     aria-colindex="2"
//                     class="c8"
//                   >
//                     <div
//                       class="c9"
//                     >
//                       <span>
//                         <button
//                           aria-labelledby="tooltip-1"
//                           class="c12 c13 c14"
//                           label="Name"
//                           tabindex="-1"
//                         >
//                           Name
//                         </button>
//                       </span>
//                       <span
//                         class="c11"
//                       />
//                     </div>
//                   </th>
//                   <th
//                     aria-colindex="3"
//                     class="c8"
//                   >
//                     <div
//                       class="c9"
//                     >
//                       <span>
//                         <button
//                           aria-labelledby="tooltip-3"
//                           class="c12 c13 c14"
//                           label="Email"
//                           tabindex="-1"
//                         >
//                           Email
//                         </button>
//                       </span>
//                       <span
//                         class="c11"
//                       />
//                     </div>
//                   </th>
//                   <th
//                     aria-colindex="4"
//                     class="c8"
//                     tabindex="-1"
//                   >
//                     <div
//                       class="c9"
//                     >
//                       <div
//                         class="c15"
//                       >
//                         Actions
//                       </div>
//                       <span
//                         class="c11"
//                       />
//                     </div>
//                   </th>
//                 </tr>
//               </thead>
//               <tbody
//                 class="c16"
//               >
//                 <tr
//                   aria-rowindex="2"
//                   class="c17"
//                 >
//                   <td
//                     aria-colindex="1"
//                     class="c18"
//                     colspan="4"
//                     tabindex="-1"
//                   >
//                     <div
//                       class="c19 c20"
//                     >
//                       <div
//                         aria-hidden="true"
//                         class="c21 c22"
//                       >
//                         <svg
//                           fill="none"
//                           height="1em"
//                           viewBox="0 0 216 120"
//                           width="10rem"
//                           xmlns="http://www.w3.org/2000/svg"
//                         >
//                           <path
//                             clip-rule="evenodd"
//                             d="M184 23.75a7 7 0 110 14h-40a7 7 0 110 14h22a7 7 0 110 14h-10.174c-4.874 0-8.826 3.134-8.826 7 0 2.577 2 4.91 6 7a7 7 0 110 14H70a7 7 0 110-14H31a7 7 0 110-14h40a7 7 0 100-14H46a7 7 0 110-14h40a7 7 0 110-14h98zm0 28a7 7 0 110 14 7 7 0 010-14z"
//                             fill="#DBDBFA"
//                             fill-rule="evenodd"
//                           />
//                           <path
//                             clip-rule="evenodd"
//                             d="M130.672 22.75l9.302 67.843.835 6.806a4 4 0 01-3.482 4.458l-58.56 7.19a4 4 0 01-4.458-3.483l-9.016-73.427a2 2 0 011.741-2.229l.021-.002 4.859-.545 58.758-6.61zm-54.83 6.17l4.587-.515-4.587.515z"
//                             fill="#fff"
//                             fill-rule="evenodd"
//                           />
//                           <path
//                             d="M75.842 28.92l4.587-.515m50.243-5.655l9.302 67.843.835 6.806a4 4 0 01-3.482 4.458l-58.56 7.19a4 4 0 01-4.458-3.483l-9.016-73.427a2 2 0 011.741-2.229l.021-.002 4.859-.545 58.758-6.61z"
//                             stroke="#7E7BF6"
//                             stroke-width="2.5"
//                           />
//                           <path
//                             clip-rule="evenodd"
//                             d="M128.14 27.02l8.42 61.483.757 6.168c.244 1.987-1.15 3.793-3.113 4.035l-52.443 6.439c-1.963.241-3.753-1.175-3.997-3.162l-8.15-66.376a2 2 0 011.742-2.23l6.487-.796"
//                             fill="#F0F0FF"
//                             fill-rule="evenodd"
//                           />
//                           <path
//                             clip-rule="evenodd"
//                             d="M133.229 10H87.672c-.76 0-1.447.308-1.945.806a2.741 2.741 0 00-.805 1.944v76c0 .76.308 1.447.805 1.945a2.741 2.741 0 001.945.805h59a2.74 2.74 0 001.944-.805 2.74 2.74 0 00.806-1.945V26.185c0-.73-.29-1.43-.806-1.945l-13.443-13.435a2.75 2.75 0 00-1.944-.805z"
//                             fill="#fff"
//                             fill-rule="evenodd"
//                             stroke="#7F7CFA"
//                             stroke-width="2.5"
//                           />
//                           <path
//                             d="M133.672 11.153V22.75a3 3 0 003 3h7.933"
//                             stroke="#807EFA"
//                             stroke-linecap="round"
//                             stroke-linejoin="round"
//                             stroke-width="2.5"
//                           />
//                           <path
//                             d="M95.672 76.75h26m-26-51h26-26zm0 12h43-43zm0 13h43-43zm0 13h43-43z"
//                             stroke="#817FFA"
//                             stroke-linecap="round"
//                             stroke-linejoin="round"
//                             stroke-width="2.5"
//                           />
//                         </svg>
//                       </div>
//                       <div
//                         class="c23"
//                       >
//                         <p
//                           class="c24"
//                         >
//                           You don't have any content yet...
//                         </p>
//                       </div>
//                     </div>
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     `);

//     expect(getByText("You don't have any content yet...")).toBeInTheDocument();
//   });

//   it('should show the empty state layout with the filter text when there is no content and some filters applied', () => {
//     useQueryParams.mockImplementationOnce(() => [
//       {
//         query: { filters: { $and: [{ firstname: 'soup' }] } },
//       },
//     ]);

//     const headers = [
//       {
//         name: 'firstname',
//         key: 'firstname',
//         metadatas: { label: 'Name', sortable: true },
//       },
//       {
//         key: 'email',
//         name: 'email',
//         metadatas: { label: 'Email', sortable: true },
//       },
//     ];
//     const app = makeApp({ headers });
//     const { getByText } = render(app);

//     expect(getByText('There are no Users with the applied filters...')).toBeInTheDocument();
//   });

//   it('should show the data', () => {
//     const headers = [
//       {
//         name: 'firstname',
//         key: 'firstname',
//         metadatas: { label: 'Name', sortable: true },
//       },
//       {
//         key: 'email',
//         name: 'email',
//         metadatas: { label: 'Email', sortable: true },
//       },
//     ];
//     const rows = [
//       {
//         id: 1,
//         firstname: 'soup',
//       },
//       {
//         id: 2,
//         firstname: 'dummy',
//         email: 'dummy@strapi.io',
//       },
//     ];
//     const app = makeApp({ headers, rows });
//     const { getByText } = render(app);

//     expect(getByText('soup')).toBeInTheDocument();
//     expect(getByText('-')).toBeInTheDocument();
//     expect(getByText('dummy')).toBeInTheDocument();
//     expect(getByText('dummy@strapi.io')).toBeInTheDocument();
//   });
// });

test.todo('renders and matches the snapshot');
