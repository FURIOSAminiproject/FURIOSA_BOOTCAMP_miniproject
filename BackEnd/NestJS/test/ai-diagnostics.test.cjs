const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Logger, ConsoleLogger } = require('@nestjs/common');
const { configuredGeminiClient } = require('../dist/chat/gemini-client');
const { aiErrorDiagnostic, createAiTrace, generateGeminiContent } = require('../dist/chat/ai-diagnostics');
const { ChatService } = require('../dist/chat/chat.service');
const { ItineraryRevisionService } = require('../dist/chat/itinerary-revision.service');
const { DestinationCurator } = require('../dist/route-explorer/destination-curator');

function capture(t) {
  const logs = [];
  const collect = message => logs.push(JSON.parse(message));
  Logger.overrideLogger({ log: collect, warn: collect, error: collect });
  t.after(() => Logger.overrideLogger(new ConsoleLogger()));
  return logs;
}

function environment(t, key = 'secret-environment-key', model = 'gemini-3.8-flash') {
  const previous = { GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_MODEL: process.env.GEMINI_MODEL };
  for (const [name, value] of Object.entries({ GEMINI_API_KEY: key, GEMINI_MODEL: model })) {
    if (value == null) delete process.env[name];
    else process.env[name] = value;
  }
  t.after(() => {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}

const itinerary = {
  arrivalDate: '2026-11-02', arrivalTime: '10:00', routePreference: 'recommended',
  days: [{ date: '2026-11-02', dayNumber: 1, title: 'private-day-title', notes: [], visits: [] }],
  stayOptions: [], warnings: [], curationSource: 'local',
};
const request = {
  message: 'private-user-message', history: [{ role: 'user', content: 'private-history' }],
  itinerary, destination: { latitude: 37.2, longitude: 127.1 }, mode: 'driving',
};
const { model: nativeModel } = require('./helpers/revision-model.cjs');
const model = generate => nativeModel(async req => {
  const r = await generate(req);
  try { const p = JSON.parse(r.text); r.text = JSON.stringify({ reason: 'clarification', ...p }); } catch {}
  return r;
});

test('configuration logs missing tables and permission errors, then selects the environment without leaking values', async t => {
  const logs = capture(t);
  environment(t);
  const queries = [];
  const client = await configuredGeminiClient({ query: async sql => {
    queries.push(sql);
    const error = new Error('private-db-password private-query');
    error.driverError = { code: queries.length === 1 ? '42P01' : '42501' };
    throw error;
  } });
  assert.equal(client.modelName, 'gemini-3.8-flash');
  assert.equal(queries.length, 2);
  assert.ok(queries.every(sql => sql.startsWith('SELECT ')));
  assert.deepEqual(logs.filter(log => log.event === 'ai_configuration_lookup_failed').map(log => [log.table, log.dbCode]), [
    ['app_model_config', '42P01'], ['ai_model_config', '42501'],
  ]);
  assert.equal(logs.at(-1).keySource, 'environment');
  assert.equal(new Set(logs.map(log => log.requestId)).size, 1);
  assert.doesNotMatch(JSON.stringify(logs), /secret-environment-key|private-db-password|private-query/);
});

test('configuration preserves app table precedence and records separate key and model sources', async t => {
  const logs = capture(t);
  environment(t);
  let calls = 0;
  const client = await configuredGeminiClient({ query: async () => {
    calls++;
    return [{ model_name: 'gemini-3.5-flash-lite', api_key: '' }];
  } });
  assert.equal(calls, 1);
  assert.equal(client.modelName, 'gemini-3.5-flash-lite');
  assert.equal(logs.at(-1).keySource, 'environment');
  assert.equal(logs.at(-1).modelSource, 'app_model_config');
});

test('restored ai_model_config selects its key and model and missing keys remain unavailable', async t => {
  const logs = capture(t);
  environment(t, null, null);
  const client = await configuredGeminiClient({ query: async sql => {
    if (sql.includes('FROM app_model_config ')) return [];
    return [{ api_key: 'secret-restored-key', model_name: 'gemini-3.5-flash-lite' }];
  } });
  assert.equal(client.modelName, 'gemini-3.5-flash-lite');
  assert.equal(logs.at(-1).keySource, 'ai_model_config');
  assert.equal(logs.at(-1).modelSource, 'ai_model_config');
  assert.doesNotMatch(JSON.stringify(logs), /secret-restored-key/);
  assert.equal(await configuredGeminiClient(), null);
  assert.equal(logs.at(-1).keyPresent, false);
});

test('429 diagnostics identify quota window, tier, limit and retry delay without provider message or credentials', async t => {
  const logs = capture(t);
  const error = new Error(JSON.stringify({ error: {
    code: 429, status: 'RESOURCE_EXHAUSTED', message: 'secret-api-key private-user-message',
    details: [
      { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{
        quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
        quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests', quotaValue: '0',
        quotaDimensions: { model: 'secret-api-key' },
      }] },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '12.5s' },
      { reason: 'secret-api-key' },
    ],
  } }));
  error.status = 429;
  const service = new ItineraryRevisionService();
  service.getGeminiClient = async () => model(async () => { throw error; });
  const result = await service.revise(request);
  assert.equal(result.changed, false);
  assert.equal(result.itinerary, null);
  const failed = logs.find(log => log.event === 'ai_provider_request_failed');
  assert.equal(failed.httpStatus, 429);
  assert.equal(failed.providerCode, 'RESOURCE_EXHAUSTED');
  assert.equal(failed.retryAfterSeconds, 12.5);
  assert.deepEqual(failed.quotaViolations, [{ window: 'day', resource: 'requests', tier: 'free', limit: '0' }]);
  assert.equal(logs.at(-1).stage, 'provider');
  assert.equal(new Set(logs.map(log => log.requestId)).size, 1);
  assert.doesNotMatch(JSON.stringify(logs), /secret-api-key|private-user-message|private-history|private-day-title/);
});

test('provider success logs finish and token counts while revision parse failures stay separate', async t => {
  const logs = capture(t);
  const service = new ItineraryRevisionService();
  service.getGeminiClient = async () => model(async () => ({
    text: 'private-invalid-response {', candidates: [{ finishReason: 'MAX_TOKENS' }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 10, totalTokenCount: 130 },
  }));
  const result = await service.revise(request);
  assert.equal(result.changed, false);
  const completed = logs.find(log => log.event === 'ai_provider_request_completed' && log.totalTokens === 130);
  assert.equal(completed.finishReason, 'MAX_TOKENS');
  assert.equal(completed.totalTokens, 130);
  assert.equal(logs.at(-1).stage, 'parse');
  assert.equal(logs.at(-1).errorCategory, 'invalid_json');
  assert.doesNotMatch(JSON.stringify(logs), /private-invalid-response|private-user-message|private-day-title/);
});

test('revision rejection logs unknown place and position without logging IDs or full proposals', async t => {
  const logs = capture(t);
  const service = new ItineraryRevisionService();
  service.getGeminiClient = async () => model(async () => ({ text: JSON.stringify({
    reply: 'private-model-reply', days: [{ date: '2026-11-02', visits: [
      { placeId: 'private-invented-place', kind: 'sightseeing', time: '11:00', durationMinutes: 60 },
    ] }],
  }) }));
  const result = await service.revise(request);
  assert.equal(result.changed, false);
  const rejected = logs.find(log => log.event === 'ai_revision_validation_rejected');
  assert.equal(rejected.reason, 'unknown_place');
  assert.equal(rejected.dayIndex, 0);
  assert.equal(rejected.visitIndex, 0);
  assert.doesNotMatch(JSON.stringify(logs), /private-invented-place|private-model-reply/);
});

test('kind repair logs safe type feedback and final success under the original request ID', async t => {
  const logs = capture(t);
  const place = { id: 'private-place-id', name: 'private-place-name', address: 'private-address', latitude: 37.2, longitude: 127.1, contentTypeId: 12, categoryName: '관광지', distanceMeters: 0 };
  const input = { ...request, itinerary: { ...itinerary, days: [{ ...itinerary.days[0], visits: [
    { place, kind: 'sightseeing', time: '11:00', endTime: '12:00', durationMinutes: 60, travelMinutes: 5 },
  ] }] } };
  const service = new ItineraryRevisionService();
  let calls = 0;
  service.getGeminiClient = async () => model(async () => ({ text: JSON.stringify({
    reply: 'private-reply', days: [{ date: '2026-11-02', visits: [{ placeId: place.id, kind: ++calls === 1 ? 'cafe' : 'sightseeing', time: '13:00', durationMinutes: 60 }] }],
  }) }));
  const result = await service.revise(input);
  assert.equal(result.changed, true);
  assert.equal(calls, 2);
  const rejected = logs.find(log => log.event === 'ai_revision_validation_rejected');
  assert.equal(rejected.requestedKind, 'cafe');
  assert.equal(rejected.contentTypeId, 12);
  assert.deepEqual(rejected.allowedKinds, ['sightseeing']);
  assert.equal(logs.find(log => log.event === 'ai_revision_repair_started').repairAttempt, 1);
  assert.equal(logs.at(-1).changed, true);
  assert.equal(new Set(logs.map(log => log.requestId)).size, 1);
  assert.doesNotMatch(JSON.stringify(logs), /private-place|private-address|private-user-message|private-reply/);
});

test('an empty proposal logs ordinary no-change and reply metadata without treating it as validation failure', async t => {
  const logs = capture(t);
  const service = new ItineraryRevisionService();
  service.getGeminiClient = async () => model(async () => ({ text: JSON.stringify({ reply: 'private-cafe-explanation', days: [] }) }));
  const result = await service.revise(request);
  assert.equal(result.changed, false);
  assert.ok(result.reply.includes('private-cafe-explanation'));
  assert.ok(logs.some(log => log.event === 'ai_revision_no_change' && log.reason === 'no_proposed_days'));
  assert.equal(logs.some(log => log.event === 'ai_revision_validation_rejected'), false);
  assert.equal(logs.at(-1).reason, 'no_proposed_days');
  assert.equal(logs.at(-1).modelReplyPresent, true);
  assert.equal(logs.at(-1).modelReplyLength, 'private-cafe-explanation'.length);
  assert.doesNotMatch(JSON.stringify(logs), /private-cafe-explanation|private-user-message/);
});

test('planner and curator log local fallback on the same upstream failure', async t => {
  const logs = capture(t);
  const failing = model(async () => { const error = new Error('secret-provider-details'); error.status = 429; throw error; });
  const planner = new ChatService();
  planner.getGeminiClient = async () => failing;
  const plan = await planner.planChat({ message: '서울에서 부산', currentDraft: {} });
  assert.equal(plan.modelUsed, 'local-nlp-fallback');
  assert.equal(plan.extracted.originName, '서울');
  assert.equal(logs.at(-1).event, 'ai_planner_completed');
  assert.equal(logs.at(-1).aiUsed, false);
  const curator = new DestinationCurator();
  curator.getGeminiClient = async () => failing;
  assert.deepEqual(await curator.choose({ departureTime: '09:00', startDate: '2026-11-02', mode: 'driving' }, 3600, {
    sights: [{ id: 'private-place', name: 'private-name' }], food: [], themed: [],
  }), []);
  assert.equal(logs.at(-1).event, 'ai_curation_completed');
  assert.equal(logs.at(-1).reason, 'error_fallback');
  assert.equal(new Set(logs.map(log => log.requestId)).size, 2);
  assert.doesNotMatch(JSON.stringify(logs), /secret-provider-details|private-place|private-name/);
});

test('diagnostics classify auth, schema and timeout and suppress unknown model/block metadata', async t => {
  const logs = capture(t);
  assert.equal(aiErrorDiagnostic({ status: 403 }).errorCategory, 'authentication_or_permission');
  assert.equal(aiErrorDiagnostic({ status: 400, message: 'invalid responseJsonSchema: private-value' }).schemaRelated, true);
  assert.equal(aiErrorDiagnostic({ name: 'AbortError' }).errorCategory, 'timeout');
  await generateGeminiContent({ ...model(async () => ({
    candidates: [{ finishReason: 'secret-finish' }], promptFeedback: { blockReason: 'secret-block' },
  })), modelName: 'secret-invalid-model' }, { model: 'secret-invalid-model', contents: 'private-prompt' }, createAiTrace('chat'));
  assert.equal(logs[0].model, 'unrecognized_model_name');
  assert.equal(logs[1].finishReason, 'OTHER');
  assert.equal(logs[1].blockReason, 'OTHER');
  assert.doesNotMatch(JSON.stringify(logs), /secret-|private-/);
});
