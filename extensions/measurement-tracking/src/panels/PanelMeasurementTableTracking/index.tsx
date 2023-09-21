import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  StudySummary,
  MeasurementTable,
  Dialog,
  Select,
  useViewportGrid,
  ButtonEnums,
} from '@ohif/ui';
import { DicomMetadataStore, utils } from '@ohif/core';
import { useDebounce } from '@hooks';
import ActionButtons from './ActionButtons';
import { useTrackedMeasurements } from '../../getContextModule';
import debounce from 'lodash.debounce';
import { useTranslation } from 'react-i18next';

const { downloadCSVReport } = utils;
const { formatDate } = utils;

const DISPLAY_STUDY_SUMMARY_INITIAL_VALUE = {
  key: undefined, //
  date: '', // '07-Sep-2010',
  modality: '', // 'CT',
  description: '', // 'CHEST/ABD/PELVIS W CONTRAST',
};

// TODO: info mapping refactor to one location
const target_info_mapping = {
  'Target': 'Target',
  'Target_CR': 'Target(CR)',
  'Target_UN': 'Target(UN未知)',
  'Non_Target': 'Non_Target',
  'Other': 'Other',
}
const target_key_group = ['Target', 'Target_CR', 'Target_UN']
const nontarget_key_group = ['Non_Target', 'Other']

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

function PanelMeasurementTableTracking({ servicesManager, extensionManager }) {
  const { t } = useTranslation();
  const [viewportGrid] = useViewportGrid();
  const [measurementChangeTimestamp, setMeasurementsUpdated] = useState(
    Date.now().toString()
  );
  const debouncedMeasurementChangeTimestamp = useDebounce(
    measurementChangeTimestamp,
    200
  );
  const {
    measurementService,
    uiDialogService,
    displaySetService,
  } = servicesManager.services;
  const [
    trackedMeasurements,
    sendTrackedMeasurementsEvent,
  ] = useTrackedMeasurements();
  const { trackedStudy, trackedSeries } = trackedMeasurements.context;
  const [displayStudySummary, setDisplayStudySummary] = useState(
    DISPLAY_STUDY_SUMMARY_INITIAL_VALUE
  );
  const [displayMeasurements, setDisplayMeasurements] = useState([]);
  const measurementsPanelRef = useRef(null);

  useEffect(() => {
    const measurements = measurementService.getMeasurements();
    const filteredMeasurements = measurements.filter(
      m =>
        trackedStudy === m.referenceStudyUID &&
        trackedSeries.includes(m.referenceSeriesUID)
    );

    const mappedMeasurements = filteredMeasurements.map(m =>
      _mapMeasurementToDisplay(
        m,
        measurementService.VALUE_TYPES,
        displaySetService
      )
    );
    setDisplayMeasurements(mappedMeasurements);
    // eslint-ignore-next-line
  }, [
    measurementService,
    trackedStudy,
    trackedSeries,
    debouncedMeasurementChangeTimestamp,
  ]);

  const updateDisplayStudySummary = async () => {
    if (trackedMeasurements.matches('tracking')) {
      const StudyInstanceUID = trackedStudy;
      const studyMeta = DicomMetadataStore.getStudy(StudyInstanceUID);
      const instanceMeta = studyMeta.series[0].instances[0];
      const { StudyDate, StudyDescription } = instanceMeta;

      const modalities = new Set();
      studyMeta.series.forEach(series => {
        if (trackedSeries.includes(series.SeriesInstanceUID)) {
          modalities.add(series.instances[0].Modality);
        }
      });
      const modality = Array.from(modalities).join('/');

      if (displayStudySummary.key !== StudyInstanceUID) {
        setDisplayStudySummary({
          key: StudyInstanceUID,
          date: StudyDate, // TODO: Format: '07-Sep-2010'
          modality,
          description: StudyDescription,
        });
      }
    } else if (trackedStudy === '' || trackedStudy === undefined) {
      setDisplayStudySummary(DISPLAY_STUDY_SUMMARY_INITIAL_VALUE);
    }
  };

  // ~~ DisplayStudySummary
  useEffect(() => {
    updateDisplayStudySummary();
  }, [
    displayStudySummary.key,
    trackedMeasurements,
    trackedStudy,
    updateDisplayStudySummary,
  ]);

  // TODO: Better way to consolidated, debounce, check on change?
  // Are we exposing the right API for measurementService?
  // This watches for ALL measurementService changes. It updates a timestamp,
  // which is debounced. After a brief period of inactivity, this triggers
  // a re-render where we grab up-to-date measurements
  useEffect(() => {
    const added = measurementService.EVENTS.MEASUREMENT_ADDED;
    const addedRaw = measurementService.EVENTS.RAW_MEASUREMENT_ADDED;
    const updated = measurementService.EVENTS.MEASUREMENT_UPDATED;
    const removed = measurementService.EVENTS.MEASUREMENT_REMOVED;
    const cleared = measurementService.EVENTS.MEASUREMENTS_CLEARED;
    const subscriptions = [];

    [added, addedRaw, updated, removed, cleared].forEach(evt => {
      subscriptions.push(
        measurementService.subscribe(evt, () => {
          setMeasurementsUpdated(Date.now().toString());
          if (evt === added) {
            debounce(() => {
              measurementsPanelRef.current.scrollTop =
                measurementsPanelRef.current.scrollHeight;
            }, 300)();
          }
        }).unsubscribe
      );
    });

    return () => {
      subscriptions.forEach(unsub => {
        unsub();
      });
    };
  }, [measurementService, sendTrackedMeasurementsEvent]);

  async function exportReport() {
    const measurements = measurementService.getMeasurements();
    const trackedMeasurements = measurements.filter(
      m =>
        trackedStudy === m.referenceStudyUID &&
        trackedSeries.includes(m.referenceSeriesUID)
    );

    downloadCSVReport(trackedMeasurements, measurementService);
  }

  const jumpToImage = ({ uid, isActive }) => {
    measurementService.jumpToMeasurement(viewportGrid.activeViewportId, uid);

    onMeasurementItemClickHandler({ uid, isActive });
  };

  // TODO: evibased, 重构，和extension cornerstone callInputDialog统一代码
  const onMeasurementItemEditHandler = ({ uid, isActive }) => {
    const measurement = measurementService.getMeasurement(uid);
    const dialogId = 'enter-annotation';
    jumpToImage({ uid, isActive });

    // label for 保存尽量多的label信息，因为cornerstonejs只支持保存label到DicomSR中
    let label = measurement ? measurement.label : 'target_info|location_info';
    label = label.split("|")
    if (label.length < 2) {
      // label at least 2 infos
      label.push('location_info')
    }

    // get measurementLabelInfo, noMeasurement means create Cornerstone3D annotation first just return label to callback!
    // if no measurementLabelInfo, get from label
    const measurementLabelInfo = measurement && measurement['measurementLabelInfo'] ?
      measurement['measurementLabelInfo'] : {}

    const valueDialog = {
      measurementLabelInfo: measurementLabelInfo,
      label: label,
    };

    // init targetValue, locationValue
    let targetValue = null;
    if ('target' in measurementLabelInfo) {
      targetValue = measurementLabelInfo['target'];
    } else {
      // no target in measurementLabelInfo, get from label
      let labelTarget = label[0]
      if (labelTarget in target_info_mapping) {
        targetValue = {
          'value': labelTarget,
          'label': target_info_mapping[labelTarget]
        }
      }
      measurementLabelInfo['target'] = targetValue;
    }

    let locationValue = null;
    if ('location' in measurementLabelInfo) {
      locationValue = measurementLabelInfo['location'];
    } else {
      // no target in measurementLabelInfo, get from label
      let labelLocation = label[1]
      if (labelLocation in location_info_mapping) {
        locationValue = {
          'value': labelLocation,
          'label': location_info_mapping[labelLocation]
        }
      }
      measurementLabelInfo['location'] = locationValue;
    }

    // for dialog sumbit button
    const onSubmitHandler = ({ action, value }) => {
      switch (action.id) {
        case 'save': {
          // copy measurement
          const updatedMeasurement = { ...measurement };
          updatedMeasurement['measurementLabelInfo'] = valueDialog['measurementLabelInfo'];
          updatedMeasurement['label'] = valueDialog['label'].join('|');

          measurementService.update(uid, updatedMeasurement, true);
        }
      }
      uiDialogService.dismiss({ id: dialogId });
    };

    uiDialogService.create({
      id: dialogId,
      centralize: true,
      isDraggable: false,
      showOverlay: true,
      content: Dialog,
      contentProps: {
        title: t('Dialog:Annotation'),
        noCloseButton: true,
        value: valueDialog,
        onClose: () => uiDialogService.dismiss({ id: dialogId }),

        body: ({ value, setValue }) => {
          return (
            <div>
              <Select
                id="target"
                placeholder="选择目标"
                value={targetValue ? [targetValue.value] : []} //select只能传入target value
                onChange={(newSelection, action) => {
                  console.info(
                    'newSelection:',
                    newSelection,
                    'action:',
                    action
                  );
                  targetValue = newSelection;
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['target'] = targetValue;
                    value['label'][0] = targetValue['value'];
                    return value;
                  });
                }}
                options={[
                  { value: 'Target', label: 'Target' },
                  { value: 'Target_CR', label: 'Target(CR)' },
                  { value: 'Target_UN', label: 'Target(UN未知)' },
                  { value: 'Non_Target', label: 'Non_Target' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <Select
                id="location"
                placeholder="选择病灶位置"
                value={locationValue ? [locationValue.value] : []}
                onChange={(newSelection, action) => {
                  console.info(
                    'newSelection:',
                    newSelection,
                    'action:',
                    action
                  );
                  locationValue = newSelection;
                  setValue(value => {
                    // update label info
                    value['measurementLabelInfo']['location'] = locationValue;
                    value['label'][1] = locationValue['value'];
                    return value;
                  });
                }}
                options={[
                  { value: 'Abdomen_Chest_Wall', label: 'Abdomen/Chest Wall' },
                  { value: 'Lung', label: 'Lung' },
                  { value: 'Lymph_Node', label: 'Lymph Node' },
                  { value: 'Liver', label: 'Liver' },
                  { value: 'Mediastinum_Hilum', label: 'Mediastinum/Hilum' },
                  { value: 'Pelvis', label: 'Pelvis' },
                  {
                    value: 'Petritoneum_Omentum',
                    label: 'Petritoneum/Omentum',
                  },
                  { value: 'Retroperitoneum', label: 'Retroperitoneum' },
                  { value: 'Adrenal', label: 'Adrenal' },
                  { value: 'Bladder', label: 'Bladder' },
                  { value: 'Bone', label: 'Bone' },
                  { value: 'Braine', label: 'Braine' },
                  { value: 'Breast', label: 'Breast' },
                  { value: 'Colon', label: 'Colon' },
                  { value: 'Esophagus', label: 'Esophagus' },
                  { value: 'Extremities', label: 'Extremities' },
                  { value: 'Gallbladder', label: 'Gallbladder' },
                  { value: 'Kidney', label: 'Kidney' },
                  { value: 'Muscle', label: 'Muscle' },
                  { value: 'Neck', label: 'Neck' },
                  { value: 'Other_Soft_Tissue', label: 'Other Soft Tissue' },
                  { value: 'Ovary', label: 'Ovary' },
                  { value: 'Pancreas', label: 'Pancreas' },
                  { value: 'Prostate', label: 'Prostate' },
                  { value: 'Small_Bowel', label: 'Small Bowel' },
                  { value: 'Spleen', label: 'Spleen' },
                  { value: 'Stomach', label: 'Stomach' },
                  { value: 'Subcutaneous', label: 'Subcutaneous' },
                ]}
              />
            </div>
          );
        },
        actions: [
          {
            id: 'cancel',
            text: t('Dialog:Cancel'),
            type: ButtonEnums.type.secondary,
          },
          {
            id: 'save',
            text: t('Dialog:Save'),
            type: ButtonEnums.type.primary,
          },
        ],
        onSubmit: onSubmitHandler,
      },
    });
  };

  const onMeasurementItemClickHandler = ({ uid, isActive }) => {
    if (!isActive) {
      const measurements = [...displayMeasurements];
      const measurement = measurements.find(m => m.uid === uid);

      measurements.forEach(m => (m.isActive = m.uid !== uid ? false : true));
      measurement.isActive = true;
      setDisplayMeasurements(measurements);
    }
  };

  // evibased 按照target&nonTarget分组显示
  // const displayMeasurementsWithoutFindings = displayMeasurements.filter(
  //   dm => dm.measurementType !== measurementService.VALUE_TYPES.POINT
  // );
  // const additionalFindings = displayMeasurements.filter(
  //   dm => dm.measurementType === measurementService.VALUE_TYPES.POINT
  // );

  let targetFindings = []
  let nonTargetFindings = []
  for (let dm of displayMeasurements) {
      // get target info
      let targetInfo = dm.label.split('|')[0];
      if (!(targetInfo in target_info_mapping)) {
        // not in target_info_mapping, just show and allow edit
        nonTargetFindings.push(dm)
      } else if (target_key_group.includes(targetInfo)) {
        targetFindings.push(dm)
      } else {
        nonTargetFindings.push(dm)
      }
  }

  return (
    <>
      <div
        className="invisible-scrollbar overflow-y-auto overflow-x-hidden"
        ref={measurementsPanelRef}
        data-cy={'trackedMeasurements-panel'}
      >
        {displayStudySummary.key && (
          <StudySummary
            date={formatDate(displayStudySummary.date)}
            modality={displayStudySummary.modality}
            description={displayStudySummary.description}
          />
        )}
        <MeasurementTable
          title={t('MeasurementTabel:Target Findings')}
          data={targetFindings}
          servicesManager={servicesManager}
          onClick={jumpToImage}
          onEdit={onMeasurementItemEditHandler}
        />
        <MeasurementTable
          title={t('MeasurementTabel:Non-Target Findings')}
          data={nonTargetFindings}
          servicesManager={servicesManager}
          onClick={jumpToImage}
          onEdit={onMeasurementItemEditHandler}
        />
      </div>
      <div className="flex justify-center p-4">
        <ActionButtons
          onExportClick={exportReport}
          onCreateReportClick={() => {
            sendTrackedMeasurementsEvent('SAVE_REPORT', {
              viewportId: viewportGrid.activeViewportId,
              isBackupSave: true,
            });
          }}
          disabled={
            targetFindings.length === 0 &&
            nonTargetFindings.length === 0
          }
        />
      </div>
    </>
  );
}

PanelMeasurementTableTracking.propTypes = {
  servicesManager: PropTypes.shape({
    services: PropTypes.shape({
      measurementService: PropTypes.shape({
        getMeasurements: PropTypes.func.isRequired,
        VALUE_TYPES: PropTypes.object.isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
};

// TODO: This could be a measurementService mapper
function _mapMeasurementToDisplay(measurement, types, displaySetService) {
  const { referenceStudyUID, referenceSeriesUID, SOPInstanceUID } = measurement;

  // TODO: We don't deal with multiframe well yet, would need to update
  // This in OHIF-312 when we add FrameIndex to measurements.

  const instance = DicomMetadataStore.getInstance(
    referenceStudyUID,
    referenceSeriesUID,
    SOPInstanceUID
  );

  const displaySets = displaySetService.getDisplaySetsForSeries(
    referenceSeriesUID
  );

  if (!displaySets[0] || !displaySets[0].images) {
    throw new Error(
      'The tracked measurements panel should only be tracking "stack" displaySets.'
    );
  }

  const {
    displayText: baseDisplayText,
    uid,
    label: baseLabel,
    type,
    selected,
    findingSites,
    finding,
  } = measurement;

  const firstSite = findingSites?.[0];
  const label = baseLabel || finding?.text || firstSite?.text || '(empty)';
  let displayText = baseDisplayText || [];
  if (findingSites) {
    const siteText = [];
    findingSites.forEach(site => {
      if (site?.text !== label) {
        siteText.push(site.text);
      }
    });
    displayText = [...siteText, ...displayText];
  }
  if (finding && finding?.text !== label) {
    displayText = [finding.text, ...displayText];
  }

  return {
    uid,
    label,
    baseLabel,
    measurementType: type,
    displayText,
    baseDisplayText,
    isActive: selected,
    finding,
    findingSites,
  };
}

export default PanelMeasurementTableTracking;
