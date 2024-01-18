import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import i18n from '@ohif/i18n';

import { LegacyButton, Icon } from '@ohif/ui';
import { responseOptions } from '../../utils/mappings';

const baseClasses =
  'first:border-0 border-t border-secondary-light cursor-pointer select-none outline-none';

const PastReportItem = ({
  studyInstanceUid,
  trialTimePointInfo,
  username,
  SOD,
  response,
  isActive,
  onClick,
  onReportClick = () => {},
}) => {
  const option = responseOptions.find(option => option.value === response);
  const responseLabel = option ? option.label : '未知';
  return (
    <div
      className={classnames(
        isActive ? 'bg-secondary-dark' : 'hover:bg-secondary-main bg-black',
        baseClasses
      )}
      onClick={onClick}
      onKeyUp={onClick}
      role="button"
      tabIndex="1"
    >
      {/* evibased: timepoint title */}
      <div className="flex flex-1 flex-col px-4 pb-2">
        {username ? (
          <div className="flex flex-row items-center justify-between pt-2 pb-2">
            <div className="text-base text-white">{`${trialTimePointInfo}报告(${username})`}</div>
            <div className="flex flex-row items-center text-base text-blue-300">
              {`${responseLabel}(SOD:${SOD}mm)`}
            </div>
            <LegacyButton
                key={studyInstanceUid + '-report-button'}
                className={'min-w-18 p-2 text-base text-white'}
                size="initial"
                color={'primaryActive'}
                bgColor={'bg-primary-main'}
                onClick={onReportClick}
              >
                {'查看报告'}
            </LegacyButton>
          </div>
        ) : (
          <div className="flex flex-row items-center justify-between pt-2 pb-2">
            <div className="text-base text-white">{`${trialTimePointInfo}(无报告)`}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// PastReportItem.propTypes = {
//   date: PropTypes.string.isRequired,
//   description: PropTypes.string,
//   modalities: PropTypes.string.isRequired,
//   numInstances: PropTypes.number.isRequired,
//   trackedSeries: PropTypes.number,
//   isActive: PropTypes.bool,
//   onClick: PropTypes.func.isRequired,
// };

export default PastReportItem;
