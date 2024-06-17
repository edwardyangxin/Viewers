// apiv2, graphql
async function getTaskByUserAndUID(
  graphqlURL,
  Authorization,
  username: string,
  studyUID: string,
  status = 'create'
) {
  const url = new URL(graphqlURL);
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  const graphql = JSON.stringify({
    query: `query GetUserTask {
      tasks(
        timepointUID: "${studyUID}",
        search: "username:${username},status:${status}"
      ) {
        id
        username
        timepoint {
          UID
          cycle
          comment
          id
          status
          series
          subject {
            subjectId
            disease
            history
            comment
            timepoints {
              UID
              cycle
              status
              series
            }
          }
        }
        type
        userAlias
        status
        comment
      }
    }`,
    variables: {},
  });
  const requestOptions = {
    method: 'POST',
    headers: headers,
    body: graphql,
  };
  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP error! status: ${response.status} body: ${body}`);
  }
  let userTasks = [];
  const body = await response.json();
  if (response.status >= 200 && response.status < 300) {
    userTasks = body.data.tasks;
  } else {
    console.error(`HTTP error! status: ${response.status} body: ${body}`);
  }
  return userTasks;
}

async function getTimepointByUID(graphqlURL, Authorization, studyUID) {
  const url = new URL(graphqlURL);
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  const graphql = JSON.stringify({
    query: `query GetTimepointByUID {
      timepointByUID(
        UID: "${studyUID}"
      ) {
        UID
        cycle
        comment
        id
        status
        subject {
          subjectId
          disease
          history
          comment
          timepoints {
            UID
            cycle
            status
          }
        }
      }
    }`,
    variables: {},
  });
  const requestOptions = {
    method: 'POST',
    headers: headers,
    body: graphql,
  };
  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP error! status: ${response.status} body: ${body}`);
  }
  let timepoint;
  const body = await response.json();
  if (response.status >= 200 && response.status < 300) {
    timepoint = body.data.timepointByUID;
  } else {
    console.error(`HTTP error! status: ${response.status} body: ${body}`);
  }
  return timepoint;
}

async function getUserSubjectData(graphqlURL, Authorization, username, subjectId, currentTask) {
  const ifReviewTask = currentTask ? ['review', 'reading'].includes(currentTask.type) : false;
  const ifQCDataTask = currentTask ? 'QC-data' === currentTask.type : false;
  // get all subject related tasks and reports
  // get url headers and body
  const url = new URL(graphqlURL);
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  // if filter by task username
  let queryStr;
  if (ifReviewTask) {
    // review task only see own reports
    queryStr = `query GetAllReports {
      subjectBySubjectId(subjectId: "${subjectId}", usernameTask: "${username}") `;
  } else if (ifQCDataTask) {
    // QC-data task only see own reports
    queryStr = `query GetAllReports {
      subjectBySubjectId(subjectId: "${subjectId}", usernameTask: "${username}") `;
  } else {
    // other see all reports
    queryStr = `query GetAllReports {
      subjectBySubjectId(subjectId: "${subjectId}") `;
  }
  const graphqlBody = JSON.stringify({
    query:
      queryStr +
      `{
        subjectId
        history
        disease
        timepoints {
          UID
          cycle
          status
          tasks {
            id
            type
            username
            status
            userAlias
            report {
              SOD
              createTime
              id
              measurements
              nonTargetResponse
              reportTemplate
              reportTemplateVersion
              reportVersion
              response
              targetResponse
              username
              imageQuality
              arbitrationComment
              reviewComment
              QCDataComment
              reportRef {
                task {
                  userAlias
                  username
                  status
                  type
                }
              }
            }
          }
        }
      }
    }`,
    variables: {},
  });
  const requestOptions = {
    method: 'POST',
    headers: headers,
    body: graphqlBody,
    // redirect: "follow"
  };
  const response = await fetch(url, requestOptions);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP error! status: ${response.status} body: ${body}`);
  }
  let subjectData;
  const body = await response.json();
  if (response.status >= 200 && response.status < 300) {
    subjectData = body.data.subjectBySubjectId;
  } else {
    throw new Error(`HTTP error! status: ${response.status} body: ${body}`);
  }
  return subjectData;
}

async function modifySeriesTag(
  apiv2TimepointsURL,
  username,
  Authorization,
  StudyInstanceUID,
  SeriesInstanceUID,
  tag
) {
  const modifySeriesUrl = new URL(
    apiv2TimepointsURL + `/${StudyInstanceUID}/modifySeries/${username}`
  );
  const reportResponse = await fetch(modifySeriesUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // Authorization: authHeader?.Authorization,
    },
    body: JSON.stringify({
      [SeriesInstanceUID]: tag,
    }),
  });
  if (!reportResponse.ok) {
    const body = await reportResponse.text();
    throw new Error(`HTTP error! status: ${reportResponse.status} body: ${body}`);
  }
  const timepoint = await reportResponse.json();
  return timepoint;
}

export { getTaskByUserAndUID, getTimepointByUID, getUserSubjectData, modifySeriesTag };
