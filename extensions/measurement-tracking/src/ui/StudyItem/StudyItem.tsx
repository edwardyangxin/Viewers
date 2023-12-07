import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import i18n from '@ohif/i18n';

import { LegacyButton, Icon } from '@ohif/ui';

const baseClasses =
  'first:border-0 border-t border-secondary-light cursor-pointer select-none outline-none';

const StudyItem = ({
  studyInstanceUid,
  ifPrimary,
  date,
  description,
  numInstances,
  modalities,
  trackedSeries,
  isActive,
  onClick,
  onCompareClick=()=>{},
}) => {
  const navigateToURLNewTab = () => {
    const url = `/viewer/?StudyInstanceUIDs=${studyInstanceUid}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className={classnames(
        isActive ? 'bg-secondary-dark' : 'hover:bg-secondary-main bg-black',
        baseClasses
      )}
      onClick={onClick}
      onKeyDown={onClick}
      role="button"
      tabIndex="0"
    >
      {/* evibased: timepoint title */}
      <div className="flex flex-1 flex-col px-4 pb-2">
        <div className="flex flex-row items-center justify-between pt-2 pb-2">
          <div className="text-base text-white">{date}</div>
          {/* <div className="flex flex-row items-center text-base text-blue-300">
            <Icon
              name="group-layers"
              className="mx-2 w-4 text-blue-300"
            />
            {numInstances}
          </div> */}
        </div>
        <div className="flex flex-row py-1">
          {ifPrimary && (<div className="pr-5 text-xl text-blue-300">{modalities}</div>)}
          {!ifPrimary && (
            <>
              {/* <LegacyButton
                key={studyInstanceUid + '-compare-button'}
                className={'min-w-18 p-2 text-base text-white'}
                size="initial"
                color={'primaryActive'}
                bgColor={'bg-primary-main'}
                onClick={onCompareClick}
              >
                {'加入对比'}
              </LegacyButton> */}
              <LegacyButton
                key={studyInstanceUid + '-open-button'}
                className={'min-w-18 p-2 text-base text-white'}
                size="initial"
                // color={color}
                bgColor={'bg-primary-main'}
                onClick={navigateToURLNewTab}
              >
                {'打开访视'}
              </LegacyButton>
            </>
          )}
          {/* <div className="truncate-2-lines break-words text-base text-blue-300">{description}</div> */}
        </div>
      </div>
      {/* timepoint data detail */}
      {!!trackedSeries && (
        <div className="flex-2 flex">
          <div
            className={classnames(
              'bg-secondary-main mt-2 flex flex-row py-1 pl-2 pr-4 text-base text-white ',
              isActive
                ? 'border-secondary-light flex-1 justify-center border-t'
                : 'mx-4 mb-4 rounded-sm'
            )}
          >
            <Icon
              name="tracked"
              className="text-primary-light mr-2 w-4"
            />
            {i18n.t('StudyBrowser:Currently Tracking') +
              '(' +
              trackedSeries +
              ' ' +
              i18n.t('StudyBrowser:Series') +
              ')'}
          </div>
        </div>
      )}
    </div>
  );
};

StudyItem.propTypes = {
  date: PropTypes.string.isRequired,
  description: PropTypes.string,
  modalities: PropTypes.string.isRequired,
  numInstances: PropTypes.number.isRequired,
  trackedSeries: PropTypes.number,
  isActive: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default StudyItem;
