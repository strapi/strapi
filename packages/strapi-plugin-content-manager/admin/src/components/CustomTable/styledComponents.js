import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const Table = styled.table`
  border-radius: 3px;
  border-collapse: initial;
  box-shadow: 0 2px 4px #e3e9f3;
  table-layout: fixed;
  margin-bottom: 0;

  tr,
  th,
  td {
    border: none;
    padding: 0;
  }

  th,
  td {
    padding: 0 25px;

    label {
      display: inline;
    }
  }
`;

const TableEmpty = styled.tr`
  width: 100%;
  height: 108px;
  background: #ffffff;

  td {
    height: 106px;
    line-height: 90px;
    font-size: 1.3rem;
    font-weight: 400;
    color: #333740;
    text-align: center;
    border-collapse: collapse;
    border-top: 1px solid #f1f1f2 !important;
  }
`;

const TableRow = styled.tr`
  height: 54px;
  background: #ffffff;

  &:hover {
    cursor: pointer;
    background: #f7f8f8;
  }

  td {
    height: 53px;
    font-size: 1.3rem;
    line-height: 1.8rem;
    font-weight: 400;
    color: #333740;
    vertical-align: middle;
    border-collapse: collapse;
    border-top: 1px solid #f1f1f2 !important;
  }
`;

const LoadingContainer = styled.div`
  display: block;
  margin: auto;
`;

const LoadingWrapper = styled.div`
  width: 100%;
  height: 108px;
  display: flex;
  background: ${props => props.theme.main.colors.white};
  box-shadow: 0 2px 4px ${props => props.theme.main.colors.darkGrey};
  clip-path: inset(0px -5px -5px -5px);
`;

LoadingWrapper.propTypes = {
  ...themePropTypes,
};

export { LoadingContainer, LoadingWrapper, Table, TableEmpty, TableRow };
