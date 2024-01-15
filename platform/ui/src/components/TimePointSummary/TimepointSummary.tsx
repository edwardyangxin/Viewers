import React from 'react';
import PropTypes from 'prop-types';

const TimePointSummary = ({ taskInfo, timepoint, modality, description }) => {
  const ifFinished = taskInfo.totalTask === undefined || taskInfo.totalTask === 0;
  return (
    <div className="p-2">
      <div className="leading-none">
        {ifFinished ? (
          <span className="mr-2 text-lg font-bold text-white">{'所有任务已完成'}</span>
        ) : (
          <span className="mr-2 text-lg font-bold text-white">{'总任务: ' + taskInfo.totalTask}</span>
        )}
        {/* <span className="bg-common-bright rounded-sm px-1 text-base font-bold text-black">
          {modality}
        </span> */}
      </div>
      {timepoint && (
        <div className="text-primary-light ellipse truncate pt-2 text-base leading-none">
          {'正在标注: ' + timepoint}
        </div>
      )}
    </div>
  );
};

// TimePointSummary.propTypes = {
//   timepoint: PropTypes.string.isRequired,
//   modality: PropTypes.string,
//   description: PropTypes.string,
// };

export default TimePointSummary;
