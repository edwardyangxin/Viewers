import React from 'react';
import PropTypes from 'prop-types';

import { targetKeyGroup, nontargetKeyGroup, otherKeyGroup} from '../../utils/mappings';


const TimePointSummary = ({ taskInfo, timepoint, lastTimepointInfo, modality, description }) => {
  const ifFinished = taskInfo.totalTask === undefined || taskInfo.totalTask === 0;
  const reports = lastTimepointInfo?.reports;
  let lastTarget = 0;
  let lastNonTarget = 0;
  // TODO: evibased, 选择哪一个报告？暂时选择第一个report
  if (reports && reports.length > 0) {
    const { measurements } = reports[0];
    if (measurements && measurements.length > 0) {
      for (const measurement of measurements) {
        const targetLabel = measurement?.Label?.split('|')[1];
        if (targetKeyGroup.includes(targetLabel)) {
          lastTarget++;
        } else if (nontargetKeyGroup.includes(targetLabel)) {
          lastNonTarget++;
        }
      }
    }
  }

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
      {timepoint && timepoint === '1' && (
        <div className="text-primary-light ellipse truncate pt-2 text-base leading-none">
          {`正在标注: 访视${timepoint}(基线)`}
        </div>
      )}
      {timepoint && parseInt(timepoint) > 1 && (
        <div className="text-primary-light ellipse truncate pt-2 text-base leading-none">
          {`正在标注: 访视${timepoint}(上次访视: ${lastTarget}T, ${lastNonTarget}NT)`}
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
