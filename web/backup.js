import {foods} from './catalog.js';
import {recipes} from './nutrition.js';

const isObject=value=>value&&typeof value==='object'&&!Array.isArray(value);
const number=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
const string=(value,max)=>typeof value==='string'&&value.length<=max;
const stats=(values,min,max)=>Array.isArray(values)&&values.length===4&&values.every(v=>number(v,min,max));
const selected=ids=>Array.isArray(ids)&&ids.every(id=>typeof id==='string'&&Object.hasOwn(foods,id));
const validDate=key=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&
  Number.isFinite(Date.parse(key))&&new Date(key).toISOString().slice(0,10)===key;
const item=x=>isObject(x)&&number(x.g,.001,3000)&&(
  x.product?isObject(x.product)&&string(x.product.name,120)&&string(x.product.brand,120)
    && /^\d{5,18}$/.test(x.product.code)&&stats(x.product.stats,0,1000):
    typeof x.id==='string'&&Object.hasOwn(foods,x.id));
const manual=x=>isObject(x)&&number(x.g,.001,3000)&&number(x.k,0,1000)&&
  ['p','f','c'].every(key=>number(x[key],0,100));
const entry=x=>isObject(x)&&string(x.id,100)&&string(x.name,120)&&
  Number.isInteger(x.slot)&&number(x.slot,0,3)&&Array.isArray(x.items)&&x.items.every(item)&&
  (x.manual==null||manual(x.manual))&&stats(x.stats,0,1e8)&&number(x.grams,.001,1e8);
const day=x=>isObject(x)&&(x.weight===undefined||number(x.weight,1,500))&&
  Array.isArray(x.entries)&&x.entries.every(entry)&&Array.isArray(x.water)&&
  x.water.every(y=>isObject(y)&&string(y.id,100)&&string(y.time,40)&&[200,250,300].includes(y.ml));

export function serializeDiary(state){
  return JSON.stringify({format:'pitanie-v-balanse',version:1,diary:state},null,2);
}

export function parseDiary(text){
  const {format,version,diary}=JSON.parse(text)??{};
  if(format!=='pitanie-v-balanse'||version!==1||!isObject(diary)||!selected(diary.selected)||
     !isObject(diary.days)||!Object.entries(diary.days).every(([key,value])=>validDate(key)&&day(value))||
     !Array.isArray(diary.favorites)||!diary.favorites.every(i=>Number.isInteger(i)&&number(i,0,recipes.length-1))||
     (diary.menu!=null&&(!isObject(diary.menu)||!selected(diary.menu.selected)||!number(diary.menu.kcal,0,1e5)||
      !Number.isSafeInteger(diary.menu.variation)||diary.menu.variation<0)))throw Error('invalid backup');
  const p=diary.profile;
  if(p!=null&&(!isObject(p)||!string(p.name,100)||!['','f','m'].includes(p.sex)||
    !['age','height','weight','activity','water'].every(k=>p[k]==null||number(p[k],0,1e4))||
    !['loss','maintain'].includes(p.goal)||typeof p.special!=='boolean'))throw Error('invalid profile');
  return diary;
}
