/* eslint-disable react/jsx-props-no-spreading */
import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Enums, ExtensionManager, MODULE_TYPES, log } from '@ohif/core';
//
import { extensionManager } from '../App.tsx';
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

    // 204: no content
    // evibased, based on role from user.profile.realm_role, get task list and filter studies
    async function getData() {
      setIsLoading(true);
      log.time(Enums.TimingEnum.SEARCH_TO_LIST);

      // get user role
      let username = 'unknown';
      const user = userAuthenticationService.getUser();
      if (user) {
        username = user.profile.preferred_username;
      }
      const realm_role = user?.profile?.realm_role;
      // evibased, if role is doctor, filter studies by task list
      const ifDoctor = realm_role ? realm_role.includes('doctor') : false;
      if (ifDoctor) {
        try {
          // get task list by username and status
          const authHeader = userAuthenticationService.getAuthorizationHeader();
          const filterTaskStatus = 'create';
          const getTaskUrl = _appConfig['evibased']['task_get_url'];
          const getTaskResponse = await fetch(
            `${getTaskUrl}?username=${username}&status=${filterTaskStatus}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader.Authorization,
              },
            }
          );
          if (!getTaskResponse.ok) {
            const body = await getTaskResponse.text();
            throw new Error(`HTTP error! status: ${getTaskResponse.status} body: ${body}`);
          }
          let tasks = [];
          if (getTaskResponse.status === 204) {
            // no content
          } else {
            const body = await getTaskResponse.json();
            tasks = Array.isArray(body) ? body : [body];
          }

          // get studyUIDs list and add to filter
          const studyUIDs = tasks.map(task => task.timepoint.UID);
          queryFilterValues.studyInstanceUid = studyUIDs;

          // evibased, go to task list for now
          // auto go to 1st task page, else go to page with empty task list
          // if (studyUIDs.length > 0) {
          //   navigate(`/viewer?StudyInstanceUIDs=${studyUIDs[0]}`);
          // }
        } catch (e) {
          console.error(e);
        }
      }

      let studies = [];
      if (
        !ifDoctor ||
        (queryFilterValues.studyInstanceUid && queryFilterValues.studyInstanceUid.length > 0)
      ) {
        // if not doctor or studyUIDs list is not empty, get studies by studyUIDs list
        studies = await dataSource.query.studies.search(queryFilterValues);
      }

      // evibased, get task info for each studies
      for (const study of studies) {
        try {
          const StudyInstanceUID = study.studyInstanceUid;
          const authHeader = userAuthenticationService.getAuthorizationHeader();
          const getTaskUrl = _appConfig['evibased']['task_get_url'];
          let fetchTaskUrl;
          if (ifDoctor) {
            // if doctor, fetch only doctor task info
            fetchTaskUrl = `${getTaskUrl}?StudyInstanceUID=${StudyInstanceUID}&username=${username}`;
          } else {
            fetchTaskUrl = `${getTaskUrl}?StudyInstanceUID=${StudyInstanceUID}`;
          }
          const getTaskResponse = await fetch(fetchTaskUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader.Authorization,
            },
          });
          if (!getTaskResponse.ok) {
            study.tasks = [];
            const body = await getTaskResponse.text();
            throw new Error(`HTTP error! status: ${getTaskResponse.status} body: ${body}`);
          }
          let tasks = [];
          if (getTaskResponse.status === 204) {
            // no content
          } else {
            const body = await getTaskResponse.json();
            tasks = Array.isArray(body) ? body : [body];
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
