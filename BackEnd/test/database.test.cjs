const {test}=require('node:test');
const assert=require('node:assert/strict');
const {databaseOptions}=require('../dist/database/database.config');
const env={DB_HOST:'localhost',DB_USER:'test',DB_PASSWORD:'test',DB_NAME:'test'};
test('TypeORM never changes schema automatically in any environment',()=>{
  for(const APP_ENV of ['local','development','production']){
    const options=databaseOptions({...env,APP_ENV});
    assert.equal(options.type,'postgres');assert.equal(options.synchronize,false);
    assert.equal(options.migrationsRun,false);assert.equal(options.dropSchema,false);
  }
});
test('invalid database settings fail before connection and TLS verifies certificates',()=>{
 assert.throws(()=>databaseOptions({...env,DB_PASSWORD:''}),/DB_PASSWORD/);
 assert.throws(()=>databaseOptions({...env,DB_PORT:'bad'}),/DB_PORT/);
 assert.throws(()=>databaseOptions({...env,DB_SSL:'bad'}),/DB_SSL/);
 assert.deepEqual(databaseOptions({...env,DB_SSL:'true'}).ssl,{rejectUnauthorized:true});
});
