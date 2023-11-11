import React from 'react';
import PropTypes from 'prop-types';

const TimePointSummary = ({ timepoint, modality, description }) => {
  return (
    <div className="p-2">
      <div className="leading-none">
        <span className="mr-2 text-lg font-bold text-white">{'正在标注: ' + timepoint}</span>
        <span className="bg-common-bright rounded-sm px-1 text-base font-bold text-black">
          {modality}
        </span>
      </div>
      <div className="text-primary-light ellipse truncate pt-2 text-base leading-none">
        {description || ''}
      </div>
    </div>
  );
};

// TimePointSummary.propTypes = {
//   timepoint: PropTypes.string.isRequired,
//   modality: PropTypes.string,
//   description: PropTypes.string,
// };

export default TimePointSummary;
