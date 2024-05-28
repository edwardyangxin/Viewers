/**
 * evibased, init for extension
 * 1. sub to log events and perform logging sinking
 * @param {Object} servicesManager
 * @param {Object} configuration
 */
export default function init({ servicesManager, configuration = {}, commandsManager }): void {
  const { logSinkService } = servicesManager.services;

  const handleLogAction = ({ action, msg, data, username, authHeader, level }) => {
    // Perform logging
    logSinkService.logAction(action, msg, data, username, authHeader, level);
  };

  // sub to log events and perform logging
  logSinkService.subscribe(logSinkService.EVENTS.LOG_ACTION, handleLogAction);
}
