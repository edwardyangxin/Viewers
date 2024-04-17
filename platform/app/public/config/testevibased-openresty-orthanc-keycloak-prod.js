window.config = {
  routerBasename: '/deep-response',
  investigationalUseDialog: {
    option: 'never',
  }, // OHIF investigational dialog popup, disable it
  whiteLabeling: {
    createLogoComponentFn: function(React, Link) {
      return React.createElement(
        Link,
        { to: "/", className: "text-2xl text-common-light" },
        React.createElement('img', {
          src: '/deep-response/xunzheng-logo.svg',
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
        wadoUriRoot: 'https://evi-based.com/pacs/dicom-web',
        qidoRoot: 'https://evi-based.com/pacs/dicom-web',
        wadoRoot: 'https://evi-based.com/pacs/dicom-web',
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
  ],
  // This is an array, but we'll only use the first entry for now
  oidc: [
    {
      // ~ REQUIRED
      // Authorization Server URL
      authority: 'https://evi-based.com/auth/realms/ohif',
      client_id: 'ohif-viewer',
      redirect_uri: '/callback/', // `OHIFStandaloneViewer.js`
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
    use_report_api: true,
    ping_url: 'https://evi-based.com/api/ping',
    audit_log_url: 'https://evi-based.com/api/log',
    report_upload_url: 'https://evi-based.com/api/report',
    report_fetch_url: 'https://evi-based.com/api/report',
    task_get_url: 'https://evi-based.com/api/task',
    task_update_url: 'https://evi-based.com/api/task',
    task_post_url: 'https://evi-based.com/api/task',
  },
};
