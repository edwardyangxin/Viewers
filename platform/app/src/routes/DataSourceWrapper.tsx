/* eslint-disable react/jsx-props-no-spreading */
import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Enums, ExtensionManager, MODULE_TYPES, log, Types } from '@ohif/core';
import { useParams, useLocation } from 'react-router';
import { useNavigate } from 'react-router-dom';
import useSearchParams from '../hooks/useSearchParams.ts';
import { utils } from '@ohif/core';

const { TimingEnum } = Types;
const { performAuditLog } = utils;

/**
 * Determines if two React Router location objects are the same.
 */
const areLocationsTheSame = (location0, location1) => {
  return (
    location0.pathname === location1.pathname &&
    location0.search === location1.search &&
    location0.hash === location1.hash
  );
};

/**
 * Uses route properties to determine the data source that should be passed
 * to the child layout template. In some instances, initiates requests and
 * passes data as props.
 *
 * @param {object} props
 * @param {function} props.children - Layout Template React Component
 */
function DataSourceWrapper(props) {
  const navigate = useNavigate();
  const { children: LayoutTemplate, servicesManager, extensionManager, ...rest } = props;
  const { userAuthenticationService } = servicesManager.services;
  const { _appConfig } = extensionManager;
  const params = useParams();
  const location = useLocation();
  const lowerCaseSearchParams = useSearchParams({ lowerCaseKeys: true });
  const query = useSearchParams();
  // Route props --> studies.mapParams
  // mapParams --> studies.search
  // studies.search --> studies.processResults
  // studies.processResults --> <LayoutTemplate studies={} />
  // But only for LayoutTemplate type of 'list'?
  // Or no data fetching here, and just hand down my source
  const STUDIES_LIMIT = 101;
  const DEFAULT_DATA = {
    studies: [],
    total: 0,
    resultsPerPage: 25,
    pageNumber: 1,
    location: 'Not a valid location, causes first load to occur',
  };

  const getInitialDataSourceName = useCallback(() => {
    // TODO - get the variable from the props all the time...
    let dataSourceName = lowerCaseSearchParams.get('datasources');

    if (!dataSourceName && window.config.defaultDataSourceName) {
      return '';
    }

    if (!dataSourceName) {
      // Gets the first defined datasource with the right name
      // Mostly for historical reasons - new configs should use the defaultDataSourceName
      const dataSourceModules = extensionManager.modules[MODULE_TYPES.DATA_SOURCE];
      // TODO: Good usecase for flatmap?
      const webApiDataSources = dataSourceModules.reduce((acc, curr) => {
        const mods = [];
        curr.module.forEach(mod => {
          if (mod.type === 'webApi') {
            mods.push(mod);
          }
        });
        return acc.concat(mods);
      }, []);
      dataSourceName = webApiDataSources
        .map(ds => ds.name)
        .find(it => extensionManager.getDataSources(it)?.[0] !== undefined);
    }

    return dataSourceName;
  }, []);

  const [isDataSourceInitialized, setIsDataSourceInitialized] = useState(false);

  // The path to the data source to be used in the URL for a mode (e.g. mode/dataSourcePath?StudyIntanceUIDs=1.2.3)
  const [dataSourcePath, setDataSourcePath] = useState(() => {
    const dataSourceName = getInitialDataSourceName();
    return dataSourceName ? `/${dataSourceName}` : '';
  });

  const [dataSource, setDataSource] = useState(() => {
    const dataSourceName = getInitialDataSourceName();

    if (!dataSourceName) {
      return extensionManager.getActiveDataSource()[0];
    }

    const dataSource = extensionManager.getDataSources(dataSourceName)?.[0];
    if (!dataSource) {
      throw new Error(`No data source found for ${dataSourceName}`);
    }

    return dataSource;
  });

  const [data, setData] = useState(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * The effect to initialize the data source whenever it changes. Similar to
   * whenever a different Mode is entered, the Mode's data source is initialized, so
   * too this DataSourceWrapper must initialize its data source whenever a different
   * data source is activated. Furthermore, a data source might be initialized
   * several times as it gets activated/deactivated because the location URL
   * might change and data sources initialize based on the URL.
   */
  useEffect(() => {
    const initializeDataSource = async () => {
      await dataSource.initialize({ params, query });
      setIsDataSourceInitialized(true);
    };

    initializeDataSource();
  }, [dataSource]);

  useEffect(() => {
    // evibased, audit log, enter task list page
    const auditMsg = 'enter task list page';
    const auditLogBodyMeta = {
      action: auditMsg,
      action_result: 'success',
    };
    performAuditLog(_appConfig, userAuthenticationService, 'i', auditMsg, auditLogBodyMeta);

    const dataSourceChangedCallback = () => {
      setIsLoading(false);
      setIsDataSourceInitialized(false);
      setDataSourcePath('');
      setDataSource(extensionManager.getActiveDataSource()[0]);
      // Setting data to DEFAULT_DATA triggers a new query just like it does for the initial load.
      setData(DEFAULT_DATA);
    };

    const sub = extensionManager.subscribe(
      ExtensionManager.EVENTS.ACTIVE_DATA_SOURCE_CHANGED,
      dataSourceChangedCallback
    );
    return () => {
      // audit log leave task list page
      const auditMsg = 'leave task list page';
      const auditLogBodyMeta = {
        action: auditMsg,
        action_result: 'success',
      };
      performAuditLog(_appConfig, userAuthenticationService, 'i', auditMsg, auditLogBodyMeta);
      sub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isDataSourceInitialized) {
      return;
    }

    const queryFilterValues = _getQueryFilterValues(location.search, STUDIES_LIMIT);

    // evibased, get username & role
    const user = userAuthenticationService.getUser();
    const username = user?.profile?.preferred_username;
    const realm_role = user?.profile?.realm_role;
    const ifDoctor = realm_role ? realm_role.includes('doctor') : false;
    const ifManager = !ifDoctor;

    // 204: no content
    // evibased, based on role from user.profile.realm_role, get task list and filter studies
    async function getData() {
      setIsLoading(true);
      log.time(Enums.TimingEnum.SEARCH_TO_LIST);
      // evibased, store studyInstanceUid to task info to avoid duplicate fetch
      const studyUIDInfoMap = {};

      // get filter queryFilterValues.studyInstanceUid list
      // todo: extract to a function?
      if (ifDoctor) {
        try {
          // doctor role, get task list by username
          // get task list by username and status
          const authHeader = userAuthenticationService.getAuthorizationHeader();
          const url = new URL(_appConfig['evibased']['task_get_url']);
          const filterTaskStatus = 'create';
          const fetchSearchParams = {
            username: username,
            status: filterTaskStatus,
          };
          url.search = new URLSearchParams(fetchSearchParams).toString();
          const fetchOptions = {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader.Authorization,
            },
          };
          const response = await fetch(url, fetchOptions);
          if (!response.ok) {
            const data = await response.text();
            throw new Error(`HTTP error! status: ${response.status} data: ${data}`);
          }
          let tasks = [];
          if (response.status === 204) {
            // no content
          } else {
            const data = await response.json();
            tasks = Array.isArray(data) ? data : [data];
          }

          // map studyInstanceUid to task
          tasks.forEach(task => {
            studyUIDInfoMap[task.timepoint.UID] = {};
            studyUIDInfoMap[task.timepoint.UID].timepoint = task.timepoint;
            studyUIDInfoMap[task.timepoint.UID].tasks = [task];
          });
          // filter studies by studyInstanceUid list
          queryFilterValues.studyInstanceUid = Object.keys(studyUIDInfoMap);

          // evibased, go to task list for now
          // auto go to 1st task page, else go to page with empty task list
          // if (studyUIDs.length > 0) {
          //   navigate(`/viewer?StudyInstanceUIDs=${studyUIDs[0]}`);
          // }
        } catch (e) {
          console.error(e);
        }
      } else if (ifManager) {
        try {
          // no role default manager
          // get all timepoints with default Timepoint status
          // const authHeader = userAuthenticationService.getAuthorizationHeader();
          const url = new URL(_appConfig['evibased']['timepoint_get_url']);
          const filterTimepointStatus = ['QC-data', 'reviewing', 'QC-report', 'arbitration'];
          const fetchSearchParams = {
            page: '0',
            size: '10000',
            search: `status:${filterTimepointStatus.join('+')}`,
          };
          url.search = new URLSearchParams(fetchSearchParams).toString();
          const fetchOptions = {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              // Authorization: authHeader.Authorization,
            },
          };
          const reponse = await fetch(url, fetchOptions);
          if (!reponse.ok) {
            const data = await reponse.text();
            throw new Error(`HTTP error! status: ${reponse.status} data: ${data}`);
          }
          let timepoints = [];
          if (reponse.status === 204) {
            // no content
          } else {
            const data = await reponse.json();
            timepoints = Array.isArray(data) ? data : [data];
          }

          // map studyInstanceUid to task
          timepoints.forEach(tp => {
            studyUIDInfoMap[tp.uid] = {};
            studyUIDInfoMap[tp.uid].timepoint = tp;
            studyUIDInfoMap[tp.uid].tasks = tp.tasks;
          });
          // filter studies by studyInstanceUid list
          queryFilterValues.studyInstanceUid = Object.keys(studyUIDInfoMap);
        } catch (e) {
          console.error(e);
        }
      }

      let studies = [];
      if (
        ifManager ||
        (queryFilterValues.studyInstanceUid && queryFilterValues.studyInstanceUid.length > 0)
      ) {
        // fetch studies if 1. manager or 2. has studyInstanceUid filter by roles like: doctor or data manager
        studies = await dataSource.query.studies.search(queryFilterValues);
      }

      // evibased, get task info for each studies
      for (const study of studies) {
        try {
          const StudyInstanceUID = study.studyInstanceUid;
          // if already has task info
          if (StudyInstanceUID in studyUIDInfoMap) {
            study.timepoint = studyUIDInfoMap[StudyInstanceUID].timepoint;
            study.tasks = studyUIDInfoMap[StudyInstanceUID].tasks;
            continue;
          }
          // still need to fetch task info
          const authHeader = userAuthenticationService.getAuthorizationHeader();
          const url = new URL(_appConfig['evibased']['task_get_url']);
          let fetchSearchParams = {};
          if (ifDoctor) {
            // if doctor, fetch only doctor task info
            fetchSearchParams = {
              StudyInstanceUID: StudyInstanceUID,
              username: username,
            };
          } else {
            fetchSearchParams = {
              StudyInstanceUID: StudyInstanceUID,
            };
          }
          url.search = new URLSearchParams(fetchSearchParams).toString();
          const fetchOptions = {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader.Authorization,
            },
          };
          const response = await fetch(url, fetchOptions);
          if (!response.ok) {
            study.tasks = [];
            const data = await response.text();
            throw new Error(`HTTP error! status: ${response.status} data: ${data}`);
          }
          let tasks = [];
          if (response.status === 204) {
            // no content
          } else {
            const data = await response.json();
            tasks = Array.isArray(data) ? data : [data];
          }
          study.tasks = tasks;
        } catch (e) {
          console.error(e);
        }
      }

      setData({
        studies: studies || [],
        total: studies.length,
        resultsPerPage: queryFilterValues.resultsPerPage,
        pageNumber: queryFilterValues.pageNumber,
        location,
      });
      log.timeEnd(Enums.TimingEnum.SCRIPT_TO_VIEW);
      log.timeEnd(Enums.TimingEnum.SEARCH_TO_LIST);

      setIsLoading(false);
    }

    try {
      // Cache invalidation :thinking:
      // - Anytime change is not just next/previous page
      // - And we didn't cross a result offset range
      const isSamePage = data.pageNumber === queryFilterValues.pageNumber;
      const previousOffset =
        Math.floor((data.pageNumber * data.resultsPerPage) / STUDIES_LIMIT) * (STUDIES_LIMIT - 1);
      const newOffset =
        Math.floor(
          (queryFilterValues.pageNumber * queryFilterValues.resultsPerPage) / STUDIES_LIMIT
        ) *
        (STUDIES_LIMIT - 1);
      // Simply checking data.location !== location is not sufficient because even though the location href (i.e. entire URL)
      // has not changed, the React Router still provides a new location reference and would result in two study queries
      // on initial load. Alternatively, window.location.href could be used.
      const isLocationUpdated =
        typeof data.location === 'string' || !areLocationsTheSame(data.location, location);
      const isDataInvalid =
        !isSamePage || (!isLoading && (newOffset !== previousOffset || isLocationUpdated));

      if (isDataInvalid) {
        getData().catch(e => {
          console.error(e);
          // If there is a data source configuration API, then the Worklist will popup the dialog to attempt to configure it
          // and attempt to resolve this issue.
          if (dataSource.getConfig().configurationAPI) {
            return;
          }

          // evibased, manager and no data, just go to timepoint list
          if (ifManager) {
            return;
          }

          // No data source configuration API, so navigate to the not found server page.
          navigate('/notfoundserver', '_self');
        });
      }
    } catch (ex) {
      console.warn(ex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, location, params, isLoading, setIsLoading, dataSource, isDataSourceInitialized]);
  // queryFilterValues

  // TODO: Better way to pass DataSource?
  return (
    <LayoutTemplate
      {...rest}
      servicesManager={servicesManager}
      extensionManager={extensionManager}
      data={data.studies}
      dataPath={dataSourcePath}
      dataTotal={data.total}
      dataSource={dataSource}
      isLoadingData={isLoading}
      // To refresh the data, simply reset it to DEFAULT_DATA which invalidates it and triggers a new query to fetch the data.
      onRefresh={() => setData(DEFAULT_DATA)}
    />
  );
}

DataSourceWrapper.propTypes = {
  /** Layout Component to wrap with a Data Source */
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.func]).isRequired,
};

export default DataSourceWrapper;

/**
 * Duplicated in `workList`
 * Need generic that can be shared? Isn't this what qs is for?
 * @param {*} query
 */
function _getQueryFilterValues(query, queryLimit) {
  query = new URLSearchParams(query);

  const pageNumber = _tryParseInt(query.get('pageNumber'), 1);
  const resultsPerPage = _tryParseInt(query.get('resultsPerPage'), 25);

  const queryFilterValues = {
    // DCM
    patientId: query.get('mrn'),
    patientName: query.get('patientName'),
    studyDescription: query.get('description'),
    modalitiesInStudy: query.get('modalities') && query.get('modalities').split(','),
    accessionNumber: query.get('accession'),
    //
    startDate: query.get('startDate'),
    endDate: query.get('endDate'),
    page: _tryParseInt(query.get('page'), undefined),
    pageNumber,
    resultsPerPage,
    // Rarely supported server-side
    sortBy: query.get('sortBy'),
    sortDirection: query.get('sortDirection'),
    // Offset...
    offset: Math.floor((pageNumber * resultsPerPage) / queryLimit) * (queryLimit - 1),
    config: query.get('configUrl'),
    // evibased, trial info
    trialProtocolDescription: query.get('trialProtocolDescription'),
    trialTimePointId: query.get('trialTimePointId'),
  };

  // patientName: good
  // studyDescription: good
  // accessionNumber: good

  // Delete null/undefined keys
  Object.keys(queryFilterValues).forEach(
    key => queryFilterValues[key] == null && delete queryFilterValues[key]
  );

  return queryFilterValues;

  function _tryParseInt(str, defaultValue) {
    let retValue = defaultValue;
    if (str !== null) {
      if (str.length > 0) {
        if (!isNaN(str)) {
          retValue = parseInt(str);
        }
      }
    }
    return retValue;
  }
}
