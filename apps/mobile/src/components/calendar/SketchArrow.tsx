/// <reference types="nativewind/types" />

import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface SketchArrowProps {
  direction: 'left' | 'right';
}

const SketchArrow: React.FC<SketchArrowProps> = ({ direction }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path
      d={
        direction === 'left'
          ? 'M15 6l-6 6 6 6'
          : 'M9 6l6 6-6 6'
      }
      stroke="#000"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

export default SketchArrow; 