// Request data in Express, Koa, Fastify, Next and the Fetch API (files that start with _ are helpers, not checks).
export const REQUEST_DATA = /\b(?:req|request)\.(?:params|query|body|headers|cookies)\b|\bctx\.(?:params|query|request)\b|\bsearchParams\.get\(|\bformData\.get\(/;
