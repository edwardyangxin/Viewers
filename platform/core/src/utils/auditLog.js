async function performAuditLog(
  _appConfig,
  userAuthenticationService,
  auditLevel,
  auditMsg,
  auditLogBodyMeta
) {
  try {
    const auditLogUrl = _appConfig['evibased']['audit_log_url'];
    // get username
    const user = userAuthenticationService.getUser();
    let username = 'unknown';
    if (user) {
      username = user.profile.preferred_username;
    }
    // get Authorization
    const authHeader = userAuthenticationService.getAuthorizationHeader();
    // body
    const auditLogBody = {
      level: auditLevel,
      msg: auditMsg,
      username: username,
      meta: auditLogBodyMeta,
    };
    // fetch
    const auditResponse = await fetch(auditLogUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader?.Authorization,
      },
      body: JSON.stringify(auditLogBody),
    });

    if (!auditResponse.ok) {
      const body = await auditResponse.text();
      throw new Error(`HTTP error! status: ${auditResponse.status} body: ${body}`);
    }
    // Do something with the successful audit response, if needed
    const responseData = await auditResponse.json();
    console.log('Audit response data:', responseData);
  } catch (error) {
    console.error('Error performing audit log:', error);
  }
}

export default performAuditLog;
