// Validate that the anonymised survey schema and published field template agree.
import { readFileSync } from 'node:fs';
const schema=JSON.parse(readFileSync('data/getting-to-work-survey-schema.json','utf8'));
const rows=readFileSync('static/research/getting-to-work/field-template.csv','utf8').trim().split(/\r?\n/);
const header=rows[0].split(',');
const expected=schema.fields.map(v=>v[0]);
if(JSON.stringify(header)!==JSON.stringify(expected))throw Error('Field template differs from documented schema');
if(rows.length!==1)throw Error('The public field template must contain no invented respondents');
const scenario=(wage,rent,perDay,minutes,buffer,care,days,hourly)=>{
  const cash=wage-rent-perDay*days-care;
  const time=days*(minutes+buffer)/60;
  return {cash,time,net:cash-time*hourly};
};
const a=scenario(30000,12000,100,70,10,2000,22,120);
const b=scenario(34000,16000,70,35,5,3000,22,120);
if(a.cash!==13800||b.cash!==13460||Math.abs(a.net-10280)>0.005||Math.abs(b.net-11700)>0.005)throw Error('Default commute arithmetic failed');
if(Math.abs((b.net-a.net)-1420)>0.005)throw Error('Comparison arithmetic failed');
console.log('Commute model validated: blank schema and illustrative accounting match.');
