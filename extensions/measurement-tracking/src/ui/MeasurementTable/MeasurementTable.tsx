import React, { useState } from 'react';
import { ServicesManager } from '@ohif/core';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import MeasurementItem from './MeasurementItem';
import { organMapping } from '../../utils/mappings';
import WarningInfoTooltip from '../WarningInfoTooltip';

/**
 * 
 * @param warningInfo = {
    messages: [
      'warning1',
      'warning2',
    ]
  }
 * @returns 
 */
const MeasurementTable = ({
  data,
  title,
  onClick,
  onEdit,
  onDelete,
  servicesManager,
  tableID, // evibased
  ifTarget = false,
  canEdit = true,
  warningInfo = {}, // evibased, for warning info tooltip
}) => {
  servicesManager = servicesManager as ServicesManager;
  const { customizationService, measurementService } = servicesManager.services;
  const { t } = useTranslation('MeasurementTable');

  const amount = data.length;

  const itemCustomization = customizationService.getCustomization('MeasurementItem', {
    content: MeasurementItem,
    contentProps: {},
  });
  const CustomMeasurementItem = itemCustomization.content;

  const onMeasurementDeleteHandler = ({ uid }) => {
    const measurement = measurementService.getMeasurement(uid);
    onDelete?.({ uid });
    measurementService.remove(
      uid,
      {
        ...measurement,
      },
      true
    );
  };

  // evibased
  // target table warning
  const ifTargetWarning = ifTarget && amount > 5; // TODO: deprecated, using warningInfo instead 
  const isWarningInfoExist = warningInfo && Object.keys(warningInfo).length !== 0;

  return (
    <div>
      <div
        className={`${ifTargetWarning ? 'bg-red-500' : 'bg-secondary-main'} flex justify-between px-2 py-1`}
      >
        <div className="flex items-center justify-start">
          <div>
            <span className="text-base font-bold uppercase tracking-widest text-white">{title}</span>
            {/* {isWarningInfoExist && isWarningInfoHovering && (
              <div className="absolute z-50 bg-black p-2 text-base text-white">
                {Object.keys(warningInfo).map((key, i) => (
                  <div key={i}>
                    <span>{key}: </span>
                    <span>{warningInfo[key]}</span>
                  </div>
                ))}
              </div>
            )} */}
          </div>
          <WarningInfoTooltip
            id={'MeasurementTable' + tableID}
            warningInfo={warningInfo}
          ></WarningInfoTooltip>
          {/* {isWarningInfoExist && (
            <div
            onMouseEnter={() => setIsWarningInfoHovering(true)}
            onMouseLeave={() => setIsWarningInfoHovering(false)}
            >
              <Icon
                name="status-alert-warning"
                className="ml-1 cursor-help transition duration-300 hover:opacity-80"
              />
            </div>
          )} */}
        </div>
        <span className="text-base font-bold text-white">{amount}</span>
      </div>
      <div className="ohif-scrollbar max-h-112 overflow-hidden">
        {data.length !== 0 &&
          data.map((measurementItem, index) => (
            <CustomMeasurementItem
              key={measurementItem.uid}
              uid={measurementItem.uid}
              index={parseInt(measurementItem.label.split('|')[0])}
              label={measurementItem.label.split('|')[2] in organMapping ? organMapping[measurementItem.label.split('|')[2]] : t('Edit Measurement')} // 获取label的第二位organ信息
              isActive={measurementItem.isActive}
              displayText={measurementItem.displayText}
              item={measurementItem}
              tableID={tableID}
              onClick={onClick}
              onEdit={onEdit}
              onDelete={onMeasurementDeleteHandler}
              canEdit={canEdit}
            />
          ))}
        {data.length === 0 && (
          <div className="group flex cursor-default border border-transparent bg-black transition duration-300">
            <div className="bg-primary-dark text-primary-light group-hover:bg-secondary-main w-6 py-1 text-center text-base transition duration-300"></div>
            <div className="flex flex-1 items-center justify-between px-2 py-4">
              <span className="text-primary-light mb-1 flex flex-1 items-center text-base">
                {t('No tracked measurements')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

MeasurementTable.defaultProps = {
  data: [],
  onClick: () => {},
  onEdit: () => {},
};

MeasurementTable.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      uid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      label: PropTypes.string,
      displayText: PropTypes.arrayOf(PropTypes.string),
      isActive: PropTypes.bool,
    })
  ),
  onClick: PropTypes.func,
  onEdit: PropTypes.func,
};

export default MeasurementTable;
