import {foods} from './catalog.js';

const key='pitanie-v-balanse-v1';
export const allProducts=Object.keys(foods).filter(id=>foods[id][1]);
const previousProducts=['oats','blueberry','banana','avocado','egg','tomato','toast','raspberry','apple',
  'chicken','buckwheat','cucumber','salmon','rice','broccoli','chickpea','potato','oil',
  'turkey','lettuce','cod','quinoa','yogurt','cottage5'];
export const fresh=()=>({profile:null,selected:allProducts,menu:null,days:{},favorites:[],recipeCatalog:1});
function read(key,fallback){
  try {return JSON.parse(localStorage.getItem(key))??fallback;} catch {return fallback;}
}
function write(key,value){
  try {localStorage.setItem(key,JSON.stringify(value));return true;} catch {return false;}
}
function updateProductPreferences(saved){
  const update=ids=>[...new Set(ids.map(id=>id==='cottage'?'cottage5':id))];
  const selected=update(saved.selected);
  const usingAll=!saved.recipeCatalog&&previousProducts.every(id=>selected.includes(id));
  return {
    ...saved,
    recipeCatalog:1,
    favorites:Array.isArray(saved.favorites)?saved.favorites:[],
    selected:usingAll?allProducts:selected,
    menu:saved.menu?{...saved.menu,selected:update(saved.menu.selected)}:null
  };
}
export let state=updateProductPreferences(read(key,fresh()));
export let connection='local';
let revision=0, pending=false, flushing=false, signedIn=false, timer;

export async function init(onChange){
  try {
    const res=await fetch('/api/journal',{cache:'no-store'});
    if(!res.ok) return;
    const data=await res.json();
    if(!data.signedIn)return;
    signedIn=true;revision=data.revision;
    const current=state;
    state=data.state?updateProductPreferences(data.state):current;
    if(data.state && (current.profile || Object.keys(current.days).length)) {
      const merged={...current.days,...data.state.days};
      if(Object.keys(merged).length!==Object.keys(data.state.days).length) {
        state={...state,days:merged};
        pending=true;
      }
    } else if(!data.state&&(current.profile||current.menu||current.favorites.length||Object.keys(current.days).length)) pending=true;
    connection='synced';
    onChange();
    if(pending)flush(onChange);
  } catch {}
}
async function flush(onChange){
  if(flushing||!signedIn||!pending)return;
  flushing=true;
  pending=false;
  const snapshot=JSON.stringify({revision,state});
  try{
    const res=await fetch('/api/journal',{method:'PUT',headers:{'content-type':'application/json'},body:snapshot});
    if(res.status===409){
      const current=await fetch('/api/journal',{cache:'no-store'}).then(r=>r.json());
      revision=current.revision;
      connection='conflict';
      pending=true;
    } else if(!res.ok) throw Error('sync');
    else {
      const data=await res.json();
      revision=data.revision;
      connection='synced';
    }
  } catch {connection='error';pending=true;}
  finally {
    flushing=false;onChange();
    if(pending&&connection==='synced')flush(onChange);
  }
}
export function save(onChange) {
  if(!signedIn)return write(key,state);
  pending=true;
  clearTimeout(timer);
  timer=setTimeout(()=>flush(onChange),100);
  return true;
}
export function importDiary(data,onChange){
  state=updateProductPreferences(data);
  return save(onChange);
}
export function sync(onChange){return flush(onChange);}
export async function erase(){
  if(signedIn){
    clearTimeout(timer);
    pending=false;
    for(let i=0;flushing&&i<80;i++)await new Promise(r=>setTimeout(r,50));
    if(flushing)throw Error('sync');
    const res=await fetch('/api/journal',{method:'DELETE'});
    if(!res.ok)throw Error('erase');
    revision=0;connection='synced';
  }
  try{localStorage.removeItem(key);}catch{}
  state=fresh();
}
