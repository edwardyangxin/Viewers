import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { utils } from '@ohif/core';
import { StudyBrowser, useImageViewer, useViewportGrid, Dialog, ButtonEnums } from '@ohif/ui';
import { useTrackedMeasurements } from '../../getContextModule';
import i18n from '@ohif/i18n';

const { formatDate } = utils;

/**
 *
 * @param {*} param0
 */
function PanelStudyBrowserTracking({
  extensionManager,
  servicesManager,
  getImageSrc,
  getStudiesForPatientByMRN,
  requestDisplaySetCreationForStudy,
  dataSource,
}) {
  const { _appConfig } = extensionManager;
  const {
    displaySetService,
    uiDialogService,
    hangingProtocolService,
    uiNotificationService,
    userAuthenticationService,
  } = servicesManager.services;
  const navigate = useNavigate();

  const { t } = useTranslation('Common');

  // Normally you nest the components so the tree isn't so deep, and the data
  // doesn't have to have such an intense shape. This works well enough for now.
  // Tabs --> Studies --> DisplaySets --> Thumbnails
  const { StudyInstanceUIDs } = useImageViewer();
  const [{ activeViewportId, viewports }, viewportGridService] = useViewportGrid();
  const [trackedMeasurements, sendTrackedMeasurementsEvent] = useTrackedMeasurements();
  const [activeTabName, setActiveTabName] = useState('primary');
  const [expandedStudyInstanceUIDs, setExpandedStudyInstanceUIDs] = useState([
    ...StudyInstanceUIDs,
  ]);
  const [studyDisplayList, setStudyDisplayList] = useState([]);
  const [displaySets, setDisplaySets] = useState([]);
  const [thumbnailImageSrcMap, setThumbnailImageSrcMap] = useState({});
  const [jumpToDisplaySet, setJumpToDisplaySet] = useState(null);

  const onDoubleClickThumbnailHandler = displaySetInstanceUID => {
    let updatedViewports = [];
    const viewportId = activeViewportId;
    try {
      updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
        viewportId,
        displaySetInstanceUID
      );
    } catch (error) {
      console.warn(error);
      uiNotificationService.show({
        title: 'Thumbnail Double Click',
        message:
          'The selected display sets could not be added to the viewport due to a mismatch in the Hanging Protocol rules.',
        type: 'info',
        duration: 3000,
      });
    }

    viewportGridService.setDisplaySetsForViewports(updatedViewports);
  };

  // evibased, double click report thumbnail
  const onDoubleClickReportThumbnailHandler = reportData => {
    console.log('double click report thumbnail: ', reportData);
    sendTrackedMeasurementsEvent('UPDATE_BACKEND_REPORT', {
      reportData: reportData,
    });
  };

  const activeViewportDisplaySetInstanceUIDs =
    viewports.get(activeViewportId)?.displaySetInstanceUIDs;

  const { trackedSeries } = trackedMeasurements.context;

  // ~~ studyDisplayList
  // evibased 获取studyDisplayList，list of all related studies(current study and related studies)
  useEffect(() => {
    // Fetch all studies for the patient in each primary study
    // evibased, 这里去search所有相关的study信息。当前的study和series信息在列表页获取并传进来了。
    async function fetchStudiesForPatient(StudyInstanceUID) {
      // current study qido
      const qidoForStudyUID = await dataSource.query.studies.search({
        studyInstanceUid: StudyInstanceUID,
      });

      if (!qidoForStudyUID?.length) {
        navigate('/notfoundstudy', '_self');
        throw new Error('Invalid study URL');
      }

      let qidoStudiesForPatient = qidoForStudyUID;

      // try to fetch the prior studies based on the patientID if the
      // server can respond.
      try {
        qidoStudiesForPatient = await getStudiesForPatientByMRN(qidoForStudyUID);
      } catch (error) {
        console.warn(error);
      }

      let mappedStudies = _mapDataSourceStudies(qidoStudiesForPatient);
      if (_appConfig.evibased['backend_flag']) {
        mappedStudies = await _fetchReportsBackend(_appConfig, userAuthenticationService, mappedStudies);
      }
      const actuallyMappedStudies = mappedStudies.map(qidoStudy => {
        return {
          studyInstanceUid: qidoStudy.StudyInstanceUID,
          date: formatDate(qidoStudy.StudyDate) || t('NoStudyDate'),
          description: qidoStudy.StudyDescription,
          modalities: qidoStudy.ModalitiesInStudy,
          numInstances: qidoStudy.NumInstances,
          trialTimePointId: qidoStudy.TrialTimePointId, //evibased, trial info
          reports: qidoStudy.reports,
        };
      });

      setStudyDisplayList(prevArray => {
        const ret = [...prevArray];
        for (const study of actuallyMappedStudies) {
          if (!prevArray.find(it => it.studyInstanceUid === study.studyInstanceUid)) {
            ret.push(study);
          }
        }
        return ret;
      });
    }

    StudyInstanceUIDs.forEach(sid => fetchStudiesForPatient(sid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [StudyInstanceUIDs, getStudiesForPatientByMRN]);

  // ~~ Initial Thumbnails
  // get thumbnail for each displaySet，这里理解为每个series的thumbnail
  useEffect(() => {
    const currentDisplaySets = displaySetService.activeDisplaySets;

    if (!currentDisplaySets.length) {
      return;
    }

    currentDisplaySets.forEach(async dSet => {
      const newImageSrcEntry = {};
      const displaySet = displaySetService.getDisplaySetByUID(dSet.displaySetInstanceUID);
      const imageIds = dataSource.getImageIdsForDisplaySet(displaySet);
      const imageId = imageIds[Math.floor(imageIds.length / 2)];

      // TODO: Is it okay that imageIds are not returned here for SR displaySets?
      if (!imageId || displaySet?.unsupported) {
        return;
      }
      // When the image arrives, render it and store the result in the thumbnailImgSrcMap
      newImageSrcEntry[dSet.displaySetInstanceUID] = await getImageSrc(imageId);

      setThumbnailImageSrcMap(prevState => {
        return { ...prevState, ...newImageSrcEntry };
      });
    });
  }, [displaySetService, dataSource, getImageSrc]);

  // ~~ displaySets，
  useEffect(() => {
    const currentDisplaySets = displaySetService.activeDisplaySets;

    if (!currentDisplaySets.length) {
      return;
    }

    const mappedDisplaySets = _mapDisplaySets(
      currentDisplaySets,
      thumbnailImageSrcMap,
      trackedSeries,
      viewports,
      viewportGridService,
      dataSource,
      displaySetService,
      uiDialogService,
      uiNotificationService
    );

    setDisplaySets(mappedDisplaySets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    displaySetService.activeDisplaySets,
    trackedSeries,
    viewports,
    dataSource,
    thumbnailImageSrcMap,
  ]);

  // ~~ subscriptions --> displaySets
  useEffect(() => {
    // DISPLAY_SETS_ADDED returns an array of DisplaySets that were added
    const SubscriptionDisplaySetsAdded = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_ADDED,
      data => {
        const { displaySetsAdded, options } = data;
        displaySetsAdded.forEach(async dSet => {
          const displaySetInstanceUID = dSet.displaySetInstanceUID;

          const newImageSrcEntry = {};
          const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
          if (displaySet?.unsupported) {
            return;
          }

          if (options.madeInClient) {
            setJumpToDisplaySet(displaySetInstanceUID);
          }

          const imageIds = dataSource.getImageIdsForDisplaySet(displaySet);
          const imageId = imageIds[Math.floor(imageIds.length / 2)];

          // TODO: Is it okay that imageIds are not returned here for SR displaysets?
          if (!imageId) {
            return;
          }

          // When the image arrives, render it and store the result in the thumbnailImgSrcMap
          newImageSrcEntry[displaySetInstanceUID] = await getImageSrc(imageId);
          setThumbnailImageSrcMap(prevState => {
            return { ...prevState, ...newImageSrcEntry };
          });
        });
      }
    );

    return () => {
      SubscriptionDisplaySetsAdded.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySetService, dataSource, getImageSrc, thumbnailImageSrcMap, trackedSeries, viewports]);

  useEffect(() => {
    // TODO: Will this always hold _all_ the displaySets we care about?
    // DISPLAY_SETS_CHANGED returns `DisplaySerService.activeDisplaySets`
    const SubscriptionDisplaySetsChanged = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
      changedDisplaySets => {
        const mappedDisplaySets = _mapDisplaySets(
          changedDisplaySets,
          thumbnailImageSrcMap,
          trackedSeries,
          viewports,
          viewportGridService,
          dataSource,
          displaySetService,
          uiDialogService,
          uiNotificationService
        );

        setDisplaySets(mappedDisplaySets);
      }
    );

    const SubscriptionDisplaySetMetaDataInvalidated = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SET_SERIES_METADATA_INVALIDATED,
      () => {
        const mappedDisplaySets = _mapDisplaySets(
          displaySetService.getActiveDisplaySets(),
          thumbnailImageSrcMap,
          trackedSeries,
          viewports,
          viewportGridService,
          dataSource,
          displaySetService,
          uiDialogService,
          uiNotificationService
        );

        setDisplaySets(mappedDisplaySets);
      }
    );

    return () => {
      SubscriptionDisplaySetsChanged.unsubscribe();
      SubscriptionDisplaySetMetaDataInvalidated.unsubscribe();
    };
  }, [thumbnailImageSrcMap, trackedSeries, viewports, dataSource, displaySetService]);

  const tabs = _createStudyBrowserTabs(
    StudyInstanceUIDs,
    studyDisplayList,
    displaySets,
    hangingProtocolService
  );

  // TODO: Should not fire this on "close"
  function _handleStudyClick(StudyInstanceUID) {
    const shouldCollapseStudy = expandedStudyInstanceUIDs.includes(StudyInstanceUID);
    const updatedExpandedStudyInstanceUIDs = shouldCollapseStudy
      ? [...expandedStudyInstanceUIDs.filter(stdyUid => stdyUid !== StudyInstanceUID)]
      : [...expandedStudyInstanceUIDs, StudyInstanceUID];

    setExpandedStudyInstanceUIDs(updatedExpandedStudyInstanceUIDs);

    if (!shouldCollapseStudy) {
      const madeInClient = true;
      requestDisplaySetCreationForStudy(displaySetService, StudyInstanceUID, madeInClient);
    }
  }

  useEffect(() => {
    if (jumpToDisplaySet) {
      // Get element by displaySetInstanceUID
      const displaySetInstanceUID = jumpToDisplaySet;
      const element = document.getElementById(`thumbnail-${displaySetInstanceUID}`);

      if (element && typeof element.scrollIntoView === 'function') {
        // TODO: Any way to support IE here?
        element.scrollIntoView({ behavior: 'smooth' });

        setJumpToDisplaySet(null);
      }
    }
  }, [jumpToDisplaySet, expandedStudyInstanceUIDs, activeTabName]);

  useEffect(() => {
    if (!jumpToDisplaySet) {
      return;
    }

    const displaySetInstanceUID = jumpToDisplaySet;
    // Set the activeTabName and expand the study
    const thumbnailLocation = _findTabAndStudyOfDisplaySet(displaySetInstanceUID, tabs);
    if (!thumbnailLocation) {
      console.warn('jumpToThumbnail: displaySet thumbnail not found.');

      return;
    }
    const { tabName, StudyInstanceUID } = thumbnailLocation;
    setActiveTabName(tabName);
    const studyExpanded = expandedStudyInstanceUIDs.includes(StudyInstanceUID);
    if (!studyExpanded) {
      const updatedExpandedStudyInstanceUIDs = [...expandedStudyInstanceUIDs, StudyInstanceUID];
      setExpandedStudyInstanceUIDs(updatedExpandedStudyInstanceUIDs);
    }
  }, [expandedStudyInstanceUIDs, jumpToDisplaySet, tabs]);

  return (
    <StudyBrowser
      tabs={tabs}
      servicesManager={servicesManager}
      activeTabName={activeTabName}
      expandedStudyInstanceUIDs={expandedStudyInstanceUIDs}
      onClickStudy={_handleStudyClick}
      onClickTab={clickedTabName => {
        setActiveTabName(clickedTabName);
      }}
      onClickUntrack={displaySetInstanceUID => {
        const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
        // TODO: shift this somewhere else where we're centralizing this logic?
        // Potentially a helper from displaySetInstanceUID to this
        sendTrackedMeasurementsEvent('UNTRACK_SERIES', {
          SeriesInstanceUID: displaySet.SeriesInstanceUID,
        });
      }}
      onClickThumbnail={() => {}}
      onDoubleClickThumbnail={onDoubleClickThumbnailHandler}
      onDoubleClickReportThumbnail={onDoubleClickReportThumbnailHandler}
      activeDisplaySetInstanceUIDs={activeViewportDisplaySetInstanceUIDs}
    />
  );
}

PanelStudyBrowserTracking.propTypes = {
  servicesManager: PropTypes.object.isRequired,
  dataSource: PropTypes.shape({
    getImageIdsForDisplaySet: PropTypes.func.isRequired,
  }).isRequired,
  getImageSrc: PropTypes.func.isRequired,
  getStudiesForPatientByMRN: PropTypes.func.isRequired,
  requestDisplaySetCreationForStudy: PropTypes.func.isRequired,
};

export default PanelStudyBrowserTracking;

/**
 * Maps from the DataSource's format to a naturalized object
 *
 * @param {*} studies
 */
function _mapDataSourceStudies(studies) {
  return studies.map(study => {
    // TODO: Why does the data source return in this format?
    return {
      AccessionNumber: study.accession,
      StudyDate: study.date,
      StudyDescription: study.description,
      NumInstances: study.instances,
      ModalitiesInStudy: study.modalities,
      PatientID: study.mrn,
      PatientName: study.patientName,
      StudyInstanceUID: study.studyInstanceUid,
      StudyTime: study.time,
      // Trial info
      TrialProtocolId: study.trialProtocolId,
      TrialProtocolDescription: study.trialProtocolDescription,
      TrialSiteId: study.trialSiteId,
      TrialSubjectId: study.trialSubjectId,
      TrialTimePointId: study.trialTimePointId,
      TrialTimePointDescription: study.trialTimePointDescription
    };
  });
}

// evibased, fetch data from API backend
async function _fetchReportsBackend(_appConfig, userAuthenticationService, mappedStudies) {
  console.log('fetching Backend reports for: ', mappedStudies);
  const reportFetchUrl = _appConfig.evibased['report_fetch_url'];
  // get username from userAuthenticationService  
  const user = userAuthenticationService.getUser();
  let username = 'unknown';
  const authHeader = userAuthenticationService.getAuthorizationHeader();
  const authHeaderKey = Object.keys(authHeader)[0];
  if (user) {
    username = user.profile.preferred_username;
  }
  // loop through all studies
  for (let i = 0; i < mappedStudies.length; i++) {
    const study = mappedStudies[i];
    // get reports from reportFetchUrl by http request
    const response = await fetch(`${reportFetchUrl}?username=${username}&StudyInstanceUID=${study.StudyInstanceUID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        authHeaderKey: authHeader[authHeaderKey],
      }
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP error! status: ${response.status} body: ${body}`);
    }

    let reports = [];
    if (response.status === 204) {
      // no content
      console.log('no reports for study: ', study.StudyInstanceUID);
    } else {
      const body = await response.json();
      reports = Array.isArray(body) ? body : [body];
    }
    // demo data
    // const reports = [
    //   {
    //     report_name: 'report1',
    //     timestamp: '2023-10-25T12:12:12',
    //     username: 'test',
    //     user_report_version: 1,
    //     report_template: 'RESIST1.1',
    //     report_template_version: 'v0.1',
    //     measurements: [
    //       {
    //         Patient_ID: 'ISPY1_1001',
    //         Patient_Name: '1001^6657^ISPY1',
    //         StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.118757564401397374205631727107',
    //         SeriesInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.210538707954985296677398591978',
    //         SOPInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.272165115864924771573341503410',
    //         Label: 'Target|Lymph_Node',
    //         AnnotationType: 'Cornerstone:Bidirectional',
    //         Length: '51.253774533998936',
    //         Width: '34.169183022665926',
    //         Unit: 'mm',
    //         FrameOfReferenceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.172213940908213483760672928659',
    //         points:
    //           '72.06351032056776 50.9972240042937 -42;24.450926452423076 69.97065968107313 -42;41.93273982756892 44.61308055330187 -42;54.58169694542188 76.35480313206496 -42',
    //       },
    //       {
    //         Patient_ID: 'ISPY1_1001',
    //         Patient_Name: '1001^6657^ISPY1',
    //         StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.118757564401397374205631727107',
    //         SeriesInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.226038001772760333157260976449',
    //         SOPInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.110476001967362934681049981213',
    //         Label: 'Target_CR|Liver',
    //         AnnotationType: 'Cornerstone:Bidirectional',
    //         Length: '29.120219846099335',
    //         Width: '19.413479897399586',
    //         Unit: 'mm',
    //         FrameOfReferenceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.172213940908213483760672928659',
    //         points:
    //           '-45.033142730819726 50.85046970719078 80;-71.62663747994458 62.71525967218496 80;-62.28482009371352 47.918366439979565 80;-54.37496011705079 65.64736293939619 80',
    //       },
    //       {
    //         Patient_ID: 'ISPY1_1001',
    //         Patient_Name: '1001^6657^ISPY1',
    //         StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.118757564401397374205631727107',
    //         SeriesInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.210538707954985296677398591978',
    //         SOPInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.333095478199353799429660404955',
    //         Label: 'Target_UN|Mediastinum_Hilum',
    //         AnnotationType: 'Cornerstone:Bidirectional',
    //         Length: '91.13624282454762',
    //         Width: '60.75749521636509',
    //         Unit: 'mm',
    //         FrameOfReferenceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.172213940908213483760672928659',
    //         points:
    //           '61.68181910119784 35.24569249904281 -24;-27.4575296444264 54.21912817582229 -24;10.787666169459257 15.019294088891108 -24;23.436623287312187 74.44552658597395 -24',
    //       },
    //     ],
    //   },
    //   {
    //     report_name: 'report2',
    //     timestamp: '2023-10-25T13:13:13',
    //     username: 'test',
    //     user_report_version: 2,
    //     report_template: 'RESIST1.1',
    //     report_template_version: 'v0.1',
    //     measurements: [
    //       {
    //         Patient_ID: 'ISPY1_1001',
    //         Patient_Name: '1001^6657^ISPY1',
    //         StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.118757564401397374205631727107',
    //         SeriesInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.210538707954985296677398591978',
    //         SOPInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.272165115864924771573341503410',
    //         Label: 'Target|Lymph_Node',
    //         AnnotationType: 'Cornerstone:Bidirectional',
    //         Length: '51.253774533998936',
    //         Width: '34.169183022665926',
    //         Unit: 'mm',
    //         FrameOfReferenceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.172213940908213483760672928659',
    //         points:
    //           '72.06351032056776 50.9972240042937 -42;24.450926452423076 69.97065968107313 -42;41.93273982756892 44.61308055330187 -42;54.58169694542188 76.35480313206496 -42',
    //       },
    //       {
    //         Patient_ID: 'ISPY1_1001',
    //         Patient_Name: '1001^6657^ISPY1',
    //         StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.118757564401397374205631727107',
    //         SeriesInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.226038001772760333157260976449',
    //         SOPInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.110476001967362934681049981213',
    //         Label: 'Target_CR|Liver',
    //         AnnotationType: 'Cornerstone:Bidirectional',
    //         Length: '29.120219846099335',
    //         Width: '19.413479897399586',
    //         Unit: 'mm',
    //         FrameOfReferenceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.172213940908213483760672928659',
    //         points:
    //           '-45.033142730819726 50.85046970719078 80;-71.62663747994458 62.71525967218496 80;-62.28482009371352 47.918366439979565 80;-54.37496011705079 65.64736293939619 80',
    //       },
    //       {
    //         Patient_ID: 'ISPY1_1001',
    //         Patient_Name: '1001^6657^ISPY1',
    //         StudyInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.118757564401397374205631727107',
    //         SeriesInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.210538707954985296677398591978',
    //         SOPInstanceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.333095478199353799429660404955',
    //         Label: 'Target_UN|Mediastinum_Hilum',
    //         AnnotationType: 'Cornerstone:Bidirectional',
    //         Length: '91.13624282454762',
    //         Width: '60.75749521636509',
    //         Unit: 'mm',
    //         FrameOfReferenceUID: '1.3.6.1.4.1.14519.5.2.1.7695.1700.172213940908213483760672928659',
    //         points:
    //           '61.68181910119784 35.24569249904281 -24;-27.4575296444264 54.21912817582229 -24;10.787666169459257 15.019294088891108 -24;23.436623287312187 74.44552658597395 -24',
    //       },
    //     ],
    //   },
    // ];
    // add reports to study
    study['reports'] = reports;
  }
  return mappedStudies;
}

function _mapDisplaySets(
  displaySets,
  thumbnailImageSrcMap,
  trackedSeriesInstanceUIDs,
  viewports, // TODO: make array of `displaySetInstanceUIDs`?
  viewportGridService,
  dataSource,
  displaySetService,
  uiDialogService,
  uiNotificationService
) {
  const thumbnailDisplaySets = [];
  const thumbnailNoImageDisplaySets = [];
  displaySets
    .filter(ds => !ds.excludeFromThumbnailBrowser)
    .forEach(ds => {
      const imageSrc = thumbnailImageSrcMap[ds.displaySetInstanceUID];
      const componentType = _getComponentType(ds);
      const numPanes = viewportGridService.getNumViewportPanes();
      const viewportIdentificator = [];

      if (numPanes !== 1) {
        viewports.forEach(viewportData => {
          if (viewportData?.displaySetInstanceUIDs?.includes(ds.displaySetInstanceUID)) {
            viewportIdentificator.push(viewportData.viewportLabel);
          }
        });
      }

      const array =
        componentType === 'thumbnailTracked' ? thumbnailDisplaySets : thumbnailNoImageDisplaySets;

      const { displaySetInstanceUID } = ds;

      const thumbnailProps = {
        displaySetInstanceUID,
        description: ds.SeriesDescription,
        seriesNumber: ds.SeriesNumber,
        modality: ds.Modality,
        seriesDate: formatDate(ds.SeriesDate),
        numInstances: ds.numImageFrames,
        countIcon: ds.countIcon,
        messages: ds.messages,
        StudyInstanceUID: ds.StudyInstanceUID,
        componentType,
        imageSrc,
        dragData: {
          type: 'displayset',
          displaySetInstanceUID,
          // .. Any other data to pass
        },
        isTracked: trackedSeriesInstanceUIDs.includes(ds.SeriesInstanceUID),
        isHydratedForDerivedDisplaySet: ds.isHydrated,
        viewportIdentificator,
      };

      if (componentType === 'thumbnailNoImage') {
        if (dataSource.reject && dataSource.reject.series) {
          thumbnailProps.canReject = !ds?.unsupported;
          thumbnailProps.onReject = () => {
            uiDialogService.create({
              id: 'ds-reject-sr',
              centralize: true,
              isDraggable: false,
              showOverlay: true,
              content: Dialog,
              contentProps: {
                title: 'Delete Report',
                body: () => (
                  <div className="bg-primary-dark p-4 text-white">
                    <p>Are you sure you want to delete this report?</p>
                    <p className="mt-2">This action cannot be undone.</p>
                  </div>
                ),
                actions: [
                  {
                    id: 'cancel',
                    text: 'Cancel',
                    type: ButtonEnums.type.secondary,
                  },
                  {
                    id: 'yes',
                    text: 'Yes',
                    type: ButtonEnums.type.primary,
                    classes: ['reject-yes-button'],
                  },
                ],
                onClose: () => uiDialogService.dismiss({ id: 'ds-reject-sr' }),
                onShow: () => {
                  const yesButton = document.querySelector('.reject-yes-button');

                  yesButton.focus();
                },
                onSubmit: async ({ action }) => {
                  switch (action.id) {
                    case 'yes':
                      try {
                        await dataSource.reject.series(ds.StudyInstanceUID, ds.SeriesInstanceUID);
                        displaySetService.deleteDisplaySet(displaySetInstanceUID);
                        uiDialogService.dismiss({ id: 'ds-reject-sr' });
                        uiNotificationService.show({
                          title: 'Delete Report',
                          message: 'Report deleted successfully',
                          type: 'success',
                        });
                      } catch (error) {
                        uiDialogService.dismiss({ id: 'ds-reject-sr' });
                        uiNotificationService.show({
                          title: 'Delete Report',
                          message: 'Failed to delete report',
                          type: 'error',
                        });
                      }
                      break;
                    case 'cancel':
                      uiDialogService.dismiss({ id: 'ds-reject-sr' });
                      break;
                  }
                },
              },
            });
          };
        } else {
          thumbnailProps.canReject = false;
        }
      }

      array.push(thumbnailProps);
    });

  return [...thumbnailDisplaySets, ...thumbnailNoImageDisplaySets];
}

const thumbnailNoImageModalities = ['SR', 'SEG', 'SM', 'RTSTRUCT', 'RTPLAN', 'RTDOSE', 'DOC', 'OT'];

function _getComponentType(ds) {
  if (thumbnailNoImageModalities.includes(ds.Modality) || ds?.unsupported) {
    return 'thumbnailNoImage';
  }

  return 'thumbnailTracked';
}

/**
 *
 * evibased, create tabs for study browser panel
 *
 * @param {string[]} primaryStudyInstanceUIDs
 * @param {object[]} studyDisplayList
 * @param {string} studyDisplayList.studyInstanceUid
 * @param {string} studyDisplayList.date
 * @param {string} studyDisplayList.description
 * @param {string} studyDisplayList.modalities
 * @param {number} studyDisplayList.numInstances
 * @param {object[]} displaySets
 * @returns tabs - The prop object expected by the StudyBrowser component
 */
function _createStudyBrowserTabs(
  primaryStudyInstanceUIDs,
  studyDisplayList,
  displaySets,
  hangingProtocolService
) {
  // 3 tabs list
  const primaryStudies = [];
  const recentStudies = [];
  const allStudies = [];

  // Iterate over each study...
  studyDisplayList.forEach(study => {
    // Find it's display sets
    const displaySetsForStudy = displaySets.filter(
      ds => ds.StudyInstanceUID === study.studyInstanceUid
    );

    // Sort them
    const dsSortFn = hangingProtocolService.getDisplaySetSortFunction();
    displaySetsForStudy.sort(dsSortFn);

    /* Sort by series number, then by series date
      displaySetsForStudy.sort((a, b) => {
        if (a.seriesNumber !== b.seriesNumber) {
          return a.seriesNumber - b.seriesNumber;
        }

        const seriesDateA = Date.parse(a.seriesDate);
        const seriesDateB = Date.parse(b.seriesDate);

        return seriesDateA - seriesDateB;
      });
    */

    // Map the study to it's tab/view representation
    const tabStudy = Object.assign({}, study, {
      displaySets: displaySetsForStudy,
    });

    // Add the "tab study" to the 'primary', 'recent', and/or 'all' tab group(s)
    if (primaryStudyInstanceUIDs.includes(study.studyInstanceUid)) {
      primaryStudies.push(tabStudy);
      allStudies.push(tabStudy);
    } else {
      // TODO: Filter allStudies to dates within one year of current date
      recentStudies.push(tabStudy);
      allStudies.push(tabStudy);
    }
  });

  // Newest first
  const _byDate = (a, b) => {
    const dateA = Date.parse(a);
    const dateB = Date.parse(b);

    return dateB - dateA;
  };

  const tabs = [
    {
      name: 'primary',
      label: i18n.t('SidePanel:Primary'),
      studies: primaryStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    {
      name: 'recent',
      label: i18n.t('SidePanel:Recent'),
      studies: recentStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    {
      name: 'all',
      label: i18n.t('SidePanel:All'),
      studies: allStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
  ];

  return tabs;
}

function _findTabAndStudyOfDisplaySet(displaySetInstanceUID, tabs) {
  for (let t = 0; t < tabs.length; t++) {
    const { studies } = tabs[t];

    for (let s = 0; s < studies.length; s++) {
      const { displaySets } = studies[s];

      for (let d = 0; d < displaySets.length; d++) {
        const displaySet = displaySets[d];

        if (displaySet.displaySetInstanceUID === displaySetInstanceUID) {
          return {
            tabName: tabs[t].name,
            StudyInstanceUID: studies[s].studyInstanceUid,
          };
        }
      }
    }
  }
}
