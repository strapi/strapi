import styled from 'styled-components';

const Wrapper = styled.div`
  min-height: 5.4rem;
  -webkit-font-smoothing: antialiased;
`;

const Banner = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0 43px 0 28px;
  color: #787e8f;
  cursor: pointer;
  > div:first-child {
    display: flex;
    line-height: 5.3rem;
    width: 100%;
  }
`;

const Chevron = styled.div`
  margin: auto;
  margin-left: auto;
  padding-left: 5px;
  margin-right: 0;
  color: #787e8f;
  font-family: 'FontAwesome';
  font-size: 10px;
`;

const ControllerWrapper = styled.div`
  > div:not(:first-child) {
    padding-top: 2.3rem;
  }
  > div:last-child {
    padding-bottom: 1.8rem;
  }
`;

const Description = styled.div`
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #8b91a0;
  font-size: 12px;
  font-weight: 400;
`;

const Icon = styled.div`
  height: 36px;
  width: 70px;
  min-width: 70px;
  margin: auto 0;
  margin-right: 14px;
  color: #333740;
  border: 1px solid rgba(28, 93, 231, 0.1);
  border-radius: 3px;
  line-height: 36px;
  text-align: center;
`;

const Name = styled.div`
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
  text-transform: uppercase;
  margin: auto 0;
`;

export { Banner, Chevron, ControllerWrapper, Description, Icon, Name, Wrapper };
