import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router';
import PropTypes from 'prop-types';

import { targetKeyGroup, nonTargetKeyGroup, TaskMapping } from '../../utils/mappings';
import { Icon } from '@ohif/ui';

const TimePointSummary = ({
  extensionManager,
  currentTask,
  taskInfo,
  timepoint,
  lastTimepointInfo,
  currentLabels,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const taskType = currentTask?.type;
  const hasTask = taskType ? true : false;
  // deprecated, remove timepoint prefix
  timepoint = timepoint && timepoint.startsWith('T') ? timepoint.slice(1) : timepoint;
  const ifBaseline = !timepoint || timepoint === '0' || timepoint === '00';
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
        } else if (nonTargetKeyGroup.includes(targetLabel)) {
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

  const onClickReturnButton = () => {
    const { pathname } = location;
    const dataSourceIdx = pathname.indexOf('/', 1);
    const query = new URLSearchParams(window.location.search);
    const configUrl = query.get('configUrl');

    const dataSourceName = pathname.substring(dataSourceIdx + 1);
    const existingDataSource = extensionManager.getDataSources(dataSourceName);

    const searchQuery = new URLSearchParams();
    if (dataSourceIdx !== -1 && existingDataSource) {
      searchQuery.append('datasources', pathname.substring(dataSourceIdx + 1));
    }

    if (configUrl) {
      searchQuery.append('configUrl', configUrl);
    }

    navigate({
      pathname: '/',
      search: decodeURIComponent(searchQuery.toString()),
    });
  };

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
        <div className="text-primary-light ellipse truncate pt-2 text-base leading-none">
          {`当前任务类型: ${taskType ? TaskMapping[taskType] : 'N/A'}`}
        </div>
      </div>
      {/* progress */}
      {(!ifBaseline && hasTask) && (
        <div className="flex items-center">
          <div className="flex-1">
            <div className="flex items-center">
              <h4 className="mr-auto flex items-center text-sm font-medium text-white">
                当前任务完成
              </h4>
              {validPercent ? (
                <span
                  className={`rounded-lg px-1 text-sm ${
                    currentLabels >= todoLabels
                      ? 'bg-green-900 text-green-500'
                      : 'bg-red-900 text-red-500'
                  }`}
                >
                  {currentLabels + '/' + todoLabels}
                </span>
              ) : (
                <span className="rounded-lg bg-red-900 px-1 text-sm text-red-500">N/A</span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-900">
              <span
                className="block h-full w-full rounded-full bg-blue-500"
                style={{ width: `${validPercent ? percent * 100 : 100}%` }}
              ></span>
            </div>
          </div>
        </div>
      )}
      {/* deprecated go back to task list */}
      {/* {!hasTask && (
        <div className="flex items-center">
          <div className="flex-1">
            <div
              className="flex items-center cursor-pointer"
              onClick={onClickReturnButton}
              data-cy="return-to-work-list"
            >
              <h4 className="mr-auto ml-4 flex items-center text-lg font-medium text-white">
                任务列表
              </h4>
              <Icon
                name="chevron-right"
                className="text-primary-active w-8"
              />
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

// TimePointSummary.propTypes = {
//   timepoint: PropTypes.string.isRequired,
//   modality: PropTypes.string,
//   description: PropTypes.string,
// };

export default TimePointSummary;
