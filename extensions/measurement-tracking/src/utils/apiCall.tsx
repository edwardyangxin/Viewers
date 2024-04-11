async function getTaskByUserAndUID(
  getTaskUrl,
  Authorization,
  username: string,
  studyUID: string,
  status = 'create'
) {
  const url = new URL(getTaskUrl);
  const fetchSearchParams = {
    username: username,
    StudyInstanceUID: studyUID,
    status: status,
  };
  url.search = new URLSearchParams(fetchSearchParams).toString();
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: Authorization,
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
  return tasks;
}

export { getTaskByUserAndUID };
