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

// deprecated
// async function getTaskByUserAndUID_v1(
//   getTaskUrl,
//   Authorization,
//   username: string,
//   studyUID: string,
//   status = 'create'
// ) {
//   const url = new URL(getTaskUrl);
//   const fetchSearchParams = {
//     username: username,
//     StudyInstanceUID: studyUID,
//     status: status,
//   };
//   url.search = new URLSearchParams(fetchSearchParams).toString();
//   const fetchOptions = {
//     method: 'GET',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: Authorization,
//     },
//   };
//   const response = await fetch(url, fetchOptions);
//   if (!response.ok) {
//     const data = await response.text();
//     throw new Error(`HTTP error! status: ${response.status} data: ${data}`);
//   }
//   let tasks = [];
//   if (response.status === 204) {
//     // no content
//   } else {
//     const data = await response.json();
//     tasks = Array.isArray(data) ? data : [data];
//   }
//   return tasks;
// }

export { getTaskByUserAndUID };
