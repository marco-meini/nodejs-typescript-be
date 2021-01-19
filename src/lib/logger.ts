import * as moment from "moment";
import * as chalk from 'chalk';

export enum LogLevel {
  ERRORS = 1,
  WARNINGS = 2,
  INFO = 3,
  SQL = 4
}

export class Logger {
  private logLevel: LogLevel;
  constructor(logLevel: number) {
    this.logLevel = logLevel;
  }

  info(...args: Array<string>) {
    if (this.logLevel >= LogLevel.INFO) {
      let date = moment().format('YYYY-MM-DD HH:mm:ss');
      console.info(chalk.green('[', date, ']', ...args));
    }
  }

  error(...args: Array<string>) {
    if (this.logLevel >= LogLevel.ERRORS) {
      let date = moment().format('YYYY-MM-DD HH:mm:ss');
      console.error(chalk.red('[', date, ']', ...args));
    }
  }

  warning(...args: Array<string>) {
    if (this.logLevel >= LogLevel.WARNINGS) {
      let date = moment().format('YYYY-MM-DD HH:mm:ss');
      console.warn(chalk.yellow('[', date, ']', ...args));
    }
  }

  sql(sql: string) {
    if (this.logLevel >= LogLevel.SQL) {
      let date = moment().format('YYYY-MM-DD HH:mm:ss');
      console.info(chalk.cyan('[', date, ']', sql));
    }
  }
}