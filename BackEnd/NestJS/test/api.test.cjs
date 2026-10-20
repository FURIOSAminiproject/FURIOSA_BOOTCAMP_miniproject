const {test}=require('node:test');
const assert=require('node:assert/strict');
require('reflect-metadata');
const {Test}=require('@nestjs/testing');
const {DataSource}=require('typeorm');
const {AppModule}=require('../dist/app.module');
const {configureApp}=require('../dist/configure-app');
const {getRepositoryToken}=require('@nestjs/typeorm');
const {User}=require('../dist/users/entities/user.entity');
test('travel APIs preserve fallback behavior and reject invalid inputs', async()=>{
  delete process.env.GEMINI_API_KEY;
  process.env.JWT_SECRET='offline-api-test-secret-at-least-32-characters';
  Object.assign(process.env,{DB_HOST:'127.0.0.1',DB_PORT:'5432',DB_NAME:'api_test',DB_USER:'test',DB_PASSWORD:'test',DB_SSL:'false'});
  const module = await Test.createTestingModule({imports:[AppModule]})
    .overrideProvider(getRepositoryToken(User)).useValue({})
    .overrideProvider(DataSource).useValue({isInitialized:true,query:async()=>[{value:1}],destroy:async()=>{}}).compile();
  const app=module.createNestApplication();configureApp(app);
  await app.listen(0,'127.0.0.1');
  const base=await app.getUrl();
  const post=(route,body)=>fetch(base+'/api'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    assert.equal((await fetch(base+'/api/health')).status,200);
    assert.equal((await fetch(base+'/api/health/db')).status,200);
    const request={id:'test-trip',clientName:'테스트',clientContact:'',departureCity:'서울',destination:'제주',startDate:'2026-10-25',endDate:'2026-10-27',adultCount:2,childCount:0,budget:1300000,style:['힐링/휴양'],transportType:'FLIGHT',accommodationType:'HOTEL',specialRequests:'',createdAt:new Date().toISOString(),status:'PENDING_APPROVAL'};
    const response=await post('/travel/plans',request);assert.equal(response.status,201);
    const plan=await response.json();assert.equal(plan.requestId,request.id);assert.equal(plan.days.length,3);assert.equal(plan.costs.totalCost,request.budget);assert.ok(plan.literaryReviews.length>0);
    const place=plan.days.flatMap(day=>day.places).find(place=>place.category==='CAFE');
    const reviewResponse=await post('/travel/poetic-reviews',place);assert.equal(reviewResponse.status,201);
    const review=await reviewResponse.json();assert.equal(review.placeId,place.id);assert.ok(review.poemVerses.length>0);
    for(const body of [null,{}, {...request,adultCount:0},{...request,endDate:'2026-10-24'},{...request,startDate:'2026-02-30'},{...request,endDate:'2026-11-30'}])assert.equal((await post('/travel/plans',body)).status,400);
    assert.equal((await post('/travel/poetic-reviews',{...place,category:'TRANSPORT'})).status,400);
    assert.equal((await fetch(base+'/api/unknown')).status,404);
  }finally{await app.close();}
});
