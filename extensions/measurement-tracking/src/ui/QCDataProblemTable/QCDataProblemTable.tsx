import React from 'react';
import { ServicesManager } from '@ohif/core';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import MeasurementItem from '../MeasurementTable/MeasurementItem';
import { dataProblemTypeMapping } from '../../utils/mappings';
import WarningInfoTooltip from '../WarningInfoTooltip';

/**
 * 
 * @param tableWarningInfo = [
      'warning1',
      'warning2',
    ]
 * @returns 
 */
const QCDataProblemTable = ({
  data,
  title,
  onClick,
  onEdit,
  onDelete,
  servicesManager,
  tableID, // evibased
  canEdit = true,
  tableWarningInfo = [], // evibased, for warning info tooltip
}) => {
  servicesManager = servicesManager as ServicesManager;
  const { customizationService, measurementService } = servicesManager.services;
  const { t } = useTranslation('QCDataProblemTable');

  const amount = data.length;

  const itemCustomization = customizationService.getCustomization('MeasurementItem', {
    content: MeasurementItem,
    contentProps: {},
  });
  const CustomQCDataProblemItem = itemCustomization.content;

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

  // evibased, table warning
  const isWarningInfoExist = false;

  return (
    <div>
      <div
        className={`${isWarningInfoExist ? 'bg-red-500' : 'bg-secondary-main'} flex justify-between px-2 py-1`}
      >
        <div className="flex items-center justify-start">
          <div>
            <span className="text-base font-bold uppercase tracking-widest text-white">
              {title}
            </span>
          </div>
          <WarningInfoTooltip
            id={'MT' + tableID}
            warningInfo={tableWarningInfo}
          ></WarningInfoTooltip>
        </div>
        <span className="text-base font-bold text-white">{amount}</span>
      </div>
      <div className="ohif-scrollbar max-h-112 overflow-hidden">
        {data.length !== 0 &&
          data.map((measurementItem, index) => (
            <CustomQCDataProblemItem
              key={measurementItem.uid}
              uid={measurementItem.uid}
              index={index + 1}
              label={
                measurementItem.label.split('|')[0] in dataProblemTypeMapping
                  ? dataProblemTypeMapping[measurementItem.label.split('|')[0]]
                  : t('Edit Measurement')
              } // 获取label的第二位organ信息
              isActive={measurementItem.isActive}
              displayText={measurementItem.displayText}
              item={measurementItem}
              tableID={tableID}
              onClick={onClick}
              onEdit={onEdit}
              onDelete={onMeasurementDeleteHandler}
              canEdit={canEdit}
              warningInfo={measurementItem.validationInfo?.messages}
            />
          ))}
        {data.length === 0 && (
          <div className="group flex cursor-default border border-transparent bg-black transition duration-300">
            <div className="bg-primary-dark text-primary-light group-hover:bg-secondary-main w-6 py-1 text-center text-base transition duration-300"></div>
            <div className="flex flex-1 items-center justify-between px-2 py-4">
              <span className="text-primary-light mb-1 flex flex-1 items-center text-base">
                {'没有发现问题'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

QCDataProblemTable.defaultProps = {
  data: [],
  onClick: () => {},
  onEdit: () => {},
};

QCDataProblemTable.propTypes = {
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

export default QCDataProblemTable;