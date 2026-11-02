// 기존 검증 회귀도 실제 도구 프로토콜을 거쳐 실행한다. 호출 기록에는 최종안 생성만 기록.
const wire = (payload, metadata = {}) => ({ ...metadata, candidates: [{ ...metadata.candidates?.[0],
  content: { role: 'model', parts: [{ text: typeof payload === 'string' ? payload : JSON.stringify(payload) }] } }] });
const call = (name, args = {}, id = 'call-1') => ({ candidates: [{ content: { role: 'model',
  parts: [{ functionCall: { name, args, id }, thoughtSignature: 'test-signature' }] } }] });
function model(generate) {
  let read = false;
  return { modelName: 'revision-test', ai: { models: { generateContent: async request => {
    if (!read && request.config?.tools) { read = true; return call('get_current_itinerary'); }
    const response = await generate(request);
    if (request.config?.tools || read) return wire(response.text ?? '', response);
    return response;
  } } } };
}
module.exports = { wire, call, model };
