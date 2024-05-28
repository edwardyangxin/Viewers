import { PubSubService } from '../_shared/pubSubServiceInterface';
import { ExtensionManager } from '../../extensions';

const EVENTS = {
  LOG_ACTION: 'event::log_action',
  LOG_ERROR: 'event::log_error',
};

type Obj = Record<string, string>;

/**
 * evibased, LogSinkService, log sink to send logs to a remote backend
 */
export default class LogSinkService extends PubSubService {
  public static REGISTRATION = {
    name: 'logSinkService',
    altName: 'LogSinkService',
    create: ({ configuration = {} }) => {
      return new LogSinkService({ configuration });
    },
  };
  extensionManager: ExtensionManager;
  configuration: Obj;

  constructor({ configuration }) {
    super(EVENTS);
    this.configuration = configuration || {};
  }

  public init(extensionManager: ExtensionManager): void {
    // when this is called?
    this.extensionManager = extensionManager;
  }

  public onModeExit(): void {
    // doing anything On mode exit?
  }

  public async logAction(
    action: string,
    msg: string,
    data: Obj,
    username,
    authHeader,
    level = 'i'
  ): Promise<boolean> {
    const logToBackend = this.configuration?.backend_log;
    if (!logToBackend) {
      console.log('LogSinkService(To Console) logAction:', level, action, data, username);
      return true;
    }
    try {
      const auditLogUrl = this.configuration?.audit_log_url;
      // body
      const auditLogBody = {
        msg: msg,
        level: level,
        username: username,
        action: action,
        data: data,
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
      // response data
      const responseData = await auditResponse.json();
      console.log('Audit response data:', responseData);
      return true;
    } catch (error) {
      console.error('Error performing audit log:', error);
      return false;
    }
  }
}
