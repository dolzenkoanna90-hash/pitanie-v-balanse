import {dateKey,dayShift,sum,zero} from './nutrition.js';

const shortDate=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'});
const number=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
const dayCount=(from,to)=>Math.round((Date.parse(to)-Date.parse(from))/86400000);
export const formatShortDate=key=>shortDate.format(new Date(key+'T12:00:00'));

function sixMonthsBack(key) {
  const d=new Date(key+'T12:00:00');
  const day=d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth()-6);
  const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  d.setDate(Math.min(day,last));
  return dayShift(dateKey(d),1);
}

export function metricSeries(days,end,period,type) {
  const start=period==='6m'?sixMonthsBack(end):dayShift(end,1-Number(period));
  return Array.from({length:dayCount(start,end)+1},(_,i)=>{
    const key=dayShift(start,i);
    const record=days[key];
    let values=null;
    if(type==='weight'&&Number.isFinite(record?.weight))values=[record.weight];
    if(type==='food'&&record?.entries?.length)values=record.entries.reduce((all,item)=>sum(all,item.stats),zero);
    if(type==='water'&&record?.water?.length)values=[record.water.reduce((all,item)=>all+item.ml,0)];
    return {key,values};
  });
}

export function metricAverage(series) {
  const recorded=series.filter(entry=>entry.values!==null);
  if(!recorded.length)return {count:0,values:null};
  const {length}=recorded[0].values;
  const totals=recorded.reduce((all,entry)=>sum(all,entry.values),Array(length).fill(0));
  return {count:recorded.length,values:totals.map(value=>value/recorded.length)};
}

export function recentWeight(days,end) {
  const key=Object.keys(days).filter(key=>key<=end&&Number.isFinite(days[key]?.weight)).sort().at(-1);
  return key?{key,value:days[key].weight}:null;
}

export function metricChart(series,type,goal) {
  const isWeight=type==='weight', unit=isWeight?'кг':type==='food'?'ккал':'мл';
  const entries=series.flatMap((entry,i)=>entry.values?[{...entry,i,value:entry.values[0]}]:[]);
  if(!entries.length)return '<p class="empty">За этот период записей пока нет.</p>';
  const low=Math.min(...entries.map(p=>p.value)), high=Math.max(...entries.map(p=>p.value));
  const gap=Math.max((high-low)*.18,.5);
  const min=isWeight?Math.max(0,Math.floor((low-gap)*2)/2):0;
  const max=isWeight?Math.ceil((high+gap)*2)/2:Math.max(500,Math.ceil(Math.max(high,goal||0)/500)*500);
  const left=48,right=392,top=15,bottom=165, span=right-left;
  const horizontal=(i)=>isWeight?left+4+(span-8)*i/Math.max(1,series.length-1):left+span*(i+.5)/series.length;
  const vertical=(v)=>bottom-(v-min)/(max-min)*(bottom-top);
  const grid=Array.from({length:5},(_,i)=>{
    const value=max-(max-min)*i/4,y=vertical(value);
    return '<line class="metric-gridline" x1="'+left+'" y1="'+y+'" x2="'+right+'" y2="'+y+'"/>'+
      '<text class="metric-tick" x="'+(left-7)+'" y="'+(y+3)+'" text-anchor="end">'+number.format(value)+'</text>';
  }).join('');
  const labels=Array.from({length:series.length<=7?series.length:5},(_,i)=>Math.round(i*(series.length-1)/(series.length<=7?Math.max(1,series.length-1):4)));
  const axis=labels.map(i=>'<text class="metric-tick" x="'+horizontal(i)+'" y="187" text-anchor="'+(i===0?'start':i===series.length-1?'end':'middle')+'">'+formatShortDate(series[i].key)+'</text>').join('');
  const width=Math.min(18,.64*span/series.length);
  const marks=entries.map(p=>{
    const x=horizontal(p.i),y=vertical(p.value);
    const title='<title>'+formatShortDate(p.key)+' · '+number.format(p.value)+' '+unit+'</title>';
    return isWeight?'<circle cx="'+x+'" cy="'+y+'" r="3.4">'+title+'</circle>':
      '<rect x="'+(x-width/2)+'" y="'+y+'" width="'+width+'" height="'+(bottom-y)+'" rx="'+Math.min(width/2,3)+'">'+title+'</rect>';
  }).join('');
  const line=isWeight&&entries.length>1?'<polyline points="'+entries.map(p=>horizontal(p.i)+','+vertical(p.value)).join(' ')+'"/>':'';
  const target=!isWeight&&goal?'<line class="metric-target" x1="'+left+'" x2="'+right+'" y1="'+vertical(goal)+'" y2="'+vertical(goal)+'"/>':'';
  return '<svg class="metric-chart metric-'+type+'" viewBox="0 0 410 201" role="img" aria-label="Динамика, '+unit+'">'+grid+axis+target+line+marks+'</svg>';
}
