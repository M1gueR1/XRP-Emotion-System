import pino from 'pino';
import { StorageKeys } from '@utils/localstorage';

const getLogLevel = () => {
  const level = localStorage.getItem(StorageKeys.LOGLEVEL);
  return level ? level : 'info';
};


// Create a logging instance
export const logger = pino({
    level: getLogLevel(),
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    redact: {
      paths: [],
    },
    transport: {
        target: 'pino-pretty'
    },
    timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
    browser: {
        asObject: true,
      },
  });

export default logger;