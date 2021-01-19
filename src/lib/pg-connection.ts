import { Pool, PoolClient, PoolConfig } from "pg";

export interface QueryOptions {
  sql: string;
  replacements?: Array<any>;
  transactionClient?: PoolClient;
}

export class PgConnection {
  private pool: Pool;

  constructor(config: PoolConfig, private logger?: (...messages: any[]) => void) {
    if (logger) config.log = this.logger;
    this.pool = new Pool(config);
  };

  async startTransaction(): Promise<PoolClient> {
    let transactionClient: PoolClient;
    try {
      transactionClient = await this.pool.connect();
      await transactionClient.query('BEGIN');
      return Promise.resolve(transactionClient);
    } catch (e) {
      if (transactionClient) transactionClient.release();
      return Promise.reject(e);
    }
  }

  async commit(transactionClient: PoolClient): Promise<void> {
    try {
      if (transactionClient) {
        await transactionClient.query('COMMIT');
        transactionClient.release();
        transactionClient = null;
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('Try to commit a not initialized transaction'));
      }
    }
    catch (e) {
      if (transactionClient) transactionClient.release();
      transactionClient = null;
      return Promise.reject(e);
    }
  }

  async rollback(transactionClient: PoolClient) {
    try {
      if (transactionClient) {
        await transactionClient.query('ROLLBACK');
        transactionClient.release();
        transactionClient = null;
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('Try to rollback a not initialized transaction'));
      }
    }
    catch (e) {
      if (transactionClient) transactionClient.release();
      transactionClient = null;
      return Promise.reject(e);
    }
  }

  async query(options: QueryOptions) {
    try {
      if (options.transactionClient) {
        return options.transactionClient.query(options.sql, options.replacements);
      } else {
        return this.pool.query(options.sql, options.replacements);
      }
    }
    catch (e) {
      return Promise.reject(e);
    }
  }

  async disconnect() {
    await this.pool.end();
  }
}