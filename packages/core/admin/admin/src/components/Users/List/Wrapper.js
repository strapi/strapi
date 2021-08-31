// TODO: this component is used to provide a class to the Table component from buffet in order to reset the style
import styled from 'styled-components';

const Wrapper = styled.div`
  .table-wrapper {
    table {
      table-layout: fixed;
      tbody {
        tr {
          height: ${({ withHigherHeight }) => (withHigherHeight ? '108px' : '54px')};
          border-top: 0;
        }
        td {
          height: ${({ withHigherHeight }) => (withHigherHeight ? '108px' : '53px')};
          line-height: 1.8rem;
          border-collapse: collapse;
          border-top: 1px solid #f1f1f2 !important;
        }
      }
      thead {
        height: 43px;
        tr,
        td {
          height: 43px;
        }
      }
      p {
        margin: 0;
      }
    }
  }
`;

export default Wrapper;
