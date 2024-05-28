window.config = {
  routerBasename: '/',
  investigationalUseDialog: {
    option: 'never',
  }, // OHIF investigational dialog popup, disable it
  whiteLabeling: {
    createLogoComponentFn: function(React, Link) {
      return React.createElement(
        Link,
        { to: "/", className: "text-2xl text-common-light" },
        React.createElement('img', {
          src: './xunzheng-logo.svg',
          className: 'inline',
          alt: 'Logo',
        }),
        '浔正医疗 EVI-BASED'
      );
    },
  },
  showStudyList: true,
  extensions: [],
  modes: [],
  // below flag is for performance reasons, but it might not work for all servers
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  defaultDataSourceName: 'dicomweb',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'Orthanc Server',
        name: 'Orthanc',
        wadoUriRoot: '/dicom-web',
        qidoRoot: '/dicom-web',
        wadoRoot: '/dicom-web',
        qidoSupportsIncludeField: true,
        supportsReject: true,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: true,
        supportsWildcard: true,
        dicomUploadEnabled: true,
        bulkDataURI: {
          enabled: true,
        },
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: {
        friendlyName: 'dicom json',
        name: 'json',
      },
    },
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
      sourceName: 'dicomlocal',
      configuration: {
        friendlyName: 'dicom local',
      },
    },
  ],
  // This is an array, but we'll only use the first entry for now
  oidc: [
    {
      // ~ REQUIRED
      // Authorization Server URL
      authority: 'http://localhost:3000/auth/realms/ohif',
      client_id: 'ohif-viewer',
      redirect_uri: 'http://localhost:3000/callback', // `OHIFStandaloneViewer.js`
      // "Authorization Code Flow"
      // Resource: https://medium.com/@darutk/diagrams-of-all-the-openid-connect-flows-6968e3990660
      response_type: 'code',
      scope: 'openid', // email profile openid
      // ~ OPTIONAL
      post_logout_redirect_uri: '/logout-redirect.html',
    },
  ],
  // evibased, config
  evibased: {
    use_report_api: true, // deprecated
    ping_url: 'http://localhost:3000/api/ping', // no use now
    audit_log_url: 'http://localhost:3000/api/log',
    report_upload_url: 'http://localhost:3000/api/report', // deprecated
    report_fetch_url: 'http://localhost:3000/api/report', // deprecated
    task_get_url: 'http://localhost:3000/api/task', // deprecated
    task_update_url: 'http://localhost:3000/api/task', // deprecated
    task_post_url: 'http://localhost:3000/api/task', // deprecated
    apiv2_tasks_url: 'http://localhost:3000/api-v2/api/tasks',
    apiv2_reports_url: 'http://localhost:3000/api-v2/api/reports',
    apiv2_timepoints_url: 'http://localhost:3000/api-v2/api/timepoints',
    timepoint_get_url: 'http://localhost:3000/api-v2/api/timepoints/search',
    graphqlDR: 'http://localhost:3000/api-v2/graphql-dr/graphql',
    keycloak_admin_url: 'http://localhost:3000/auth/admin',
  },
  logSinkService: {
    backend_log: true,
    audit_log_url: 'http://localhost:3000/api/log',
  },
};
