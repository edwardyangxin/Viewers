async function getTaskByUserAndUID(
  url,
  Authorization,
  username: string,
  studyUID: string,
  status = 'create'
) {
  const getTaskResponse = await fetch(
    `${url}?username=${username}&StudyInstanceUID=${studyUID}&status=${status}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: Authorization,
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
  return tasks;
}

export { getTaskByUserAndUID };
