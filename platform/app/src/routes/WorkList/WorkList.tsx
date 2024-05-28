import React, { useState, useEffect, useMemo } from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import qs from 'query-string';
import isEqual from 'lodash.isequal';
import { useTranslation } from 'react-i18next';

import filtersMeta from './filtersMeta.js';
import { useAppConfig } from '@state';
import { useDebounce, useSearchParams } from '@hooks';
import { utils, hotkeys, ServicesManager } from '@ohif/core';

import {
  Icon,
  StudyListExpandedRow,
  EmptyStudies,
  StudyListTable,
  StudyListPagination,
  StudyListFilter,
  TooltipClipboard,
  Header,
  useModal,
  AboutModal,
  UserPreferences,
  LoadingIndicatorProgress,
  useSessionStorage,
  InvestigationalUseDialog,
  Button,
  ButtonEnums,
  Select,
} from '@ohif/ui';

import { Types } from '@ohif/ui';

import i18n from '@ohif/i18n';

const PatientInfoVisibility = Types.PatientInfoVisibility;

const { sortBySeriesDate } = utils;

const { availableLanguages, defaultLanguage, currentLanguage } = i18n;

const seriesInStudiesMap = new Map();

// evibased, info mapping, TODO: move to extension?
const timepointStatusMapping = {
  scheduled: '数据待上传',
  collecting: '数据上传中',
  appending: '数据补充中',
  'QC-data': '数据待审核',
  reviewing: '待阅片',
  'QC-report': '报告待审核',
  arbitration: '待仲裁',
  freezed: '报告数据锁定',
  archived: '报告数据已存档',
};
const timepointStatusOptions = Object.keys(timepointStatusMapping).map(key => ({
  value: key,
  label: timepointStatusMapping[key],
}));

const taskTypeMap = {
  review: '判读',
  arbitration: '仲裁',
  'QC-data': '数据审核',
  'QC-report': '报告审核',
  // deprecated
  reading: '判读-弃用',
  QC: '质控-弃用',
};

const taskStatusMap = {
  create: '待处理',
  done: '已完成',
  archive: '已存档',
};

/**
 * TODO: evibased, 重构到IRC的extension？
 * 1. assign task
 * - debounce `setFilterValues` (150ms?)
 */
function WorkList({
  data: studies,
  dataTotal: studiesTotal,
  isLoadingData,
  dataSource,
  hotkeysManager,
  dataPath,
  onRefresh,
  servicesManager,
  projects, // evibased, projects list for manager
}) {
  // evibased, get username & role
  const { userAuthenticationService } = servicesManager.services;
  const user = userAuthenticationService.getUser();
  const username = user?.profile?.preferred_username;
  const realm_role = user?.profile?.realm_role;
  const ifDoctor = realm_role ? realm_role.includes('doctor') : false;
  const ifQC = realm_role ? realm_role.includes('QC') : false;
  const ifManager = !ifDoctor && !ifQC;

  const { hotkeyDefinitions, hotkeyDefaults } = hotkeysManager;
  const { show, hide } = useModal();
  const { t } = useTranslation();
  // ~ Modes
  const [appConfig] = useAppConfig();
  // ~ Filters
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const STUDIES_LIMIT = 101;
  const queryFilterValues = _getQueryFilterValues(searchParams);
  const [sessionQueryFilterValues, updateSessionQueryFilterValues] = useSessionStorage({
    key: 'queryFilterValues',
    defaultValue: queryFilterValues,
    // ToDo: useSessionStorage currently uses an unload listener to clear the filters from session storage
    // so on systems that do not support unload events a user will NOT be able to alter any existing filter
    // in the URL, load the page and have it apply.
    clearOnUnload: true,
  });
  const [filterValues, _setFilterValues] = useState({
    ...defaultFilterValues,
    ...sessionQueryFilterValues,
  });

  const debouncedFilterValues = useDebounce(filterValues, 200);
  const { resultsPerPage, pageNumber, sortBy, sortDirection } = filterValues;

  /*
   * The default sort value keep the filters synchronized with runtime conditional sorting
   * Only applied if no other sorting is specified and there are less than 101 studies
   */

  const canSort = studiesTotal < STUDIES_LIMIT;
  const shouldUseDefaultSort = sortBy === '' || !sortBy;
  const sortModifier = sortDirection === 'descending' ? 1 : -1;
  const defaultSortValues =
    shouldUseDefaultSort && canSort ? { sortBy: 'studyDate', sortDirection: 'descending' } : {};
  const sortedStudies = studies;

  if (canSort) {
    studies.sort((s1, s2) => {
      if (shouldUseDefaultSort) {
        // evibased, modifier depends on defaultSortValues.sortDirection
        let defaultSortModifier;
        if (defaultSortValues.sortDirection === 'descending') {
          defaultSortModifier = 1;
        } else {
          defaultSortModifier = -1;
        }
        return _sortStringDates(s1, s2, defaultSortModifier);
      }

      const s1Prop = s1[sortBy];
      const s2Prop = s2[sortBy];

      if (typeof s1Prop === 'string' && typeof s2Prop === 'string') {
        return s1Prop.localeCompare(s2Prop) * sortModifier;
      } else if (typeof s1Prop === 'number' && typeof s2Prop === 'number') {
        return (s1Prop > s2Prop ? 1 : -1) * sortModifier;
      } else if (!s1Prop && s2Prop) {
        return -1 * sortModifier;
      } else if (!s2Prop && s1Prop) {
        return 1 * sortModifier;
      } else if (sortBy === 'studyDate') {
        return _sortStringDates(s1, s2, sortModifier);
      }

      return 0;
    });
  }

  // ~ Rows & Studies
  const [expandedRows, setExpandedRows] = useState([]);
  const [studiesWithSeriesData, setStudiesWithSeriesData] = useState([]);
  const numOfStudies = studiesTotal;
  const querying = useMemo(() => {
    return isLoadingData || expandedRows.length > 0;
  }, [isLoadingData, expandedRows]);
  // evibased, timepoints state for selection values, manager
  const [timepointsState, setTimepointsState] = useState({});
  const [userListForTask, setUserListForTask] = useState([]);

  const setFilterValues = val => {
    if (filterValues.pageNumber === val.pageNumber) {
      val.pageNumber = 1;
    }
    _setFilterValues(val);
    updateSessionQueryFilterValues(val);
    setExpandedRows([]);
  };

  const onPageNumberChange = newPageNumber => {
    const oldPageNumber = filterValues.pageNumber;
    const rollingPageNumberMod = Math.floor(101 / filterValues.resultsPerPage);
    const rollingPageNumber = oldPageNumber % rollingPageNumberMod;
    const isNextPage = newPageNumber > oldPageNumber;
    const hasNextPage = Math.max(rollingPageNumber, 1) * resultsPerPage < numOfStudies;

    if (isNextPage && !hasNextPage) {
      return;
    }

    setFilterValues({ ...filterValues, pageNumber: newPageNumber });
  };

  const onResultsPerPageChange = newResultsPerPage => {
    setFilterValues({
      ...filterValues,
      pageNumber: 1,
      resultsPerPage: Number(newResultsPerPage),
    });
  };

  // Set body style
  useEffect(() => {
    document.body.classList.add('bg-black');
    return () => {
      document.body.classList.remove('bg-black');
    };
  }, []);

  useEffect(() => {
    // evibased, for manager, get user list for task assignment
    const fetchUserList = async () => {
      try {
        const url = new URL(appConfig['evibased']['keycloak_admin_url'] + '/realms/ohif/groups');
        const authHeader = userAuthenticationService.getAuthorizationHeader();
        const fetchOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader?.Authorization,
          },
        };
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
          console.log('failed to get group list');
          return;
        }
        const groups = await response.json();
        console.log('groups:', groups);
        const userList = [];
        for (const group of groups) {
          if (['doctor', 'data'].includes(group.name)) {
            const groupId = group.id;
            const groupName = group.name;
            const url = new URL(
              appConfig['evibased']['keycloak_admin_url'] + `/realms/ohif/groups/${groupId}/members`
            );
            const response = await fetch(url, fetchOptions);
            if (!response.ok) {
              console.log('failed to get group members');
              return;
            }
            const members = await response.json();
            // console.log('members:', members);
            members.forEach(member => {
              const label = `${member.username}(${groupName})`;
              userList.push({ value: member.username, label: label });
            });
          }
        }
        if (userList.length > 0) {
          setUserListForTask(userList);
        }
      } catch (ex) {
        console.warn(ex);
      }
    };
    if (ifManager) {
      fetchUserList();
    }
  }, [user]);

  // evibased, after filterValues changed, update URL query parameters
  // Sync URL query parameters with filters
  useEffect(() => {
    if (!debouncedFilterValues) {
      return;
    }

    const queryString = {};
    Object.keys(defaultFilterValues).forEach(key => {
      const defaultValue = defaultFilterValues[key];
      const currValue = debouncedFilterValues[key];

      // TODO: nesting/recursion?
      if (key === 'studyDate') {
        if (currValue.startDate && defaultValue.startDate !== currValue.startDate) {
          queryString.startDate = currValue.startDate;
        }
        if (currValue.endDate && defaultValue.endDate !== currValue.endDate) {
          queryString.endDate = currValue.endDate;
        }
      } else if (key === 'modalities' && currValue.length) {
        queryString.modalities = currValue.join(',');
      } else if (key === 'trialTimePointInfo') {
        // evibased, extract trialTimePointInfo number to 'TX'
        const match = currValue.match(/\d+/);
        queryString.trialTimePointId = match ? `${match[0]}` : '';
      } else if (key === 'timepointStatus') {
        // evibased, assign timepoint status when timepointStatus appears
        queryString[key] = currValue;
      } else if (currValue !== defaultValue) {
        queryString[key] = currValue;
      }
    });

    const search = qs.stringify(queryString, {
      skipNull: true,
      skipEmptyString: true,
    });

    navigate({
      pathname: '/',
      search: search ? `?${search}` : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilterValues]);

  // evibased, query series data for study after expanded row
  // Query for series information
  useEffect(() => {
    const fetchSeries = async studyInstanceUid => {
      try {
        const series = await dataSource.query.series.search(studyInstanceUid);
        seriesInStudiesMap.set(studyInstanceUid, sortBySeriesDate(series));
        setStudiesWithSeriesData([...studiesWithSeriesData, studyInstanceUid]);
      } catch (ex) {
        // TODO: UI Notification Service
        console.warn(ex);
      }
    };

    // TODO: WHY WOULD YOU USE AN INDEX OF 1?!
    // Note: expanded rows index begins at 1
    for (let z = 0; z < expandedRows.length; z++) {
      const expandedRowIndex = expandedRows[z] - 1;
      const studyInstanceUid = sortedStudies[expandedRowIndex].studyInstanceUid;

      if (studiesWithSeriesData.includes(studyInstanceUid)) {
        continue;
      }

      fetchSeries(studyInstanceUid);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedRows, studies]);

  // evibase, timepoints state update for selection values
  useEffect(() => {
    const newTimepointState = {};
    for (const study of studies) {
      const { studyInstanceUid, timepoint, tasks } = study;
      if (studyInstanceUid) {
        newTimepointState[studyInstanceUid] = {
          timepointStatus: timepoint?.status,
          tasks: tasks.map(task => {
            return {
              id: task?.id,
              type: task?.type,
              username: task?.username,
              status: task?.status,
            };
          }),
        };
      }
    }
    setTimepointsState(newTimepointState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studies]);

  const isFiltering = (filterValues, defaultFilterValues) => {
    return !isEqual(filterValues, defaultFilterValues);
  };
  // evibased, calculate front-end pagination
  const rollingPageNumberMod = Math.floor(101 / resultsPerPage);
  const rollingPageNumber = (pageNumber - 1) % rollingPageNumberMod;
  const offset = resultsPerPage * rollingPageNumber;
  const offsetAndTake = offset + resultsPerPage;
  const tableDataSource = sortedStudies.map((study, key) => {
    const rowKey = key + 1;
    const isExpanded = expandedRows.some(k => k === rowKey);
    const {
      studyInstanceUid,
      accession,
      modalities,
      instances,
      description,
      mrn, // evibased, patient id
      date,
      time,
      trialTimePointId,
      trialSubjectId,
      trialProtocolId,
      timepoint,
    } = study;
    const studyDate =
      date &&
      moment(date, ['YYYYMMDD', 'YYYY.MM.DD'], true).isValid() &&
      moment(date, ['YYYYMMDD', 'YYYY.MM.DD']).format(t('Common:localDateFormat', 'MMM-DD-YYYY'));
    const studyTime =
      time &&
      moment(time, ['HH', 'HHmm', 'HHmmss', 'HHmmss.SSS']).isValid() &&
      moment(time, ['HH', 'HHmm', 'HHmmss', 'HHmmss.SSS']).format(
        t('Common:localTimeFormat', 'hh:mm A')
      );
    // evibased,
    // deprecated, dicom tag trial id, remove "T" for old data, 现在没有前缀T
    let trialTimePointIdstr =
      (trialTimePointId && trialTimePointId.startsWith('T')
        ? trialTimePointId.slice(1)
        : trialTimePointId) || date;
    trialTimePointIdstr = timepoint ? String(timepoint.cycle) : trialTimePointIdstr; // use timepoint UID if exists instead of dicom tags
    const ifBaseline = trialTimePointIdstr === '0' || trialTimePointIdstr === '00';
    const trialTimePointName = getTimepointName(trialTimePointIdstr);
    // timepoint status
    let timepointStatusValue = timepointsState[studyInstanceUid]?.timepointStatus;
    const timepointStatus =
      timepointStatusMapping[timepointsState[studyInstanceUid]?.timepointStatus] || '未知';
    // task info
    let taskInfoStr = '';
    let taskExtendable = true;
    const tasks = timepointsState[studyInstanceUid]?.tasks || [];
    for (const task of tasks) {
      taskInfoStr += `${taskTypeMap[task.type]}(${task.username}): ${taskStatusMap[task.status]} <br>`;
    }
    if (ifDoctor) {
      // for doctor, only 1 task per study. 'create' task is extendable
      taskExtendable = tasks[0]?.status === 'create';
    }
    // task selections
    let usernameTask = timepointsState[studyInstanceUid]?.taskSelect?.username;
    let userTaskType = timepointsState[studyInstanceUid]?.taskSelect?.type;
    let taskDeleteById = null;

    return {
      dataCY: `studyRow-${studyInstanceUid}`,
      // evibased, columns defined for each study row
      row: [
        // {
        //   key: 'patientName',
        //   content: patientName ? (
        //     <TooltipClipboard>{patientName}</TooltipClipboard>
        //   ) : (
        //     <span className="text-gray-700">(Empty)</span>
        //   ),
        //   gridCol: 4,
        // },
        // {
        //   key: 'trialProtocolDescription',
        //   content: <TooltipClipboard>{trialProtocolDescription}</TooltipClipboard>,
        //   gridCol: 4,
        // },
        {
          key: 'trialProtocolId',
          content: <TooltipClipboard>{trialProtocolId}</TooltipClipboard>,
          gridCol: 4,
        },
        {
          key: 'mrn',
          content: <TooltipClipboard>{mrn}</TooltipClipboard>,
          gridCol: 3,
        },
        {
          key: 'trialTimePointInfo',
          content: <TooltipClipboard>{trialTimePointName}</TooltipClipboard>,
          gridCol: 3,
        },
        {
          key: 'timepointStatus',
          content: <span dangerouslySetInnerHTML={{ __html: timepointStatus }}></span>,
          gridCol: 2,
        },
        {
          key: 'studyDate',
          content: (
            <>
              {studyDate && <span className="mr-4">{studyDate}</span>}
              {studyTime && <span>{studyTime}</span>}
            </>
          ),
          title: `${studyDate || ''} ${studyTime || ''}`,
          gridCol: 5,
        },
        // {
        //   key: 'description',
        //   content: <TooltipClipboard>{description}</TooltipClipboard>,
        //   gridCol: 4,
        // },
        {
          key: 'taskInfo',
          content: <span dangerouslySetInnerHTML={{ __html: taskInfoStr }}></span>,
          gridCol: 4,
        },
        // {
        //   key: 'modality',
        //   content: modalities,
        //   title: modalities,
        //   gridCol: 3,
        // },
        // {
        //   key: 'accession',
        //   content: <TooltipClipboard>{accession}</TooltipClipboard>,
        //   gridCol: 3,
        // },
        // {
        //   key: 'instances',
        //   content: (
        //     <>
        //       <Icon
        //         name="group-layers"
        //         className={classnames('mr-2 inline-flex w-4', {
        //           'text-primary-active': isExpanded,
        //           'text-secondary-light': !isExpanded,
        //         })}
        //       />
        //       {instances}
        //     </>
        //   ),
        //   title: (instances || 0).toString(),
        //   gridCol: 2,
        // },
      ],
      // Todo: This is actually running for all rows, even if they are
      // not clicked on.
      expandedContent: (
        // evibased, expanded row content: series table and modes buttons
        <StudyListExpandedRow
          seriesTableColumns={{
            description: t('StudyList:Description'),
            seriesNumber: t('StudyList:Series'),
            modality: t('StudyList:Modality'),
            instances: t('StudyList:Instances'),
          }}
          seriesTableDataSource={
            seriesInStudiesMap.has(studyInstanceUid)
              ? seriesInStudiesMap.get(studyInstanceUid).map(s => {
                  return {
                    description: s.description || '(empty)',
                    seriesNumber: s.seriesNumber ?? '',
                    modality: s.modality || '',
                    instances: s.numSeriesInstances || '',
                  };
                })
              : []
          }
        >
          <div className="flex justify-between">
            {/* evibased: mode list builder */}
            <div className="flex flex-row gap-2">
              {(appConfig.groupEnabledModesFirst
                ? appConfig.loadedModes.sort((a, b) => {
                    const isValidA = a.isValidMode({
                      modalities: modalities.replaceAll('/', '\\'),
                      study,
                    }).valid;
                    const isValidB = b.isValidMode({
                      modalities: modalities.replaceAll('/', '\\'),
                      study,
                    }).valid;

                    return isValidB - isValidA;
                  })
                : appConfig.loadedModes
              ).map((mode, i) => {
                const modalitiesToCheck = modalities.replaceAll('/', '\\');

                const { valid: isValidMode, description: invalidModeDescription } =
                  mode.isValidMode({
                    modalities: modalitiesToCheck,
                    study,
                  });
                // TODO: Modes need a default/target route? We mostly support a single one for now.
                // We should also be using the route path, but currently are not
                // mode.routeName
                // mode.routes[x].path
                // Don't specify default data source, and it should just be picked up... (this may not currently be the case)
                // How do we know which params to pass? Today, it's just StudyInstanceUIDs and configUrl if exists
                return (
                  mode.displayName && (
                    // evibased, mode button and build url path for study
                    <Link
                      className={isValidMode ? '' : 'cursor-not-allowed'}
                      key={i}
                      // eviabsed, dynamically get the path for study
                      // to={`${dataPath ? '../../' : ''}${mode.routeName}${
                      //   dataPath || ''
                      // }?${query.toString()}`}
                      onClick={async event => {
                        // In case any event bubbles up for an invalid mode, prevent the navigation.
                        // For example, the event bubbles up when the icon embedded in the disabled button is clicked.
                        event.preventDefault();
                        // evibased, get the path for study
                        const query = new URLSearchParams();
                        if (filterValues.configUrl) {
                          query.append('configUrl', filterValues.configUrl);
                        }
                        let path = `${dataPath ? '../../' : ''}${mode.routeName}${dataPath || ''}?`;
                        if (ifBaseline) {
                          query.append('StudyInstanceUIDs', studyInstanceUid);
                        } else {
                          // get the last study uid for comparison mode
                          // const comparedStudy = await getStudyInfoByTrialId(dataSource, mrn, `T${trialId - 1}`);
                          const timepoints = timepoint?.subject?.timepoints;
                          if (!timepoints) {
                            query.append('StudyInstanceUIDs', studyInstanceUid);
                          } else {
                            const currentStudyIndex = timepoints.findIndex(
                              tp => tp.UID === studyInstanceUid
                            );
                            if (currentStudyIndex === -1) {
                              query.append('StudyInstanceUIDs', studyInstanceUid);
                            } else if (currentStudyIndex === 0) {
                              query.append('StudyInstanceUIDs', studyInstanceUid);
                            } else {
                              const comparedTimepointUID = timepoints[currentStudyIndex - 1].UID;
                              query.append(
                                'StudyInstanceUIDs',
                                studyInstanceUid + `,${comparedTimepointUID}`
                              );
                              query.append('hangingprotocolId', '@ohif/timepointCompare');
                            }
                          }
                        }
                        path += query.toString();
                        navigate(path);
                      }}
                    >
                      <Button
                        type={ButtonEnums.type.primary}
                        size={ButtonEnums.size.medium}
                        disabled={!isValidMode}
                        startIconTooltip={
                          !isValidMode ? (
                            <div className="font-inter flex w-[206px] whitespace-normal text-left text-xs font-normal text-white	">
                              {invalidModeDescription}
                            </div>
                          ) : null
                        }
                        startIcon={
                          <Icon
                            className="!h-[20px] !w-[20px] text-black"
                            name={isValidMode ? 'launch-arrow' : 'launch-info'}
                          />
                        } // launch-arrow | launch-info
                        onClick={() => {}}
                        dataCY={`mode-${mode.routeName}-${studyInstanceUid}`}
                        className={isValidMode ? 'text-[13px]' : 'bg-[#222d44] text-[13px]'}
                      >
                        {mode.displayName}
                      </Button>
                    </Link>
                  )
                );
              })}
            </div>
            {/* evibased: TODO: task manage here? */}
            {ifManager && (
              <div className="flex flex-row gap-2">
                <Select
                  id="timepointStatusSelect"
                  className="min-w-40"
                  placeholder="访视状态"
                  isClearable={false}
                  value={[timepointStatusValue]}
                  onChange={(newSelection, action) => {
                    console.info('newSelection:', newSelection, 'action:', action);
                    timepointStatusValue = newSelection ? newSelection.value : null;
                    console.info('new timepointStatusValue:', timepointStatusValue);
                  }}
                  options={timepointStatusOptions}
                />
                <Button
                  type={ButtonEnums.type.primary}
                  size={ButtonEnums.size.medium}
                  // startIcon={<Icon className="!h-[20px] !w-[20px] text-black" name={'task'} />}
                  onClick={async () => {
                    if (!timepointStatusValue) {
                      console.log('invalid timepoint status!');
                      return;
                    }
                    console.log('update timepoint status: ', timepoint, timepointStatusValue);
                    const newTimepoint = await _updateTimepointStatus(
                      timepoint.id,
                      timepointStatusValue,
                      appConfig.evibased['apiv2_timepoints_url']
                    );
                    if (!newTimepoint) {
                      console.log('fail to update timepoint status!');
                      return;
                    }
                    const newTimepointsState = { ...timepointsState };
                    newTimepointsState[studyInstanceUid].timepointStatus = timepointStatusValue;
                    setTimepointsState(newTimepointsState);
                    console.log('updated timepoint:', newTimepoint);
                  }}
                  dataCY={`timepoint-update-${studyInstanceUid}`}
                  className={'text-[13px]'}
                  // disabled={!timepointStatusValue} // evibased, 这里disabled无法实时更新
                >
                  更新访视状态
                </Button>
                <Select
                  id="usernameSelect"
                  className="min-w-40"
                  isClearable={false}
                  isSearchable={true}
                  placeholder="选择用户"
                  value={[usernameTask]}
                  onChange={(newSelection, action) => {
                    console.info('newSelection:', newSelection, 'action:', action);
                    usernameTask = newSelection ? newSelection.value : null;
                    console.info('new usernameTask:', usernameTask);
                  }}
                  options={userListForTask}
                  // options={[{ value: 'data', label: 'data' },
                  //           { value: 'jialei', label: 'jialei' },
                  //           { value: 'zhaoshijun', label: 'zhaoshijun' },
                  //           { value: 'quhaixian', label: 'quhaixian' },]}
                />
                <Select
                  id="taskTypeSelect"
                  className="min-w-40"
                  isClearable={false}
                  placeholder="任务类型"
                  value={[userTaskType]}
                  onChange={(newSelection, action) => {
                    console.info('newSelection:', newSelection, 'action:', action);
                    userTaskType = newSelection ? newSelection.value : null;
                    console.info('new userTaskType:', userTaskType);
                  }}
                  options={[
                    { value: 'review', label: '判读' },
                    { value: 'arbitration', label: '仲裁' },
                    { value: 'QC-data', label: '数据质控' },
                    { value: 'QC-report', label: '报告质控' },
                  ]}
                />
                <Button
                  type={ButtonEnums.type.primary}
                  size={ButtonEnums.size.medium}
                  onClick={async () => {
                    if (!usernameTask || !userTaskType) {
                      console.log('invalid username or task type!');
                      return;
                    }
                    // check if user and type exists in tasks
                    const taskFound = tasks.filter(
                      task => task.username === usernameTask && task.type === userTaskType
                    );
                    if (taskFound?.length > 0) {
                      console.log('task already exists!');
                      return;
                    }

                    console.log('create new task: ', usernameTask, userTaskType);
                    const newTask = await _createTask(
                      usernameTask,
                      userTaskType,
                      studyInstanceUid,
                      appConfig.evibased['apiv2_tasks_url']
                    );
                    if (!newTask) {
                      console.log('fail to create new task!');
                      return;
                    }
                    // update timepointsState
                    const newTimepointsState = { ...timepointsState };
                    newTimepointsState[studyInstanceUid].tasks.push(newTask);
                    newTimepointsState[studyInstanceUid].taskSelect = {
                      username: usernameTask,
                      type: userTaskType,
                    };
                    setTimepointsState(newTimepointsState);
                    console.log('new task:', newTask);
                  }}
                  dataCY={`task-add-${studyInstanceUid}`}
                  className={'text-[13px]'}
                  // disabled={!usernameTask || !userTaskType} // evibased, 这里disabled无法实时更新
                >
                  添加任务
                </Button>
                <Select
                  id="taskDeleteSelect"
                  isClearable={false}
                  isSearchable={true}
                  className="min-w-40"
                  placeholder="选择任务"
                  value={[taskDeleteById]}
                  onChange={(newSelection, action) => {
                    console.info('newSelection:', newSelection, 'action:', action);
                    taskDeleteById = newSelection ? newSelection.value : null;
                    console.info('new taskDeleteById:', taskDeleteById);
                  }}
                  options={tasks.map(task => {
                    return {
                      value: task.id,
                      label: `${task.username}-${taskTypeMap[task.type]}`,
                    };
                  })}
                />
                <Button
                  type={ButtonEnums.type.primary}
                  size={ButtonEnums.size.medium}
                  onClick={async () => {
                    if (!taskDeleteById) {
                      console.log('invalid task id!');
                      return;
                    }
                    console.log('delete task: ', taskDeleteById);
                    const success = await _deleteTask(
                      taskDeleteById,
                      appConfig.evibased['apiv2_tasks_url']
                    );
                    if (!success) {
                      console.log('fail to delete task!');
                      return;
                    }
                    const newTimepointsState = { ...timepointsState };
                    const newTasks = newTimepointsState[studyInstanceUid].tasks.filter(
                      task => task.id !== taskDeleteById
                    );
                    newTimepointsState[studyInstanceUid].tasks = newTasks;
                    setTimepointsState(newTimepointsState);
                    console.log('success delete task:', taskDeleteById);
                  }}
                  dataCY={`task-delete-${studyInstanceUid}`}
                  className={'text-[13px]'}
                  // disabled={!taskDeleteById} // evibased, 这里disabled无法实时更新
                >
                  删除任务
                </Button>
              </div>
            )}
          </div>
        </StudyListExpandedRow>
      ),
      onClickRow: () => {
        if (taskExtendable) {
          setExpandedRows(s => (isExpanded ? s.filter(n => rowKey !== n) : [...s, rowKey]))
        }
      },
      isExpanded,
      rowExtendable: taskExtendable, // evibased, control row expandable
    };
  });

  const hasStudies = numOfStudies > 0;
  const versionNumber = process.env.VERSION_NUMBER;
  const commitHash = process.env.COMMIT_HASH;

  // evibased, top menu options defined here
  const menuOptions = [
    // evibased, TODO: add evibased about like contact email etc.
    // {
    //   title: t('Header:About'),
    //   icon: 'info',
    //   onClick: () =>
    //     show({
    //       content: AboutModal,
    //       title: t('AboutModal:About OHIF Viewer'),
    //       contentProps: { versionNumber, commitHash },
    // containerDimensions: 'max-w-4xl max-h-4xl',
    //     }),
    // },
    {
      title: t('Header:Preferences'),
      icon: 'settings',
      onClick: () =>
        show({
          title: t('UserPreferencesModal:User preferences'),
          content: UserPreferences,
          contentProps: {
            hotkeyDefaults: hotkeysManager.getValidHotkeyDefinitions(hotkeyDefaults),
            hotkeyDefinitions,
            onCancel: hide,
            currentLanguage: currentLanguage(),
            availableLanguages,
            defaultLanguage,
            onSubmit: state => {
              if (state.language.value !== currentLanguage().value) {
                i18n.changeLanguage(state.language.value);
              }
              hotkeysManager.setHotkeys(state.hotkeyDefinitions);
              hide();
            },
            onReset: () => hotkeysManager.restoreDefaultBindings(),
            hotkeysModule: hotkeys,
          },
        }),
    },
  ];
  // evibased, add logout option to menu if oidc(Keycloak) enabled
  if (appConfig.oidc) {
    menuOptions.push({
      icon: 'power-off',
      title: t('Header:Logout'),
      onClick: () => {
        navigate(`/logout?redirect_uri=${encodeURIComponent(window.location.href)}`);
      },
    });
  }
  // evibased, upload dicom dialogue function, not used now
  const { customizationService } = servicesManager.services;
  const { component: dicomUploadComponent } =
    customizationService.get('dicomUploadComponent') ?? {};
  const uploadProps =
    dicomUploadComponent && dataSource.getConfig()?.dicomUploadEnabled
      ? {
          title: 'Upload files',
          closeButton: true,
          shouldCloseOnEsc: false,
          shouldCloseOnOverlayClick: false,
          content: dicomUploadComponent.bind(null, {
            dataSource,
            onComplete: () => {
              hide();
              onRefresh();
            },
            onStarted: () => {
              show({
                ...uploadProps,
                // when upload starts, hide the default close button as closing the dialogue must be handled by the upload dialogue itself
                closeButton: false,
              });
            },
          }),
        }
      : undefined;

  const { component: dataSourceConfigurationComponent } =
    customizationService.get('ohif.dataSourceConfigurationComponent') ?? {};

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* evibased, global header */}
      <Header
        isSticky
        menuOptions={menuOptions}
        isReturnEnabled={false}
        WhiteLabeling={appConfig.whiteLabeling}
        showPatientInfo={PatientInfoVisibility.DISABLED}
      />
      {/* evibased, investigational use dialog at bottom page, disabled in config */}
      <InvestigationalUseDialog dialogConfiguration={appConfig?.investigationalUseDialog} />
      {/* evibased, task/timepoints list */}
      <div className="ohif-scrollbar ohif-scrollbar-stable-gutter flex grow flex-col overflow-y-auto sm:px-5">
        {/* evibased, table header and filter functions */}
        <StudyListFilter
          numOfStudies={pageNumber * resultsPerPage > 100 ? 101 : numOfStudies}
          filtersMeta={filtersMeta}
          filterValues={{ ...filterValues, ...defaultSortValues }}
          onChange={setFilterValues}
          clearFilters={() => setFilterValues(defaultFilterValues)}
          isFiltering={isFiltering(filterValues, defaultFilterValues)}
          onUploadClick={uploadProps ? () => show(uploadProps) : undefined}
          getDataSourceConfigurationComponent={
            dataSourceConfigurationComponent ? () => dataSourceConfigurationComponent() : undefined
          }
          ifManager={ifManager}
          projects={projects}
        />
        {/* evibased, manager show list anyway to enable timepoints filtering */}
        {hasStudies || ifManager ? (
          <div className="flex grow flex-col">
            <StudyListTable
              tableDataSource={tableDataSource.slice(offset, offsetAndTake)}
              numOfStudies={numOfStudies}
              querying={querying}
              filtersMeta={filtersMeta}
            />
            <div className="grow">
              <StudyListPagination
                onChangePage={onPageNumberChange}
                onChangePerPage={onResultsPerPageChange}
                currentPage={pageNumber}
                perPage={resultsPerPage}
              />
            </div>
          </div>
        ) : (
          // evibased, loading or empty studies
          <div className="flex flex-col items-center justify-center pt-48">
            {appConfig.showLoadingIndicator && isLoadingData ? (
              <LoadingIndicatorProgress className={'h-full w-full bg-black'} />
            ) : (
              <EmptyStudies />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// evibased, get timepoint name, TODO: use extension utils
function getTimepointName(timepointId) {
  if (timepointId === null || timepointId === undefined) {
    return '未知';
  }
  let timepointName = timepointId;
  if (timepointId === '00' || timepointId === '0') {
    timepointName = '基线';
  } else if (timepointId.length === 3) {
    // the 3rd character is the unscheduled visit number
    const unscheduledVisitNumber = timepointId[2];
    timepointName = `访视${timepointId.slice(0, 2)}后计划外(${unscheduledVisitNumber})`;
  } else if (timepointId.length <= 2) {
    timepointName = `访视${timepointId}`;
  }
  return timepointName;
}

async function _updateTimepointStatus(timepointId, timepointStatus, timepointUrl) {
  const url = new URL(`${timepointUrl}/${timepointId}`);
  const body = {
    id: timepointId,
    status: timepointStatus,
  };
  const fetchOptions = {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      // Authorization: Authorization,
    },
    body: JSON.stringify(body),
  };
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const data = await response.text();
    throw new Error(`HTTP error! status: ${response.status} data: ${data}`);
  }
  return await response.json();
}

async function _createTask(usernameTask, userTaskType, studyInstanceUid, postTaskUrl) {
  const url = new URL(postTaskUrl);
  const body = {
    type: userTaskType,
    username: usernameTask,
    status: 'create',
    protocol: 'RECIST1.1',
    timepoint: {
      uid: studyInstanceUid,
    },
  };
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization: Authorization,
    },
    body: JSON.stringify(body),
  };
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const data = await response.text();
    throw new Error(`HTTP error! status: ${response.status} data: ${data}`);
  }
  const result = await response.json();
  return result;
}

async function _deleteTask(taskId, deleteTaskUrl) {
  const url = new URL(`${deleteTaskUrl}/${taskId}`);
  const fetchOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      // Authorization: Authorization,
    },
  };
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const data = await response.text();
    throw new Error(`HTTP error! status: ${response.status} data: ${data}`);
  }
  return true;
}

WorkList.propTypes = {
  data: PropTypes.array.isRequired,
  dataSource: PropTypes.shape({
    query: PropTypes.object.isRequired,
    getConfig: PropTypes.func,
  }).isRequired,
  isLoadingData: PropTypes.bool.isRequired,
  servicesManager: PropTypes.instanceOf(ServicesManager),
};

export const defaultFilterValues = {
  patientName: '',
  mrn: '',
  studyDate: {
    startDate: null,
    endDate: null,
  },
  description: '',
  modalities: [],
  accession: '',
  sortBy: '',
  sortDirection: 'none',
  pageNumber: 1,
  resultsPerPage: 25,
  datasources: '',
  configUrl: null,
  // evibased,
  trialProtocolDescription: '',
  trialTimePointInfo: '',
  timepointStatus: ['QC-data', 'reviewing', 'QC-report', 'arbitration'].join('+'), // manager filter timepoint status
  projectCode: null, // manager filter project
  taskInfo: ['create'], // task status filter
};

function _tryParseInt(str, defaultValue) {
  let retValue = defaultValue;
  if (str && str.length > 0) {
    if (!isNaN(str)) {
      retValue = parseInt(str);
    }
  }
  return retValue;
}

function _getQueryFilterValues(params) {
  const queryFilterValues = {
    patientName: params.get('patientname'),
    mrn: params.get('mrn'),
    studyDate: {
      startDate: params.get('startdate') || null,
      endDate: params.get('enddate') || null,
    },
    description: params.get('description'),
    modalities: params.get('modalities') ? params.get('modalities').split(',') : [],
    accession: params.get('accession'),
    sortBy: params.get('sortby'),
    sortDirection: params.get('sortdirection'),
    pageNumber: _tryParseInt(params.get('pagenumber'), undefined),
    resultsPerPage: _tryParseInt(params.get('resultsperpage'), undefined),
    datasources: params.get('datasources'),
    configUrl: params.get('configurl'),
  };

  // Delete null/undefined keys
  Object.keys(queryFilterValues).forEach(
    key => queryFilterValues[key] == null && delete queryFilterValues[key]
  );

  return queryFilterValues;
}

function _sortStringDates(s1, s2, sortModifier) {
  // TODO: Delimiters are non-standard. Should we support them?
  const s1Date = moment(s1.date, ['YYYYMMDD', 'YYYY.MM.DD'], true);
  const s2Date = moment(s2.date, ['YYYYMMDD', 'YYYY.MM.DD'], true);

  if (s1Date.isValid() && s2Date.isValid()) {
    return (s1Date.toISOString() > s2Date.toISOString() ? 1 : -1) * sortModifier;
  } else if (s1Date.isValid()) {
    return sortModifier;
  } else if (s2Date.isValid()) {
    return -1 * sortModifier;
  }
}

export default WorkList;
