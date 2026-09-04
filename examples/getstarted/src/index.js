'use strict';

module.exports = {
  register() {},

  /**
   * @param {{ strapi: any }} params
   */
  async bootstrap(params) {
    const { strapi } = params;

    console.log('🛠️  Initializing Job-Post Ingestion Service...');

    const runScanner = async () => {
      try {
        console.log('📡 Connecting to Hacker News API...');
        const response = await fetch(
          'https://hn.algolia.com/api/v1/search?query=hiring&tags=story&hitsPerPage=15'
        );

        if (!response.ok) {
          throw new Error(`Hacker News API request failed with status ${response.status}`);
        }

        const payload = await response.json();

        /** @type {Array<{ objectID: string | number; title?: string; url?: string }>} */
        const hits = Array.isArray(payload?.hits) ? payload.hits : [];

        const ingestor = strapi.service('api::job-post.ingestor');

        if (!ingestor) {
          throw new Error(
            'Ingestor service not found. Check your file path: src/api/job-post/services/ingestor.js'
          );
        }

        console.log(`Processing ${hits.length} items...`);
        const results = await Promise.all(
          hits.map(
            /**
             * @param {{ objectID: string | number; title?: string; url?: string }} hit
             */
            (hit) => ingestor.syncOne(hit)
          )
        );

        console.table({
          Total: results.length,
          Created: results.filter((result) => result.status === 'created').length,
          Skipped: results.filter((result) => result.status === 'skipped').length,
          Failed: results.filter((result) => result.status === 'failed').length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ Scanner Execution Failed:', message);
      }
    };

    await runScanner();
  },
};
