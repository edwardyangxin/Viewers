import React from 'react';
import { ServicesManager } from '@ohif/core';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import MeasurementItem from './MeasurementItem';

// TODO: info mapping refactor to one location
const target_info_mapping = {
  'Target': 'Target',
  'Target_CR': 'Target(CR)',
  'Target_UN': 'Target(UN未知)',
  'Non_Target': 'Non_Target',
  'Other': 'Other',
}

const location_info_mapping = {
  'Abdomen_Chest_Wall': 'Abdomen/Chest Wall',
  'Lung': 'Lung',
  'Lymph_Node': 'Lymph Node',
  'Liver': 'Liver',
  'Mediastinum_Hilum': 'Mediastinum/Hilum',
  'Pelvis': 'Pelvis',
  'Petritoneum_Omentum': 'Petritoneum/Omentum',
  'Retroperitoneum': 'Retroperitoneum',
  'Adrenal': 'Adrenal',
  'Bladder': 'Bladder',
  'Bone': 'Bone',
  'Braine': 'Braine',
  'Breast': 'Breast',
  'Colon': 'Colon',
  'Esophagus': 'Esophagus',
  'Extremities': 'Extremities',
  'Gallbladder': 'Gallbladder',
  'Kidney': 'Kidney',
  'Muscle': 'Muscle',
  'Neck': 'Neck',
  'Other_Soft_Tissue': 'Other Soft Tissue',
  'Ovary': 'Ovary',
  'Pancreas': 'Pancreas',
  'Prostate': 'Prostate',
  'Small_Bowel': 'Small Bowel',
  'Spleen': 'Spleen',
  'Stomach': 'Stomach',
  'Subcutaneous': 'Subcutaneous',
}

const MeasurementTable = ({ data, title, onClick, onEdit, servicesManager }) => {
  servicesManager = servicesManager as ServicesManager;
  const { customizationService } = servicesManager.services;
  const { t } = useTranslation('MeasurementTable');
  const amount = data.length;

  const itemCustomization = customizationService.getCustomization('MeasurementItem', {
    content: MeasurementItem,
    contentProps: {},
  });
  const CustomMeasurementItem = itemCustomization.content;

  return (
    <div>
      <div className="bg-secondary-main flex justify-between px-2 py-1">
        <span className="text-base font-bold uppercase tracking-widest text-white">{t(title)}</span>
        <span className="text-base font-bold text-white">{amount}</span>
      </div>
      <div className="ohif-scrollbar max-h-112 overflow-hidden">
        {data.length !== 0 &&
          data.map((measurementItem, index) => (
            <CustomMeasurementItem
              key={measurementItem.uid}
              uid={measurementItem.uid}
              index={index + 1}
              label={measurementItem.label.split('|')[1] in location_info_mapping ? location_info_mapping[measurementItem.label.split('|')[1]] : t('Edit Measurement')} // 获取label的第二位location信息
              isActive={measurementItem.isActive}
              displayText={measurementItem.displayText}
              item={measurementItem}
              onClick={onClick}
              onEdit={onEdit}
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
