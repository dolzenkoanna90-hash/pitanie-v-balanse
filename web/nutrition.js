import {foods} from './catalog.js';

export const zero = [0, 0, 0, 0];
export const sum = (a,b) => a.map((v,i)=>v+b[i]);
export const nutrition = (id, grams) => foods[id].slice(4).map(v=>v*grams/100);
export const total = items => items.reduce((acc,item)=>sum(acc,nutrition(item.id,item.g)),zero);
export const categories = ['Завтрак','Обед','Ужин','Перекус'];
export const defaultWater = 1800;
export const activity = [
  ['Малоподвижный образ жизни',1.2],['Лёгкая активность',1.375],['Умеренная активность',1.55],
  ['Высокая активность',1.725],['Очень высокая активность',1.9]
];

export function targets(p) {
  if (!p || p.special || !['f','m'].includes(p.sex) || !activity[p.activity] || !Number.isFinite(p.age)
      || p.age<19 || p.age>78 || p.height<120 || p.height>230 || p.weight<35 || p.weight>300) return null;
  const rest = 10*p.weight+6.25*p.height-5*p.age+(p.sex==='f'?-161:5);
  const maintain = Math.round(rest*activity[p.activity][1]);
  const bmi = p.weight/(p.height/100)**2;
  const loss = p.goal==='loss' && bmi>=25 && !p.special;
  const floor = p.sex==='f'?1200:1500;
  const kcal = loss?Math.min(maintain,Math.max(floor,Math.round(maintain*0.9))):maintain;
  return {maintain,bmi,kcal,loss,macro:[Math.round(kcal*.25/4),Math.round(kcal*.30/9),Math.round(kcal*.45/4)]};
}

// The first three groups are meals. The last is a snack.
export const recipes = [
  [0,'Овсянка на воде с бананом и голубикой','Сварите хлопья на воде до мягкости. Взвесьте готовую кашу, затем добавьте нарезанный банан и голубику.',{oats:50,cookingWater:240,banana:75,blueberry:50},['oats','banana','blueberry'],{weight:395,porridge:270}],
  [0,'Тосты с авокадо и яйцом','Подсушите хлеб. Разомните авокадо, нарежьте варёное яйцо и помидор. Выложите всё на тосты.',{toast:100,avocado:70,egg:105,tomato:80},['toast','avocado','egg']],
  [0,'Творог 5% с яблоком и малиной','Нарежьте яблоко кубиками и добавьте к творогу вместе с малиной. Подайте с цельнозерновым тостом.',{cottage5:230,apple:120,raspberry:75,toast:60},['cottage5','apple','raspberry']],
  [1,'Куриная грудка с гречкой и овощами','Запеките куриную грудку до готовности. Подайте с варёной гречкой и салатом из огурца и помидора с оливковым маслом.',{chicken:160,buckwheat:205,cucumber:85,tomato:95,oil:12},['chicken','buckwheat']],
  [1,'Лосось с рисом и брокколи','Запеките лосось и отварите рис и брокколи. Добавьте оливковое масло к гарниру.',{salmon:145,rice:165,broccoli:145,oil:7},['salmon','rice','broccoli']],
  [1,'Нут с печёным картофелем и салатом','Запеките картофель. Смешайте варёный нут с огурцом, помидором и листовым салатом. Заправьте оливковым маслом.',{chickpea:190,potato:185,cucumber:95,tomato:100,lettuce:35,oil:10},['chickpea','potato']],
  [2,'Индейка с картофелем и зеленью','Запеките грудку индейки и картофель. Подайте со свежим листовым салатом и помидором, заправив оливковым маслом.',{turkey:155,potato:180,lettuce:70,tomato:90,oil:10},['turkey','potato']],
  [2,'Треска с киноа и брокколи','Запеките треску. Отварите киноа и брокколи, заправьте их оливковым маслом и подайте с рыбой.',{cod:180,quinoa:170,broccoli:130,oil:12},['cod','quinoa']],
  [3,'Греческий йогурт с бананом и голубикой','Нарежьте банан, добавьте йогурт и голубику. Перемешайте непосредственно перед подачей.',{yogurt:175,banana:75,blueberry:55},['yogurt','banana']],
  [0,'Печёные сырники из творога 5% с яблоком','Смешайте творог, яйцо, муку и корицу. Сформируйте небольшие сырники, запеките на пергаменте при 190 °C до готовности и подайте с яблоком.',{cottage5:150,rawEgg:35,flour:25,apple:75,cinnamon:1},['cottage5','rawEgg','flour','apple','cinnamon'],{weight:260}],
  [0,'Омлет с капустой и укропом','Тонко нашинкуйте капусту и припустите до мягкости. Взбейте яйца с молоком, влейте к капусте и готовьте под крышкой до схватывания. Добавьте укроп.',{rawEgg:110,milk:40,cabbage:110,dill:5,sunflower:5},['rawEgg','milk','cabbage','dill','sunflower'],{weight:235}],
  [1,'Ленивые голубцы с куриным фаршем','Смешайте фарш, отварной рис, нашинкованную капусту и яйцо. Сформируйте голубцы, выложите в форму с маслом и томатным пюре. Запеките до готовности фарша.',{groundChicken:150,rice:105,cabbage:115,rawEgg:25,tomatoSauce:75,sunflower:5},['groundChicken','rice','cabbage','rawEgg','tomatoSauce','sunflower'],{weight:410}],
  [1,'Чечевичный суп с морковью и паприкой','Соедините готовую чечевицу, лук, морковь, томатное пюре и воду. Варите до мягкости моркови. Добавьте подсолнечное масло и паприку.',{lentil:165,carrot:60,onion:40,tomatoSauce:35,cookingWater:190,sunflower:6,paprika:2},['lentil','carrot','onion','tomatoSauce','sunflower','paprika'],{weight:460}],
  [2,'Запечённый минтай с картофелем','Запеките минтай с луком, морковью и подсолнечным маслом до готовности. Подайте с печёным картофелем. Взвесьте рыбу и картофель после приготовления.',{pollock:155,potato:185,onion:45,carrot:65,sunflower:8},['pollock','potato','onion','carrot','sunflower'],{weight:440}],
  [2,'Тушёная капуста с курицей и томатами','Тушите нашинкованную капусту с томатами и небольшим количеством воды. Когда капуста станет мягкой, добавьте нарезанную запечённую грудку и подсолнечное масло.',{cabbage:235,chicken:130,tomato:120,onion:40,sunflower:8,cookingWater:40},['cabbage','chicken','tomato','onion','sunflower'],{weight:465}],
  [3,'Печёное яблоко с творогом 5%','Разрежьте яблоко пополам, удалите сердцевину, наполните половинки творогом и посыпьте корицей. Запеките до мягкости яблока.',{apple:155,cottage5:85,cinnamon:1},['apple','cottage5','cinnamon'],{weight:220}],
  [3,'Кефир с бананом и овсяными хлопьями','Взбейте кефир с бананом и сухими овсяными хлопьями. Дайте постоять несколько минут, чтобы хлопья размягчились.',{kefir:180,banana:75,oats:15},['kefir','banana','oats']],
  [0,'Овсянка на молоке 2% с яблоком и корицей','Сварите хлопья на молоке, помешивая. Взвесьте готовую кашу, затем добавьте нарезанное яблоко и корицу.',{oats:50,milk:250,apple:90,cinnamon:1},['oats','milk','apple','cinnamon'],{weight:371,porridge:280}],
  [1,'Макароны с курицей и брокколи','Отварите макароны и брокколи, взвесьте их после варки. Прогрейте с кусочками запечённой грудки, томатным пюре и подсолнечным маслом.',{pasta:150,chicken:120,broccoli:105,tomatoSauce:85,sunflower:5},['pasta','chicken','broccoli','tomatoSauce','sunflower'],{weight:450}],
  [2,'Макароны с чечевицей в томатном соусе','Отварите макароны и чечевицу отдельно. Взвесьте их после варки и прогрейте вместе с томатным пюре, луком и подсолнечным маслом.',{pasta:140,lentil:125,tomatoSauce:90,onion:40,sunflower:5},['pasta','lentil','tomatoSauce','onion','sunflower'],{weight:380}],
];

export function portion(recipe, selected, calorieTarget=0) {
  const [slot,title,description,base,core,yieldInfo] = recipe;
  const original = Object.entries(base)
    .filter(([id])=>id==='cookingWater'||selected.includes(id))
    .map(([id,g])=>({id,g}));
  const factor=calorieTarget?Math.min(1.75,Math.max(.6,calorieTarget/total(original)[0])):1;
  const ingredients=original.map(({id,g})=>({id,g:Math.max(1,Math.round(g*factor))}));
  const grams=yieldInfo?Math.round(yieldInfo.weight*factor):ingredients.reduce((acc,item)=>acc+item.g,0);
  const porridgeGrams=yieldInfo?.porridge?Math.round(yieldInfo.porridge*factor):null;
  return {slot,title,description,ingredients,index:recipes.indexOf(recipe),grams,porridgeGrams,estimated:Boolean(yieldInfo),stats:total(ingredients)};
}

export function menuOptions(selected) {
  return categories.map((_,slot)=>recipes.filter(r=>r[0]===slot&&r[4].every(id=>selected.includes(id))));
}

const shares=[.26,.32,.28,.14];
export function buildMenu(selected, calorieTarget, variation=0) {
  const options = menuOptions(selected);
  const complete=options.every(group=>group.length);
  return options.flatMap((group,i)=>group.length?
    [portion(group[variation%group.length],selected,complete?calorieTarget*shares[i]:0)]:[]);
}

export function recipeBook(){
  return recipes.map(recipe=>portion(recipe,Object.keys(recipe[3])));
}

const normalize = v=>v.toLowerCase().replaceAll('ё','е').replace(/\s+/g,' ').trim();
const aliases=Object.entries(foods).flatMap(([id,record])=>record[3].map(name=>[normalize(name),id]))
  .sort((a,b)=>b[0].length-a[0].length);
export function foodSearch(query) {
  const q=normalize(query).replace(/(\d)\s+%/g,'$1%');
  return Object.keys(foods).filter(id=>id!=='cottage'&&(!q||[foods[id][0],...foods[id][3]].some(name=>normalize(name).includes(q))));
}
export function parseFood(text) {
  const items=[], unknown=[];
  const clean=text.toLowerCase().replaceAll('ё','е').replace(/(\d),(?=\d)/g,'$1.');
  const parts=clean.replace(/(\d)\s+%/g,'$1%').split(/\s*(?:[,+;\n]|\s+и\s+)\s*/).map(normalize).filter(Boolean);
  for(const part of parts) {
    const amount=part.match(/(\d+(?:\.\d+)?)\s*(килограмм(?:а|ов)?|кг|грамм(?:а|ов)?|гр\.?|г\.?)(?=$|[^а-яa-z])/u)
      || part.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*$/);
    const weight=amount?Number(amount[1])*(amount[2]?.startsWith('к')?1000:1):0;
    const g=weight>0&&weight<=3000?weight:0;
    const label=normalize((amount?part.slice(0,amount.index)+' '+part.slice(amount.index+amount[0].length):part).replace(/^[.,:\s–-]+|[.,:\s–-]+$/g,''));
    const match=aliases.find(([name])=>name===label);
    const id=match?.[1]??Object.keys(foods).find(key=>normalize(foods[key][0]).replace(/,/g,'')===label);
    if(!id) {
      const clarify=/^(?:готовая )?(?:овсянк[аиу]|овсян(?:ая|ой|ую) каш[аиу])$/.test(label);
      unknown.push({label:label||part,g,clarify});
      continue;
    }
    items.push({id,g});
  }
  return {items,unknown};
}

export function dateKey(date=new Date()) {
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
export function dayShift(key,offset) {
  const d=new Date(key+'T12:00:00');
  d.setDate(d.getDate()+offset);
  return dateKey(d);
}
