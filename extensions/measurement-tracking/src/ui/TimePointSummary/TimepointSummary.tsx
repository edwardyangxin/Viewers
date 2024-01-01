import React from 'react';
import PropTypes from 'prop-types';

import { targetKeyGroup, nontargetKeyGroup, otherKeyGroup } from '../../utils/mappings';

const TimePointSummary = ({ taskInfo, timepoint, lastTimepointInfo, currentLabels }) => {
  const ifBaseline = timepoint && parseInt(timepoint) > 1 ? false : true;
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
  const todoLabels = lastTarget + lastNonTarget;
  let percent = 0;
  let validPercent = false;
  if (todoLabels > 0) {
    percent = Math.round(currentLabels / todoLabels);
    if (percent && percent > 1) {
      percent = 1;
    }
    validPercent = true;
  }
  return (
    <div className="flex justify-between p-2">
      <div>
        <div className="leading-none">
          {ifFinished ? (
            <span className="mr-2 text-lg font-bold text-white">{'所有任务已完成'}</span>
          ) : (
            <span className="mr-2 text-lg font-bold text-white">
              {'总任务数: ' + taskInfo.totalTask}
            </span>
          )}
          {/* <span className="bg-common-bright rounded-sm px-1 text-base font-bold text-black">
            {modality}
          </span> */}
        </div>
        {/* <div className="text-primary-light ellipse truncate pt-2 text-base leading-none">
          {`正在标注: `}
        </div> */}
      </div>
      {/* progress */}
      {!ifBaseline && (
        <div className="flex items-center">
          <div className="flex-1">
            <div className="flex items-center">
              <h4 className="font-medium text-sm mr-auto text-white flex items-center" >
                当前任务完成
              </h4>
              {validPercent ? (
                <span className={`px-1 rounded-lg text-sm ${
                  currentLabels >= todoLabels ? 'bg-green-900 text-green-500' : 'bg-red-900 text-red-500'}`}>
                  {currentLabels + '/' + todoLabels}
                </span>
              ) : (
                <span className="px-1 rounded-lg bg-red-900 text-red-500 text-sm">
                  N/A
                </span>
              )}
            </div>
            <div className="overflow-hidden bg-blue-900 h-1.5 rounded-full w-full">
              <span
                className="h-full bg-blue-500 w-full block rounded-full"
                style={{width: `${validPercent ? percent*100 : 100}%`}}
              ></span>
            </div>
          </div>
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
