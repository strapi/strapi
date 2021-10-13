import React, { useState } from 'react';
import { Tooltip } from '@buffetjs/styles';
import styled from 'styled-components';

const Wrapper = styled.span`
  padding-left: 5px;
  cursor: pointer;
`;

const LabelIconWrapper = ({ children, title }) => {
  const [isOver, setIsOver] = useState(false);

  const handleMouseEvent = () => {
    setIsOver(prev => !prev);
  };

  return (
    <>
      <Wrapper
        data-for="block"
        data-tip={title}
        onMouseEnter={handleMouseEvent}
        onMouseLeave={handleMouseEvent}
      >
        {children}
      </Wrapper>
      {isOver && title && <Tooltip id="block" />}
    </>
  );
};

export default LabelIconWrapper;
