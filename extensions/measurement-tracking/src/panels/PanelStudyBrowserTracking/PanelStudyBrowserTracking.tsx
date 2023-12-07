import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { utils } from '@ohif/core';
import { useImageViewer, useViewportGrid, Dialog, ButtonEnums } from '@ohif/ui';
import StudyBrowser from '../../ui/StudyBrowser';
import { useTrackedMeasurements } from '../../getContextModule';
import i18n from '@ohif/i18n';

const { formatDate, performAuditLog } = utils;

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
    measurementService,
  } = servicesManager.services;
  const navigate = useNavigate();

  const { t } = useTranslation('Common');

  // Normally you nest the components so the tree isn't so deep, and the data
  // doesn't have to have such an intense shape. This works well enough for now.
  // Tabs --> Studies --> DisplaySets --> Thumbnails
  const { StudyInstanceUIDs } = useImageViewer();
  // evibased, assume the 1st study for current timepoint study, and the 2nd study for compared study
  const currentStudyInstanceUID = StudyInstanceUIDs[0];
  const comparedStudyInstanceUID = StudyInstanceUIDs.length > 1 ? StudyInstanceUIDs[1] : null;
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
  const [tabs, setTabs] = useState([]);

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
  const onLoadReportHandler = reportData => {
    console.log('double click report thumbnail: ', reportData);

    // audit log loading report data
    const auditMsg = 'leave viewer mode';
    const auditLogBodyMeta = {
      StudyInstanceUID: StudyInstanceUIDs,
      action: auditMsg,
      action_result: 'success',
    };
    performAuditLog(_appConfig, userAuthenticationService, 'i', auditMsg, auditLogBodyMeta);

    sendTrackedMeasurementsEvent('UPDATE_BACKEND_REPORT', {
      reportData: reportData,
    });
  };

  const activeViewportDisplaySetInstanceUIDs =
    viewports.get(activeViewportId)?.displaySetInstanceUIDs;

  const { trackedSeries } = trackedMeasurements.context;

  // evibased, set current viewportid and compared viewportid
  useEffect(() => {
    let currentViewportId = 'default';
    let comparedViewportId = null;
    if (viewports.size > 1) {
      // get current viewport id
      for (const { viewportId, displaySetOptions } of viewports.values()) {
        if (['default', 'currentDisplaySetId'].includes(displaySetOptions[0].id)) {
          currentViewportId = viewportId;
          break;
        } else if (['comparedDisplaySetId'].includes(displaySetOptions[0].id)) {
          comparedViewportId = viewportId;
        }
      }
    }

    sendTrackedMeasurementsEvent('UPDATE_CURRENT_VIEWPORT_ID', {
      currentViewportId: currentViewportId,
    });
    sendTrackedMeasurementsEvent('UPDATE_COMPARED_VIEWPORT_ID', {
      comparedViewportId: comparedViewportId,
    });
  }, [viewports]);

  // evibased, studyDisplayList update based on current timepoint study
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
      if (_appConfig.evibased['use_report_api']) {
        mappedStudies = await _fetchReportsBackend(
          _appConfig,
          userAuthenticationService,
          mappedStudies
        );
      }

      const actuallyMappedStudies = [];
      let currentTimepoint = null;
      let comparedTimepoint = null;
      for (const qidoStudy of mappedStudies) {
        const selectedStudyAttributes = {
          studyInstanceUid: qidoStudy.StudyInstanceUID,
          date: formatDate(qidoStudy.StudyDate) || t('NoStudyDate'),
          description: qidoStudy.StudyDescription,
          modalities: qidoStudy.ModalitiesInStudy,
          numInstances: qidoStudy.NumInstances,
          trialTimePointId: qidoStudy.TrialTimePointId, //evibased, trial info
          reports: qidoStudy.reports,
          ifPrimary: currentStudyInstanceUID === qidoStudy.StudyInstanceUID,
        };
        actuallyMappedStudies.push(selectedStudyAttributes);
        if (selectedStudyAttributes.ifPrimary) {
          currentTimepoint = selectedStudyAttributes;
        } else if (comparedStudyInstanceUID === selectedStudyAttributes.studyInstanceUid) {
          comparedTimepoint = selectedStudyAttributes;
        }
      }

      let lastTimepointStudy = undefined;
      const lastTimepointId = parseInt(currentTimepoint.trialTimePointId.slice(1)) - 1;
      let baselineStudy = undefined;
      for (const study of actuallyMappedStudies) {
        const timepointId = parseInt(study.trialTimePointId.slice(1));
        if (timepointId === 0) {
          study.ifBaseline = true;
          baselineStudy = study;
        }
        if (timepointId === lastTimepointId) {
          study.ifLastTimepoint = true;
          lastTimepointStudy = study;
        }
      }

      sendTrackedMeasurementsEvent('UPDATE_CURRENT_TIMEPOINT_INFO', {
        currentTimepoint: currentTimepoint,
      });

      sendTrackedMeasurementsEvent('UPDATE_BASELINE_TIMEPOINT', {
        baselineTimepoint: baselineStudy,
      });

      sendTrackedMeasurementsEvent('UPDATE_LAST_TIMEPOINT', {
        lastTimepoint: lastTimepointStudy,
      });

      sendTrackedMeasurementsEvent('UPDATE_COMPARED_TIMEPOINT_INFO', {
        measurementService: measurementService,
        comparedTimepoint: comparedTimepoint,
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

    // evibase, only fetch data for current study
    // StudyInstanceUIDs.forEach(sid => fetchStudiesForPatient(sid));
    fetchStudiesForPatient(currentStudyInstanceUID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [StudyInstanceUIDs, getStudiesForPatientByMRN]);

  // left panel tabs data based on studyDisplayList
  // set past timepoints
  useEffect(() => {
    const tabs = _createStudyBrowserTabs(
      StudyInstanceUIDs,
      studyDisplayList,
      displaySets,
      hangingProtocolService
    );

    sendTrackedMeasurementsEvent('UPDATE_PAST_TIMEPOINTS', {
      pastTimepoints: tabs[1].studies,
    });

    setTabs(tabs);
  }, [studyDisplayList]);

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

  // ~~ displaySets，update displaySets = activeDisplaySets
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

  // ~~ subscriptions --> displaySets (events DISPLAY_SETS_ADDED)
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

  // subscriptions --> displaySets (events DISPLAY_SETS_CHANGED, DISPLAY_SET_SERIES_METADATA_INVALIDATED)
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

  // TODO: Should not fire this on "close"
  // study click handler, fetch data on click study
  function _handleStudyClick(StudyInstanceUID) {
    const shouldCollapseStudy = expandedStudyInstanceUIDs.includes(StudyInstanceUID);
    const updatedExpandedStudyInstanceUIDs = shouldCollapseStudy
      ? [...expandedStudyInstanceUIDs.filter(stdyUid => stdyUid !== StudyInstanceUID)]
      : [...expandedStudyInstanceUIDs, StudyInstanceUID];

    setExpandedStudyInstanceUIDs(updatedExpandedStudyInstanceUIDs);

    if (!shouldCollapseStudy) {
      // fetch data for study
      const madeInClient = true;
      requestDisplaySetCreationForStudy(displaySetService, StudyInstanceUID, madeInClient);
    }
  }

  // jumpToDisplaySet
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

  // jumpToDisplaySet
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
      currentStudyInstanceUID={currentStudyInstanceUID}
      comparedStudyInstanceUID={comparedStudyInstanceUID}
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
      onDoubleClickReportThumbnail={onLoadReportHandler}
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
      TrialTimePointDescription: study.trialTimePointDescription,
    };
  });
}

// evibased, fetch data from API backend
async function _fetchReportsBackend(_appConfig, userAuthenticationService, mappedStudies) {
  console.log('fetching Backend reports for: ', mappedStudies);

  try {
    const reportFetchUrl = _appConfig.evibased['report_fetch_url'];
    // get username from userAuthenticationService
    const user = userAuthenticationService.getUser();
    let username = 'unknown';
    const authHeader = userAuthenticationService.getAuthorizationHeader();
    if (user) {
      username = user.profile.preferred_username;
    }
    const realm_role = user?.profile?.realm_role;
    // evibased, if role is doctor, filter studies by task list
    const ifDoctor = realm_role ? realm_role.includes('doctor') : false;
    // loop through all studies
    for (let i = 0; i < mappedStudies.length; i++) {
      const study = mappedStudies[i];
      // get reports from reportFetchUrl by http request
      let fetchUrl;
      if (ifDoctor) {
        // doctor only see own reports
        fetchUrl = `${reportFetchUrl}?username=${username}&StudyInstanceUID=${study.StudyInstanceUID}`;
      } else {
        // other see all reports
        fetchUrl = `${reportFetchUrl}?StudyInstanceUID=${study.StudyInstanceUID}`;
      }
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader.Authorization,
        },
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

      // add reports to study
      study['reports'] = reports;
    }
  } catch (error) {
    console.error('fetch reports error: ', error);
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
  const pastStudies = [];
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
      // evibased, recent studies is all studies except primary studies for now
      pastStudies.push(tabStudy);
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
      name: 'past',
      label: i18n.t('SidePanel:PastTimepoint'),
      studies: pastStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    // {
    //   name: 'all',
    //   label: i18n.t('SidePanel:All'),
    //   studies: allStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    // },
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
