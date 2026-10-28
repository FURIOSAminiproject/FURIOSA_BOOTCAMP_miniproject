const {test}=require('node:test');
const assert=require('node:assert/strict');
const {weatherDates,parseWeatherPrediction,fetchWeatherPrediction}=require('../src/services/weatherPredictionService.ts');
const destination={name:'검증 목적지',latitude:37,longitude:127};
const dates=['2026-11-01','2026-11-02'];
const forecast=()=>({status:'success',locality_name:'검증지역_검증도',forecasts:dates.map(target_date=>({target_date,TA_AVG:15.125,TA_MIN:9.25,TA_MAX:20.5,RN_DAY:3.75,WS_AVG:2.5}))});
test('requested dates are exact, valid and limited to 31 days',()=>{
 assert.deepEqual(weatherDates(...dates),dates);
 for(const pair of [['2026-02-30','2026-03-01'],['2026-11-02','2026-11-01'],['2026-11-01','2026-12-02'],['','']]) assert.throws(()=>weatherDates(...pair));
});
test('only actual model metrics are mapped without fabricated probabilities or confidence',()=>{
 const result=parseWeatherPrediction(forecast(),destination.name,dates);
 assert.equal(result.source,'model-api');assert.equal(result.dailyForecast[0].avgTemp,15.125);assert.equal(result.dailyForecast[0].rainfallMm,3.75);
 assert.equal(result.dailyForecast[0].precipProbability,undefined);assert.equal(result.inferenceConfidence,undefined);
});
test('incomplete, duplicate, wrong-date and non-finite predictions cannot be displayed',()=>{
 const invalid=[];
 let x=forecast();x.forecasts.pop();invalid.push(x);
 x=forecast();delete x.forecasts[0].TA_AVG;invalid.push(x);
 x=forecast();x.forecasts[0].TA_MIN=NaN;invalid.push(x);
 x=forecast();x.forecasts[0].TA_MAX='20.5';invalid.push(x);
 x=forecast();x.forecasts[1].target_date=dates[0];invalid.push(x);
 x=forecast();x.forecasts[0].target_date='2026-12-01';invalid.push(x);
 x=forecast();x.forecasts[0].RN_DAY=-1;invalid.push(x);
 x=forecast();x.forecasts[0].TA_MIN=30;invalid.push(x);
 for(const value of invalid)assert.throws(()=>parseWeatherPrediction(value,destination.name,dates));
});
test('request calls real prediction endpoint and transmits exact coordinates and dates',async()=>{
 const original=global.fetch;
 try{global.fetch=async(url,options)=>{
  assert.equal(url,'/fastapi/api/v1/weather/predict/request');
  assert.deepEqual(JSON.parse(options.body),{destination_name:destination.name,latitude:37,longitude:127,target_dates:dates});
  return {ok:true,json:async()=>forecast()};
 };const result=await fetchWeatherPrediction(destination,...dates);assert.equal(result.dailyForecast.length,2);
 }finally{global.fetch=original;}
});
test('server errors never fall back to a simulated or cached report',async()=>{
 const original=global.fetch,stored=global.localStorage;
 try{global.localStorage={getItem:()=>JSON.stringify({dailyForecast:[{avgTemp:99}]})};
 for(const status of [404,422,500]){global.fetch=async()=>({ok:false,status});await assert.rejects(fetchWeatherPrediction(destination,...dates));}
 global.fetch=async()=>{throw new TypeError('network failed')};await assert.rejects(fetchWeatherPrediction(destination,...dates));
 }finally{global.fetch=original;global.localStorage=stored;}
});
test('aborted requests remain canceled and never produce a forecast',async()=>{
 const original=global.fetch;const controller=new AbortController();controller.abort();
 try{global.fetch=async(_url,{signal})=>{signal.throwIfAborted()};await assert.rejects(fetchWeatherPrediction(destination,...dates,controller.signal),{name:'AbortError'});}finally{global.fetch=original;}
});
