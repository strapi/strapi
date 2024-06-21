import { Readable } from 'stream';
import { isFinite } from 'lodash/fp';
import type { Knex } from 'knex';
import type { QueryBuilder } from '../../query-builder';
import type { Database } from '../../..';

import { applyPopulate } from '../populate';
import { fromRow } from '../transform';
import { Meta } from '../../../metadata';

const knexQueryDone = Symbol('knexQueryDone');
const knexPerformingQuery = Symbol('knexPerformingQuery');

interface ReadableStrapiQueryOptions {
  qb: QueryBuilder;
  uid: string;
  db: Database;
  mapResults?: boolean;
  batchSize?: number;
}

class ReadableStrapiQuery extends Readable {
  _offset: number;

  _limit: number | null;

  _fetched: number;

  _query: Knex.QueryBuilder;

  _qb: QueryBuilder;

  _db: Database;

  _uid: string;

  _meta: Meta;

  _batchSize: number;

  _mapResults: boolean;

  [knexPerformingQuery]: boolean;

  constructor({ qb, db, uid, mapResults = true, batchSize = 500 }: ReadableStrapiQueryOptions) {
    super({ objectMode: true, highWaterMark: batchSize });

    // Extract offset & limit from the query-builder's state
    const { offset, limit } = qb.state;

    // Original offset value
    this._offset = isFinite(offset) ? Number(offset) : 0;

    // Max amount of entities to fetch, force null as undefined value
    this._limit = isFinite(limit) ? Number(limit) : null;

    // Total amount of entities fetched
    this._fetched = 0;

    /**
     * Original query
     */
    this._query = qb.getKnexQuery();

    // Query Builder instance
    this._qb = qb;

    // Database related properties
    this._db = db;
    this._uid = uid;
    this._meta = db.metadata.get(uid);

    // Stream params
    this._batchSize = batchSize;
    this._mapResults = mapResults;

    // States
    this[knexPerformingQuery] = false;
  }

  _destroy(err: Error, cb: (err?: Error) => void) {
    // If the stream is destroyed while a query is being made, then wait for a
    // kQueryDone event to be emitted before actually destroying the stream
    if (this[knexPerformingQuery]) {
      this.once(knexQueryDone, (er) => cb(err || er));
    } else {
      cb(err);
    }
  }

  /**
   * Custom ._read() implementation
   *
   *  NOTE: Here "size" means the number of entities to be read from the database.
   *  Not the actual byte size, as it would mean that we need to return partial entities.
   *
   */
  async _read(size: number) {
    const query = this._query;

    // Remove the original offset & limit properties from the query
    // Theoretically, they would be replaced by calling them again, but this is just to be sure
    query.clear('limit').clear('offset');

    // Define the maximum read size based on the limit and the requested size
    // NOTE: size is equal to _batchSize by default. Since we want to allow customizing it on
    // the fly, we need to use its value instead of batchSize when computing the maxReadSize value
    const maxReadSize =
      // if no limit is defined in the query, use the given size,
      // otherwise, use the smallest value between the two
      this._limit === null ? size : Math.min(size, this._limit);

    // Compute the limit for the next query
    const limit =
      // If a limit is defined
      this._limit !== null &&
      // And reading `maxReadSize` would fetch too many entities (> _limit)
      this._fetched + maxReadSize > this._limit
        ? // Then adjust the limit so that it only get the remaining entities
          this._limit - this._fetched
        : // Else, use the max read size
          maxReadSize;

    // If we don't have anything left to read (_limit === _fetched),
    // don't bother making the query and end the stream by pushing null
    if (limit <= 0) {
      this.push(null);
      return;
    }

    // Compute the offset (base offset + number of entities already fetched)
    const offset = this._offset + this._fetched;

    // Update the query with the new values (offset + limit)
    query.offset(offset).limit(limit);

    // Lock the ._destroy()
    this[knexPerformingQuery] = true;

    let results;
    let count;
    let err;

    try {
      // Execute the query and store the results & count
      results = await query;

      const { populate } = this._qb.state;

      // Applies the populate if needed
      if (populate) {
        await applyPopulate(results, populate, { qb: this._qb, uid: this._uid, db: this._db });
      }

      // Map results if asked to
      if (this._mapResults) {
        results = fromRow(this._meta, results);
      }

      count = results.length;
    } catch (e) {
      err = e;
    }

    // Unlock the ._destroy()
    this[knexPerformingQuery] = false;

    // Tell ._destroy() that it's now safe to close the db connection
    if (this.destroyed) {
      this.emit(knexQueryDone);
      return;
    }

    // If there is an error, destroy with the given error
    if (err) {
      this.destroy(err as Error);
      return;
    }

    // Update the amount of fetched entities
    this._fetched += count;

    // While there is at least one value to unpack
    for (const result of results) {
      this.push(result);
    }

    // If the amount of fetched entities is smaller than the
    // maximum read size, Then push null to close the stream
    if (this._fetched === this._limit || count < this._batchSize) {
      this.push(null);
    }
  }
}

export default ReadableStrapiQuery;
