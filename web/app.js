import {parseDiary,serializeDiary} from './backup.js';
import {findProducts,productName,searchNote} from './food-lookup.js';
import {foods} from './catalog.js';
import {icon} from './icons.js';
import {activity,buildMenu,categories,dateKey,dayShift,defaultWater,foodSearch,parseFood,recipeBook,recipes,sum,targets,total,zero} from './nutrition.js';
import {formatShortDate,metricAverage,metricChart,metricSeries,recentWeight} from './metrics.js';
import {cookingSteps,recipeMinutes} from './recipe-details.js';
import {allProducts,connection,erase,importDiary,init,save,state,sync} from './state.js';

const el=id=>document.getElementById(id);
const nav=[
  ['today','Сегодня','Сегодня','home'],['menu','Конструктор меню','Меню','menu'],
  ['journal','Дневник питания','Дневник','journal'],['water','Трекер воды','Вода','water'],
  ['progress','Прогресс','Прогресс','chart'],['profile','Личный кабинет','Профиль','user']
];
const route=()=>nav.some(([id])=>id===location.hash.slice(1))?location.hash.slice(1):'today';
let page=route(), date=dateKey(), toastTimer, mealDraft=null, productQuery='', viewMeals=[], showRecipeBook=false;
let favoritesOnly=false, metric='weight', period='7', activeRecipe=null;
const int=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0});
const dec=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1});
const month=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'});
const formatDay=key=>month.format(new Date(key+'T12:00:00'));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>int.format(v);
const d=v=>dec.format(v);
const planProducts=[...new Set(recipes.flatMap(r=>Object.keys(r[3])))].filter(id=>foods[id][1]);
const uid=()=>crypto.randomUUID?.()??String(Date.now()+Math.random());
const day=()=>state.days[date]??{water:[],entries:[]};
const writeDay=next=>{state.days[date]=next;persist();};
const progress=(value,max,label,water=false)=>'<div class="progress '+(water?'water':'')+'" role="progressbar" aria-label="'+label+'" aria-valuemin="0" aria-valuemax="'+(max||1)+'" aria-valuenow="'+Math.min(value,max||0)+'"><i style="width:'+Math.min(100,max?value/max*100:0)+'%"></i></div>';
const btn=(label,action,style='secondary',glyph='',more='')=>'<button type="button" class="'+style+'" data-action="'+action+'" '+more+'>'+(glyph?icon(glyph,16):'')+label+'</button>';
const square=(label,action,glyph,more='')=>'<button type="button" class="icon-button" data-action="'+action+'" aria-label="'+label+'" title="'+label+'" '+more+'>'+icon(glyph,17)+'</button>';
const spot=(name,color='')=>'<span class="spot '+color+'">'+icon(name)+'</span>';
const heading=(title,subtitle='',actions='')=>'<div class="page-head"><div><h1>'+title+'</h1>'+(subtitle?'<p class="muted">'+subtitle+'</p>':'')+'</div>'+actions+'</div>';
const section=(title,action='')=>'<div class="section-head"><h2>'+title+'</h2>'+action+'</div>';
const empty=(title,text='',action='')=>'<div class="empty"><strong>'+title+'</strong>'+(text?'<span>'+text+'</span>':'')+action+'</div>';
const macro=(value,goal=[],meters=false)=>'<div class="macro">'+['Белки','Жиры','Углеводы'].map((name,i)=>'<div>'+name+'<b>'+n(value[i])+(goal[i]?' / '+n(goal[i]):'')+' г</b>'+
  (meters&&goal[i]?'<span class="macro-meter" aria-hidden="true"><i style="width:'+Math.min(100,value[i]/goal[i]*100)+'%"></i></span>':'')+'</div>').join('')+'</div>';
const statsText=stats=>'≈ '+n(stats[0])+' ккал · Б '+d(stats[1])+' · Ж '+d(stats[2])+' · У '+d(stats[3])+' г';
const standalone=document.querySelector('meta[name="pitanie-host"]')?.content==='standalone';
const accountSignIn='<a class="secondary button-sm" href="/signin-with-chatgpt?return_to=%2F%23profile" target="_top">'+icon('lock',15)+'Войти через ChatGPT</a>';
const accountSignOut='<a class="quiet button-sm" href="/signout-with-chatgpt?return_to=%2F%23profile" target="_top">Выйти</a>';

function persist(){if(!save(updateAccount))notify('Браузер не смог сохранить данные.');}
let pendingDiary=null;
function exportDiary(){
  const url=URL.createObjectURL(new Blob([serializeDiary(state)],{type:'application/json'}));
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download='pitanie-dnevnik-'+dateKey()+'.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function reviewDiary(file){
  if(!file)return;
  try{
    if(file.size>5000000)throw Error('backup too large');
    pendingDiary=parseDiary(await file.text());
    showDialog('Загрузить дневник?','<p>Профиль, меню и записи в этом браузере будут заменены данными из файла. Скачайте текущий дневник, если хотите сохранить его копию.</p>'+
      '<div class="row-actions">'+btn('Загрузить дневник','import-diary','primary')+btn('Отмена','close','quiet')+'</div>');
  }catch{notify('Не удалось прочитать файл. Выберите JSON, скачанный из «Питание в балансе».');}
}
function notify(text){
  clearTimeout(toastTimer);
  el('toast').textContent=text;el('toast').hidden=false;
  toastTimer=setTimeout(()=>{el('toast').hidden=true;},3200);
}
function go(next){
  if(next===page){render();return;}
  location.hash=next;
}
function dates(){
  return '<div class="date-row">'+square('Предыдущий день','date-back','left')+
    '<input type="date" id="date" aria-label="Дата дневника" value="'+date+'" max="'+dateKey()+'">'+
    square('Следующий день','date-forward','right',date>=dateKey()?'disabled':'')+'</div>';
}
function dayFood(record=day()){
  return record.entries.reduce((acc,item)=>sum(acc,item.stats),zero);
}
function dayWater(record=day()){
  return record.water.reduce((acc,item)=>acc+item.ml,0);
}
function waterGoal(){return state.profile?.water||defaultWater;}
function calorieCard(){
  const goal=targets(state.profile);
  const now=dayFood();
  return '<article class="card"><div class="card-head">'+spot('flame','rose')+'<h2>Калории и БЖУ</h2>'+
    btn('Добавить','add-food','quiet button-sm push','plus')+'</div>'+
    '<div class="stat-line"><div><strong>'+n(now[0])+'</strong> <span>ккал'+(goal?' из '+n(goal.kcal):'')+'</span></div>'+
    (goal?'<span>'+ (now[0]>goal.kcal?'Сверх ориентира '+n(now[0]-goal.kcal):'Осталось '+n(goal.kcal-now[0]))+' ккал</span>':'')+'</div>'+
    (goal?progress(now[0],goal.kcal,'Калории'): '<div class="muted small">Дневной ориентир можно рассчитать в профиле.</div>')+
    macro(now.slice(1),goal?.macro)+'</article>';
}
function waterCard(){
  const now=dayWater(), goal=waterGoal();
  return '<article class="card"><div class="card-head">'+spot('water','blue')+'<h2>Вода</h2><span class="pill blue push">'+n(now/goal*100)+'%</span></div>'+
    '<div class="stat-line"><div><strong class="blue-text">'+n(now)+'</strong> <span>из '+n(goal)+' мл</span></div></div>'+
    progress(now,goal,'Выпитая вода',true)+'<div class="water-actions">'+[200,250,300].map(ml=>btn('+ '+ml+' мл','add-water','', '', 'data-ml="'+ml+'"')).join('')+'</div></article>';
}
function mealCard(m,i){
  return '<article class="card meal"><img class="meal-image" src="./assets/meal-'+m.index+'.webp" alt="'+esc(m.title)+'" loading="lazy" width="300" height="132">'+
    '<div class="meal-content"><span class="pill" style="justify-self:start">'+categories[m.slot]+'</span><h3>'+esc(m.title)+'</h3>'+
    '<div class="meal-stats"><strong>≈ '+n(m.stats[0])+' ккал</strong><span>· '+(m.estimated?'≈ ':'')+n(m.grams)+' г готового блюда</span></div>'+
    '<div class="row-actions">'+btn('Рецепт','recipe','quiet button-sm','', 'data-index="'+i+'"')+
    btn('В дневник','log-meal','secondary button-sm','plus','data-index="'+i+'"')+'</div></div></article>';
}
function savedMenu(){
  const menu=state.menu;
  return menu?buildMenu(menu.selected,menu.kcal,menu.variation):[];
}
function dashboard(){
  viewMeals=savedMenu();
  const user=state.profile?.name;
  return heading(date===dateKey()?(user?'Здравствуйте, '+esc(user)+'!':'Мой день'):'Мой день',formatDay(date),dates())+
    '<section class="hero"><img class="hero-img" src="./assets/meal-4.webp" alt=""><div class="hero-copy"><h2>Меню из любимых продуктов</h2>'+
    '<p>Выберите продукты и получите блюда с граммовками и расчётом КБЖУ.</p>'+
    '<button type="button" class="primary" data-nav="menu">Составить меню '+icon('arrow',16)+'</button></div></section>'+
    '<div class="grid-two">'+calorieCard()+waterCard()+'</div>'+
    '<section class="section">'+section('Моё меню','<button type="button" class="quiet" data-nav="menu">Конструктор '+icon('arrow',15)+'</button>')+
    '<div class="meals">'+(viewMeals.length?viewMeals.map(mealCard).join(''):buildMenu(allProducts,0).slice(0,3).map(m=>
      '<article class="card meal"><img class="meal-image" src="./assets/meal-'+m.index+'.webp" alt="'+esc(m.title)+'"><div class="meal-content"><span class="pill" style="justify-self:start">'+categories[m.slot]+'</span><h3>'+esc(m.title)+'</h3><button type="button" class="quiet button-sm" data-nav="menu">Посмотреть в конструкторе '+icon('arrow',13)+'</button></div></article>').join(''))+'</div></section>';
}
function productControls(){
  const ids=foodSearch(productQuery).filter(id=>planProducts.includes(id));
  const groups=[...new Set(ids.map(id=>foods[id][1]))];
  return groups.length?groups.map(group=>'<div class="product-group"><h3>'+group+'</h3><div class="product-chips">'+
    ids.filter(id=>foods[id][1]===group).map(id=>{
      const on=state.selected.includes(id);
      return '<button class="chip" type="button" data-action="product" data-id="'+id+'" aria-pressed="'+on+'">'+
        icon(on?'check':'plus',12)+esc(foods[id][0])+'</button>';
    }).join('')+'</div></div>').join(''):empty('Продукты не найдены');
}
function menuView(){
  const current=state.menu;
  const menu=savedMenu();
  const book=showRecipeBook?recipeBook():[];
  viewMeals=showRecipeBook?(favoritesOnly?book.filter(meal=>state.favorites.includes(meal.index)):book):menu;
  const selectionChanged=current&&(current.selected.length!==state.selected.length||state.selected.some(id=>!current.selected.includes(id)));
  const output=showRecipeBook?(viewMeals.length?'<div class="meals">'+viewMeals.map(mealCard).join('')+'</div>':empty('Избранных рецептов пока нет','Откройте рецепт и нажмите на сердечко.')):current?(menu.length?
    '<div class="result-line">'+statsText(viewMeals.reduce((a,m)=>sum(a,m.stats),zero))+'</div>'+
    (viewMeals.length<4?'<p class="notice">С выбранными продуктами удалось собрать '+viewMeals.length+' из 4 приёмов пищи. Добавьте продукты, чтобы получить больше вариантов.</p>':'')+
    '<div class="meals">'+viewMeals.map(mealCard).join('')+'</div>':
    empty('Подходящих блюд пока нет','Для одного рецепта нужны несколько основных ингредиентов. Например, добавьте куриную грудку и гречку или овсяные хлопья, банан и голубику.')):
    empty('Ваше меню появится здесь','Отметьте продукты слева и нажмите «Составить меню».');
  return heading('Конструктор меню','Отметьте продукты, которые хотите использовать.')+
    '<div class="plan-grid"><section class="card"><div class="card-head">'+spot('menu')+'<h2>Продукты</h2><span id="product-count" class="pill push">'+state.selected.filter(id=>planProducts.includes(id)).length+'</span></div>'+
    '<label class="field"><span class="small">Поиск продукта</span><input id="product-search" type="search" placeholder="Например, гречка" value="'+esc(productQuery)+'"></label>'+
    '<div class="row-actions">'+btn('Выбрать все','select-all','quiet button-sm')+btn('Снять выбор','select-none','quiet button-sm')+'</div>'+
    '<div class="product-list" id="products">'+productControls()+'</div><div class="divider"></div>'+
    btn('Составить меню','build-menu','primary','spark')+'</section>'+
    '<section class="card"><div class="card-head">'+spot('spark','rose')+'<h2>'+(showRecipeBook?'Все блюда':'Меню на день')+'</h2></div>'+
    '<div class="row-actions" style="margin-bottom:10px">'+
    btn(showRecipeBook?'Моё меню':'Все блюда','toggle-recipes','secondary button-sm','book')+
    (showRecipeBook?btn('Избранное','toggle-favorites','quiet button-sm','heart','aria-pressed="'+favoritesOnly+'"'):'')+
    (!showRecipeBook&&menu.length?btn('Другой вариант','vary-menu','quiet button-sm','refresh','title="Поменять блюда, где есть выбор"'):'')+'</div>'+
    '<p id="menu-stale" class="notice" '+(selectionChanged&&!showRecipeBook?'':'hidden')+'>Выбор изменился. Нажмите «Составить меню», чтобы обновить блюда.</p>'+
    output+'<p class="small muted" style="margin-top:11px">Вес готовой порции указан в карточке. Рис, гречку, киноа и макароны взвешивают после варки. Фотографии показывают пример подачи.</p></section></div>';
}
function historyChart(type){
  const getter=type==='water'?dayWater:dayFood;
  const ds=Array.from({length:7},(_,i)=>dayShift(date,i-6));
  const totals=ds.map(key=>{
    const record=state.days[key]??{water:[],entries:[]};
    return type==='water'?getter(record):getter(record)[0];
  });
  const limit=Math.max(type==='water'?waterGoal():targets(state.profile)?.kcal||1,...totals);
  return '<div class="history-chart">'+ds.map((key,i)=>
    '<button type="button" class="chart-day" data-action="jump-date" data-date="'+key+'" aria-current="'+(key===date)+'" title="'+formatDay(key)+': '+n(totals[i])+(type==='water'?' мл':' ккал')+'"><b>'+n(totals[i])+'</b><span class="chart-bar '+(type==='water'?'water':'')+'"><i style="height:'+totals[i]/limit*100+'%"></i></span><span>'+key.slice(8)+'</span></button>').join('')+'</div>';
}
function journalView(){
  const records=day().entries;
  return heading('Дневник питания','Калории, белки, жиры и углеводы за выбранный день.',dates())+
    '<div class="grid-two">'+calorieCard()+'<article class="card"><div class="card-head">'+spot('journal')+'<h2>Последние 7 дней</h2></div>'+historyChart('food')+'</article></div>'+
    '<section class="card section">'+section('Записи питания',btn('Добавить запись','add-food','primary','plus'))+
    (records.length?'<div class="journal-list">'+records.map(entry=>'<div class="entry">'+spot('menu','rose')+'<div class="grow"><b>'+esc(entry.name)+'</b><span class="muted small">'+categories[entry.slot]+' · '+d(entry.grams)+' г · '+statsText(entry.stats)+'</span></div>'+
      square('Редактировать запись','edit-entry','edit','data-id="'+esc(entry.id)+'"')+
      square('Удалить запись','del-entry','trash','data-id="'+esc(entry.id)+'"')+'</div>').join('')+'</div>':
      empty('За этот день записей пока нет','Добавьте продукты по описанию, фотографии или из справочника.'))+'</section>';
}
function waterView(){
  const water=day().water;
  return heading('Трекер воды','Записывайте выпитую воду и отслеживайте прогресс.',dates())+
    '<div class="grid-two">'+waterCard()+'<article class="card"><div class="card-head">'+spot('water','blue')+'<h2>Последние 7 дней</h2></div>'+historyChart('water')+'</article></div>'+
    '<section class="card section">'+section('Вода за день','<button type="button" class="quiet" data-nav="profile">Изменить цель '+icon('edit',16)+'</button>')+
    (water.length?'<div class="journal-list">'+water.slice().reverse().map(item=>'<div class="entry">'+spot('water','blue')+'<div class="grow"><b>'+n(item.ml)+' мл</b><span class="muted small">'+esc(item.time)+'</span></div>'+
      square('Удалить '+item.ml+' мл','del-water','trash','data-id="'+esc(item.id)+'"')+'</div>').join('')+'</div>':
      empty('Пока ни одной записи','Нажмите «+ 200 мл», «+ 250 мл» или «+ 300 мл».'))+'</section>';
}
function profileView(){
  const p=state.profile??{};
  const goal=targets(p);
  const select=(name,label,options,value)=>'<label class="field">'+label+'<select name="'+name+'">'+
    options.map(([v,t])=>'<option value="'+v+'" '+(String(v)===String(value)?'selected':'')+'>'+t+'</option>').join('')+'</select></label>';
  const num=(name,label,min,max,value,step=1,required=true)=>'<label class="field">'+label+'<input name="'+name+'" type="number" inputmode="decimal" min="'+min+'" max="'+max+'" step="'+step+'" value="'+esc(value??'')+'" '+(required?'required':'')+'></label>';
  return heading('Личный кабинет','Ваши данные, дневные ориентиры и настройки сохранения.')+
    '<div class="profile-grid"><section class="card"><div class="card-head">'+spot('user')+'<h2>Мои данные</h2></div>'+
    '<form id="profile-form"><div class="fields"><label class="field span-all">Имя <input name="name" maxlength="40" placeholder="Как к вам обращаться" value="'+esc(p.name??'')+'"></label>'+
    select('sex','Пол для расчёта',[['','Выберите'],['f','Женский'],['m','Мужской']],p.sex??'')+
    num('age','Возраст, лет',19,78,p.age,1,false)+num('height','Рост, см',120,230,p.height,.1,false)+num('weight','Вес, кг',35,300,p.weight,.1,false)+
    select('activity','Уровень активности',activity.map(([label],i)=>[i,label]),p.activity??0)+
    select('goal','Цель питания',[['maintain','Поддержание веса'],['loss','Снижение веса']],p.goal??'loss')+
    num('water','Моя цель по воде, мл',250,6000,p.water??defaultWater,50)+
    '<label class="check span-all"><input type="checkbox" name="special" '+(p.special?'checked':'')+'>Беременность, грудное вскармливание или лечебная диета. Использовать только дневники.</label></div>'+
    '<div class="row-actions" style="margin-top:16px"><button type="submit" class="primary">'+icon('check',17)+'Сохранить и рассчитать</button></div></form></section>'+
    '<div><section class="card"><div class="card-head">'+spot('flame','rose')+'<h2>Дневной ориентир</h2></div>'+
    (goal?'<div class="profile-stats">'+n(goal.kcal)+' ккал</div><p class="muted small">Поддержание веса ≈ '+n(goal.maintain)+' ккал · ИМТ ≈ '+d(goal.bmi)+'</p>'+
      macro(goal.macro)+(p.goal==='loss'?(goal.loss?'<p class="notice">Выбран ориентир для снижения веса. Стартовый дефицит до 10% от расчётного расхода.</p>':
        '<p class="notice">При ИМТ ниже 25 расчёт показывает ориентир для поддержания веса.</p>'):'') :
      empty(p.special?'Доступны дневники питания и воды':'Заполните данные для расчёта',p.special?'Автоматический ориентир КБЖУ отключён настройкой профиля.':'Укажите пол, возраст, рост и вес, затем сохраните профиль.'))+
    '</section><section class="card section"><div class="card-head">'+spot('lock')+'<h2>Сохранение данных</h2></div>'+
    '<div id="sync-details"></div><div class="divider"></div><div class="row-actions">'+
    btn('Скачать дневник','export-diary','secondary button-sm')+
    btn('Загрузить дневник','choose-backup','secondary button-sm')+
    '<input type="file" id="diary-backup" accept=".json,application/json" hidden>'+
    btn('О расчётах','about','quiet button-sm','book')+btn('Удалить мои данные','erase-data','quiet button-sm','trash')+'</div></section></div></div>';
}
function updateAccount(){
  const signed=connection!=='local';
  el('account').innerHTML='<button class="quiet" type="button" data-nav="profile">'+spot('user')+
    '<span><b>'+esc(state.profile?.name||'Мой профиль')+'</b><br><small class="muted">'+(signed?'Личный кабинет':'На этом устройстве')+'</small></span></button>';
  const details=el('sync-details');
  if(!details)return;
  if(standalone){
    details.innerHTML='<p class="muted">Профиль и записи сохраняются в этом браузере. Чтобы перенести их на другое устройство, скачайте дневник, затем загрузите его там.</p>';
    return;
  }
  details.innerHTML=signed?
    '<p class="muted">'+(connection==='synced'?'Дневники доступны в этом личном кабинете при входе в тот же аккаунт ChatGPT.':
      connection==='conflict'?'Дневник изменился на другом устройстве. Можно сохранить изменения из этого окна или обновить страницу для загрузки сохранённой версии.':
      'Последние изменения ожидают синхронизации. Оставьте страницу открытой и повторите сохранение.')+'</p>'+
      '<div class="row-actions" style="margin-top:10px">'+(connection==='synced'?'':btn('Повторить сохранение','retry-sync','secondary button-sm','refresh'))+accountSignOut+'</div>':
    '<p class="muted">Профиль и записи хранятся в этом браузере. Войдите, чтобы открывать личный дневник на других устройствах.</p><div style="margin-top:11px">'+accountSignIn+'</div>';
}
const metrics=[['weight','Вес'],['food','Калории'],['water','Вода']];
const periods=[['7','7 дн.'],['30','30 дн.'],['6m','6 мес.']];
const metricNames={weight:'кг',food:'ккал',water:'мл'};
function segments(items,active,action,label){
  return '<div class="segments" role="group" aria-label="'+label+'">'+items.map(([id,title])=>
    btn(title,action,'segment','','data-id="'+id+'" aria-pressed="'+(id===active)+'"')).join('')+'</div>';
}
function progressView(){
  const series=metricSeries(state.days,date,period,metric);
  const goal=targets(state.profile);
  const unit=metricNames[metric];
  const average=metricAverage(series);
  const weight=recentWeight(state.days,date);
  const isWeight=metric==='weight';
  const current=isWeight?weight?.value:average.values?.[0];
  const target=metric==='food'?goal?.kcal:metric==='water'?waterGoal():null;
  const totalLabel={7:'Среднее за 7 дней',30:'Среднее за 30 дней','6m':'Среднее за 6 месяцев'}[period];
  const periodWeights=series.filter(point=>point.values);
  const delta=isWeight&&periodWeights.length>1?periodWeights.at(-1).values[0]-periodWeights[0].values[0]:null;
  const description=isWeight?(weight?'Запись за '+formatDay(weight.key):'Добавьте первое измерение веса.'):
    (average.count?'Дней с записями — '+average.count+' из '+series.length:'За этот период пока нет записей.');
  const value=current===undefined?'—':isWeight?d(current):n(current);
  const suffix=isWeight?unit:unit+' / день'+(target?' из '+n(target):'');
  const summary='<article class="card metric-summary"><div class="card-head">'+spot(isWeight?'scale':metric==='food'?'flame':'water',metric==='water'?'blue':'rose')+
    '<h2>'+(isWeight?'Последнее взвешивание':totalLabel)+'</h2>'+
    (isWeight?btn(day().weight?'Изменить вес':'Записать вес','weight-form','secondary button-sm push',day().weight?'edit':'plus'):'')+'</div>'+
    '<div class="metric-value"><strong>'+value+'</strong> <span>'+suffix+'</span></div>'+
    '<p class="muted small">'+description+'</p>'+
    (isWeight&&delta!==null?'<p class="notice">Изменение за период '+(delta>0?'+':'')+d(delta)+' кг</p>':'')+
    (!isWeight&&average.values&&target?progress(current,target,'Среднее к дневной цели',metric==='water'):'')+
    (metric==='water'?'<div class="row-actions weight-actions"><button type="button" class="quiet button-sm" data-nav="water">Открыть дневник воды '+icon('arrow',15)+'</button></div>':'')+
    (metric==='food'&&average.values?macro(average.values.slice(1),goal?.macro,true):'')+'</article>';
  const dated=series.filter(point=>point.values).reverse();
  const details=dated.length?'<details class="metric-data"><summary>Записи за период</summary><ul>'+dated.map(point=>
    '<li><span>'+formatDay(point.key)+'</span><b>'+d(point.values[0])+' '+unit+'</b></li>').join('')+'</ul></details>':'';
  return heading('Прогресс',formatDay(date),dates())+
    segments(metrics,metric,'metric-tab','Показатель')+summary+
    '<section class="card section"><div class="section-head"><h2>'+(isWeight?'Динамика веса':'По дням')+'</h2>'+
      segments(periods,period,'metric-period','Период')+'</div>'+metricChart(series,metric,target)+
      (target&&dated.length?'<p class="muted small">Пунктир — дневная цель '+n(target)+' '+unit+'.</p>':'')+details+'</section>';
}
function showWeightForm(){
  const current=day().weight;
  showDialog(current?'Изменить вес':'Записать вес','<p class="muted">'+formatDay(date)+'</p>'+
    '<form id="weight-form"><label class="field">Вес, кг<input name="weight" type="number" inputmode="decimal" min="1" max="500" step="0.1" required value="'+(current??'')+'"></label>'+
    '<div class="row-actions weight-actions"><button type="submit" class="primary">Сохранить вес</button>'+
    (current?btn('Удалить измерение','delete-weight','quiet button-sm','trash'):'')+'</div></form>');
}
function showQuickAdd(){
  showDialog('Добавить запись','<p class="muted">'+formatDay(date)+'</p><div class="quick-actions">'+
    btn('Еда','add-food','secondary','menu')+btn('Вес','weight-form','secondary','scale')+'</div>'+
    '<h3>Вода</h3><div class="water-actions">'+[200,250,300].map(ml=>
      btn('+ '+ml+' мл','quick-water','','','data-ml="'+ml+'"')).join('')+'</div>');
}
function navButton([id,label,short,glyph]){
  return '<button type="button" data-nav="'+id+'" aria-label="'+label+'" title="'+label+'" '+(page===id?'aria-current="page"':'')+'>'+
    icon(glyph)+'<span class="nav-full">'+label+'</span><span class="nav-short">'+short+'</span></button>';
}
function render(){
  el('crumb').textContent=nav.find(([id])=>id===page)[1];
  el('nav').innerHTML=nav.map(navButton).join('')+
    btn('Добавить запись','quick-add','nav-desktop-add','plus');
  const mobile=['journal','progress','quick','menu','profile'];
  el('mobile-nav').innerHTML=mobile.map(id=>id==='quick'?
    btn('','quick-add','mobile-add','plus','aria-label="Быстро добавить запись"'):
    navButton(nav.find(item=>item[0]===id))).join('');
  el('view').innerHTML=({today:dashboard,menu:menuView,journal:journalView,water:waterView,progress:progressView,profile:profileView})[page]();
  updateAccount();
}
function showDialog(title,body){
  el('dialog-body').innerHTML='<div class="dialog-head"><h2 id="dialog-title">'+esc(title)+'</h2>'+square('Закрыть окно','close','close')+'</div><div class="dialog-body">'+body+'</div>';
  if(!el('dialog').open)el('dialog').showModal();
}
function closeDialog(){el('dialog').close();}
function showRecipe(m,index,tab='ingredients'){
  activeRecipe={m,index,tab};
  const favorite=state.favorites.includes(m.index);
  const list=m.ingredients.map(x=>'<div class="ingredient"><span>'+esc(foods[x.id][0])+'</span><span>'+d(x.g)+' г</span></div>').join('');
  const full=m.ingredients.length===Object.keys(recipes[m.index][3]).length;
  const description=full?m.description:'Подготовьте продукты из списка. Готовьте по основному рецепту, пропуская исключённые ингредиенты. Фото показывает вариант блюда с полным составом.';
  const steps='<ol class="recipe-steps">'+cookingSteps(full?description:m.description).map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol>';
  const numbers=['Калории','Белки','Жиры','Углеводы'].map((label,i)=>
    '<div><span>'+label+'</span><b>'+d(m.stats[i])+' <small>'+(i?'г':'ккал')+'</small></b></div>').join('');
  showDialog(m.title,'<div class="recipe-photo"><img class="dialog-meal-img" src="./assets/meal-'+m.index+'.webp" alt="'+esc(m.title)+'">'+
    '<button type="button" class="icon-button favorite-button" data-action="favorite-recipe" aria-pressed="'+favorite+'" aria-label="Избранный рецепт">'+icon('heart')+'</button></div>'+
    '<div class="recipe-meta"><span>'+icon('clock',16)+'≈ '+recipeMinutes[m.index]+' мин</span>'+
    '<span>'+icon('scale',16)+'Готовая порция '+(m.estimated?'≈ ':'')+n(m.grams)+' г</span></div>'+
    (m.porridgeGrams?'<p class="muted small">Готовая каша без добавок ≈ '+n(m.porridgeGrams)+' г.</p>':'')+
    '<div class="recipe-macros" aria-label="КБЖУ на порцию">'+numbers+'</div>'+
    segments([['ingredients','Ингредиенты'],['steps','Приготовление']],tab,'recipe-tab','Раздел рецепта')+
    (tab==='ingredients'?'<div aria-label="Ингредиенты">'+list+'</div>':(!full?'<p class="muted small">'+esc(description)+'</p>':'')+steps)+
    '<div class="recipe-footer">'+btn('Добавить в дневник','log-meal','primary','plus','data-index="'+index+'"')+'</div>');
}
function addWater(ml){
  const next=day();
  const time=new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'}).format(new Date());
  writeDay({...next,water:[...next.water,{id:uid(),ml,time}]});
  const action='[data-action="add-water"][data-ml="'+ml+'"]';
  const keepFocus=document.activeElement?.matches(action);
  render();if(keepFocus)document.querySelector(action)?.focus();
  notify('Добавлено '+ml+' мл воды.');
}
function logMeal(m){
  activeRecipe=null;
  if(!m.estimated){
    openDraft({tab:'catalog',slot:m.slot,items:m.ingredients.map(x=>({...x})),name:m.title});
    return;
  }
  const [k,p,f,c]=m.stats.map(value=>value*100/m.grams);
  openDraft({tab:'catalog',slot:m.slot,manual:{g:m.grams,k,p,f,c,recipe:true},name:m.title});
}
const foodName=item=>foods[item.id]?.[0]??productName(item);
function entryTotals(draft){
  const valid=draft.items.filter(x=>Number.isFinite(x.g)&&x.g>0&&x.g<=3000);
  const local=total(valid.filter(x=>foods[x.id]));
  const external=valid.filter(x=>x.product).reduce((stats,x)=>sum(stats,x.product.stats.map(v=>v*x.g/100)),local);
  const saved=draft.manual;
  return saved&&saved.g>0?sum(external,[saved.k,saved.p,saved.f,saved.c].map(v=>(v||0)*saved.g/100)):external;
}
function openDraft(existing){
  mealDraft={tab:'text',slot:0,items:[],manual:null,name:'',text:'',query:'',unknown:[],online:null,matches:[],photo:null,busy:false,error:'',...existing};
  renderDraft();
}
function resultPanel(){
  const rows=mealDraft.items.map((x,i)=>'<div class="food-row"><span>'+esc(foodName(x))+
    (x.product?'<br><small class="muted">'+esc(x.product.brand||'Open Food Facts')+'</small>':'')+'</span>'+
    '<input class="grams" type="number" inputmode="decimal" min="0.1" max="3000" step="0.1" value="'+(x.g||'')+'" placeholder="г" aria-label="Вес, '+esc(foodName(x))+'" data-index="'+i+'">'+
    square('Убрать продукт','remove-food','close','data-index="'+i+'"')+'</div>').join('');
  const saved=mealDraft.manual;
  const portion=saved?'<label class="field">Вес '+(saved.recipe?'готовой порции':'сохранённой порции')+', г'+
    '<input class="saved-grams" type="number" min="0.1" max="3000" step="0.1" inputmode="decimal" value="'+(saved.g||'')+'"></label>'+
    '<p class="small muted">КБЖУ пересчитывается по весу порции.</p>':'';
  return (rows?'<div class="food-rows">'+rows+'</div>':'')+portion+
    '<div id="entry-total" class="result-line">'+statsText(entryTotals(mealDraft))+'</div>';
}
function onlineResults(result,list,index=0){
  const action=list?'pick-description-online':'pick-online';
  return '<p class="small muted" role="status">'+searchNote(result)+'</p>'+
    '<div class="online-results">'+result.products.map((product,i)=>
      btn('<span><b>'+esc(product.name)+'</b>'+(product.brand?' · '+esc(product.brand):'')+
        '<br><small>'+statsText(product.stats)+' / 100 г</small></span>',action,'secondary button-sm','plus',
        'data-index="'+i+'" data-id="'+index+'"')).join('')+'</div>';
}
function catalogResults(){
  const keys=foodSearch(mealDraft.query).slice(0,12);
  const local=keys.length?'<div class="product-chips">'+keys.map(id=>btn(esc(foods[id][0]),'pick-food','chip','plus','data-id="'+id+'"')).join('')+'</div>':'';
  const query=mealDraft.query.trim();
  if(query.length<2)return local;
  const result=mealDraft.online;
  return local+'<div class="row-actions">'+btn('Искать в справочнике','lookup-food','quiet button-sm','spark')+'</div>'+
    (result?.label===query?onlineResults(result,false):'');
}
function descriptionResults(draft){
  return draft.unknown.map((result,index)=>'<div class="notice"><b>'+esc(result.label)+'</b>'+
    (result.clarify?'<p>Укажите, на воде или на молоке приготовлена каша.</p>':
      result.notSearched?'<p>Поищите этот продукт по названию во вкладке «Из списка».</p>':onlineResults(result,true,index))+'</div>').join('');
}
async function lookupResult(result,controller){
  try {result.products=await findProducts(result.label,controller.signal);}
  catch {if(!controller.signal.aborted)result.error=true;}
  finally {result.loading=false;}
}
function refreshLookup(id,html){
  const container=el(id);
  if(container)container.innerHTML=html;
}
async function lookupCatalog(draft){
  draft.catalogAbort?.abort();
  const label=draft.query.trim();
  if(label.length<2||label.length>100)return;
  const controller=new AbortController();
  const result={label,loading:true,products:[]};
  draft.catalogAbort=controller;
  draft.online=result;
  refreshLookup('catalog-results',catalogResults());
  await lookupResult(result,controller);
  if(mealDraft===draft&&draft.online===result)refreshLookup('catalog-results',catalogResults());
}
async function lookupDescription(draft){
  draft.descriptionAbort?.abort();
  const controller=new AbortController();
  draft.descriptionAbort=controller;
  const parsed=parseFood(draft.text);
  draft.items=[...draft.items.filter(x=>!x.parsed),...parsed.items.map(x=>({...x,parsed:true}))];
  const unknown=parsed.unknown.map((item,i)=>({...item,products:[],notSearched:i>=4,loading:!item.clarify&&i<4}));
  draft.unknown=unknown;
  renderDraft();
  if(!parsed.items.length&&!unknown.length){entryError('Опишите блюдо или продукты и укажите граммы.');return;}
  await Promise.all(unknown.filter(item=>item.loading).map(async item=>{
    await lookupResult(item,controller);
    if(mealDraft===draft&&draft.unknown===unknown&&!controller.signal.aborted)refreshLookup('description-results',descriptionResults(draft));
  }));
}
function photoResults(){
  if(mealDraft.busy)return '<p class="notice" role="status">Анализируем фото… При первом запуске браузер загружает модель.</p>';
  if(mealDraft.error)return '<p class="notice error" role="alert">'+esc(mealDraft.error)+'</p>';
  if(!mealDraft.matches.length)return '';
  return '<p class="small muted">Выберите подходящий вариант или найдите продукты блюда в справочнике. Вес порции укажите перед сохранением.</p><div class="product-chips">'+
    mealDraft.matches.map((m,i)=>btn(esc(m.name),'choose-photo','chip','plus','data-index="'+i+'"')).join('')+'</div>';
}
function renderDraft(){
  const draft=mealDraft;
  const tabs=[['text','По описанию'],['photo','По фото'],['catalog','Из списка']];
  const tabbar='<div class="tabbar" role="tablist" aria-label="Способ добавления">'+tabs.map(([id,label])=>
    '<button type="button" role="tab" aria-selected="'+(draft.tab===id)+'" data-action="draft-tab" data-id="'+id+'">'+label+'</button>').join('')+'</div>';
  const text='<label class="field">Что вы съели<textarea id="food-description" rows="2" maxlength="900" placeholder="Например, овсянка на молоке 200 г, банан 70 г">'+esc(draft.text)+'</textarea></label>'+
    btn('Найти продукты и КБЖУ','parse-food','secondary','spark')+
    '<p class="small muted">Названия незнакомых продуктов ищем в Open Food Facts.</p>'+
    '<div id="description-results">'+descriptionResults(draft)+'</div>';
  const photo='<div class="upload-area">'+icon('camera',25)+'<label for="food-photo">Загрузить фото блюда</label>'+
    '<input type="file" id="food-photo" accept="image/*">'+(draft.photo?'<img class="photo-preview" alt="Загруженное блюдо" src="'+esc(draft.photo)+'">':'')+
    '<p class="small muted">Фото обрабатывается в браузере. Модель предлагает варианты из 101 категории. Выберите подходящий вариант и укажите вес порции.</p></div>'+photoResults();
  const catalog='<label class="field">Продукт<input type="search" id="food-search" value="'+esc(draft.query)+'" placeholder="Начните вводить название"></label><div id="catalog-results">'+catalogResults()+'</div>';
  const methods=draft.manual?'':tabbar+'<div class="dialog-body" role="tabpanel">'+({text,photo,catalog})[draft.tab]+'</div>';
  showDialog(draft.edit?'Изменить запись':'Добавить запись',methods+
    '<div id="entry-panel">'+resultPanel()+'</div><div class="fields"><label class="field">Название записи<input id="entry-name" maxlength="90" value="'+esc(draft.name)+'" placeholder="Автоматически из состава"></label>'+
    '<label class="field">Приём пищи<select id="entry-slot">'+categories.map((name,i)=>'<option value="'+i+'" '+(i===draft.slot?'selected':'')+'>'+name+'</option>').join('')+'</select></label></div>'+
    '<p id="entry-error" class="notice error" role="alert" hidden></p>'+
    '<div class="row-actions">'+btn('Сохранить запись','save-entry','primary','check')+'</div>');
}
function entryError(text){const box=el('entry-error');box.textContent=text;box.hidden=false;}
function saveEntry(){
  const draft=mealDraft;
  const manual=draft.manual;
  if(!draft.items.length&&!manual){entryError('Найдите продукт по названию, фото или в списке.');return;}
  if(draft.items.some(x=>!Number.isFinite(x.g)||x.g<=0||x.g>3000)||
      (manual&&(!(manual.g>0&&manual.g<=3000)||!Number.isFinite(manual.k)||manual.k<0||manual.k>1000||
      ['p','f','c'].some(k=>!Number.isFinite(manual[k])||manual[k]<0||manual[k]>100)))) {
    entryError('Укажите вес каждой позиции от 0,1 до 3000 г.');return;
  }
  const record={id:draft.edit||uid(),name:draft.name.trim()||draft.items.map(foodName).join(', ').slice(0,90)||'Блюдо',
    slot:draft.slot,items:draft.items,manual,stats:entryTotals(draft),grams:draft.items.reduce((s,x)=>s+x.g,0)+(manual?.g||0)};
  const next=day();
  const entries=draft.edit?next.entries.map(x=>x.id===draft.edit?record:x):[...next.entries,record];
  writeDay({...next,entries});
  closeDialog();render();notify(draft.edit?'Запись обновлена.':'Запись добавлена в дневник.');
}
async function loadPhoto(file){
  if(!file||!mealDraft)return;
  const draft=mealDraft;
  if(draft.photo)URL.revokeObjectURL(draft.photo);
  draft.photo=null;draft.matches=[];draft.error='';draft.busy=false;
  if(file.size>20*1024*1024){
    draft.error='Выберите изображение размером до 20 МБ.';
    renderDraft();return;
  }
  const url=URL.createObjectURL(file);
  draft.photo=url;draft.busy=true;renderDraft();
  try{
    const image=new Image();
    image.src=url;
    await image.decode();
    const {recognize}=await import('./photo.js');
    const matches=await recognize(image);
    if(draft.photo===url)draft.matches=matches;
  }catch{
    if(draft.photo===url)draft.error='Не удалось проанализировать фото. Попробуйте JPEG или PNG либо внесите состав по описанию.';
  }finally{
    if(draft.photo===url){
      draft.busy=false;
      if(mealDraft===draft&&draft.tab==='photo'&&el('dialog').open)renderDraft();
    }
  }
}
function about(){
  showDialog('О расчётах и данных','<p>Ориентир энергии для взрослых 19–78 лет рассчитывается по формуле Миффлина — Сан Жеора с коэффициентом активности. Для снижения веса используется дефицит до 10% при ИМТ от 25. Это ориентировочный расчёт.</p>'+
    '<p>Для целей БЖУ используется соотношение 25% белков, 30% жиров, 45% углеводов по энергии. Значения продуктов взяты из USDA FoodData Central и маркировки производителя творога 5%. Расширенный справочник содержит данные Open Food Facts под лицензией <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL</a>. КБЖУ указано на 100 г и пересчитывается по весу порции. Фото обрабатываются на устройстве. Овсянка на молоке и блюда меню рассчитаны по составу рецепта. Пищевая ценность готовой порции зависит от состава и выхода блюда.</p>'+
    '<p>Цель по воде можно изменить. Начальное значение — настройка трекера. Фото обрабатывается на устройстве, и для записи нужно подтвердить блюдо и вес.</p>'+
    '<p>'+(standalone?'Данные сохраняются в этом браузере. Можно скачать файл дневника и загрузить его на другом устройстве.':'В гостевом режиме данные сохраняются в этом браузере. При входе через ChatGPT записи сохраняются в личном кабинете.')+' Удалить данные можно в настройках профиля.</p>'+
    '<ul><li><a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noreferrer">Формула Миффлина — Сан Жеора</a></li>'+
    '<li><a href="https://fdc.nal.usda.gov/" target="_blank" rel="noreferrer">Справочник USDA FoodData Central</a></li>'+
    '<li><a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">Open Food Facts</a></li>'+
    '<li><a href="'+foods.cottage5[2]+'" target="_blank" rel="noreferrer">Пищевая ценность творога 5%</a></li>'+
    '<li><a href="https://huggingface.co/AlexKoff88/mobilenet_v2_food101" target="_blank" rel="noreferrer">Модель распознавания MobileNet Food-101</a> · <a href="./assets/food101-LICENSE.txt" target="_blank">лицензия</a></li></ul>');
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action],button[data-nav]');
  if(!button)return;
  if(button.dataset.nav){go(button.dataset.nav);return;}
  const {action,id,index,ml,date:jump}=button.dataset;
  switch(action){
    case 'metric-tab':metric=id;render();document.querySelector('[data-action="metric-tab"][aria-pressed=true]')?.focus();break;
    case 'metric-period':period=id;render();document.querySelector('[data-action="metric-period"][aria-pressed=true]')?.focus();break;
    case 'quick-add':showQuickAdd();break;
    case 'quick-water':closeDialog();addWater(Number(ml));break;
    case 'weight-form':showWeightForm();break;
    case 'delete-weight':{
      const {weight,...next}=day();
      writeDay(next);closeDialog();render();notify('Измерение удалено.');break;
    }
    case 'about':about();break;
    case 'close':closeDialog();break;
    case 'date-back':date=dayShift(date,-1);render();break;
    case 'date-forward':date=dayShift(date,1);render();break;
    case 'jump-date':date=jump;render();break;
    case 'add-water':addWater(Number(ml));break;
    case 'del-water':{
      const next=day();
      writeDay({...next,water:next.water.filter(x=>x.id!==id)});render();notify('Запись о воде удалена.');break;
    }
    case 'product': {
      const active=state.selected.includes(id);
      state.selected=active?state.selected.filter(k=>k!==id):[...state.selected,id];
      button.setAttribute('aria-pressed',String(!active));
      button.innerHTML=icon(active?'plus':'check',12)+esc(foods[id][0]);
      el('product-count').textContent=state.selected.filter(k=>planProducts.includes(k)).length;
      if(state.menu)el('menu-stale').hidden=showRecipeBook||(state.menu.selected.length===state.selected.length&&state.selected.every(key=>state.menu.selected.includes(key)));
      persist();break;
    }
    case 'select-all':state.selected=[...allProducts];persist();render();break;
    case 'select-none':state.selected=[];persist();render();break;
    case 'toggle-recipes':showRecipeBook=!showRecipeBook;favoritesOnly=false;render();break;
    case 'toggle-favorites':favoritesOnly=!favoritesOnly;render();break;
    case 'recipe-tab':{
      const {m,index}=activeRecipe;
      showRecipe(m,index,id);
      el('dialog').querySelector('[data-action="recipe-tab"][aria-pressed=true]')?.focus();
      break;
    }
    case 'favorite-recipe':{
      const {m,index,tab}=activeRecipe;
      const saved=state.favorites.includes(m.index);
      state.favorites=saved?state.favorites.filter(id=>id!==m.index):[...state.favorites,m.index];
      persist();
      showRecipe(m,index,tab);
      el('dialog').querySelector('[data-action="favorite-recipe"]')?.focus();
      break;
    }
    case 'build-menu':
    case 'vary-menu':{
      showRecipeBook=false;
      const variation=action==='vary-menu'?(state.menu?.variation??0)+1:0;
      state.menu={selected:[...state.selected],kcal:targets(state.profile)?.kcal??0,variation};
      persist();render();break;
    }
    case 'recipe':if(viewMeals[index])showRecipe(viewMeals[index],index);break;
    case 'log-meal':if(activeRecipe)logMeal(activeRecipe.m);else if(viewMeals[index])logMeal(viewMeals[index]);break;
    case 'add-food':openDraft();break;
    case 'edit-entry':{
      const entry=day().entries.find(x=>x.id===id);
      if(entry)openDraft({tab:'catalog',edit:entry.id,slot:entry.slot,name:entry.name,items:entry.items.map(x=>({...x})),manual:entry.manual&&{...entry.manual}});
      break;
    }
    case 'del-entry':{
      const next=day();
      writeDay({...next,entries:next.entries.filter(x=>x.id!==id)});render();notify('Запись удалена.');break;
    }
    case 'draft-tab':mealDraft.tab=id;renderDraft();el('dialog').querySelector('[aria-selected=true]')?.focus();break;
    case 'parse-food':await lookupDescription(mealDraft);break;
    case 'lookup-food':await lookupCatalog(mealDraft);break;
    case 'pick-online':
    case 'pick-description-online':{
      const fromText=action==='pick-description-online';
      const result=fromText?mealDraft.unknown[Number(id)]:mealDraft.online;
      const product=result?.products[Number(index)];
      if(!product)break;
      mealDraft.items.push({product,g:result.g??0,parsed:fromText});
      if(fromText)mealDraft.unknown.splice(Number(id),1);
      renderDraft();
      Array.from(el('dialog').querySelectorAll('.grams')).at(-1)?.focus();
      break;
    }
    case 'pick-food':mealDraft.items.push({id,g:0});renderDraft();Array.from(el('dialog').querySelectorAll('.grams')).at(-1)?.focus();break;
    case 'remove-food':mealDraft.items.splice(Number(index),1);renderDraft();break;
    case 'choose-photo':{
      const m=mealDraft.matches[index];
      mealDraft.name=m.name;
      mealDraft.items=mealDraft.items.filter(x=>!x.photo);
      if(m.id) mealDraft.items.push({id:m.id,g:0,photo:true});
      else{mealDraft.tab='catalog';mealDraft.query=m.name;}
      renderDraft();
      if(m.id)el('dialog').querySelector('.grams[data-index="'+(mealDraft.items.length-1)+'"]')?.focus();
      else{el('food-search')?.focus();await lookupCatalog(mealDraft);}
      break;
    }
    case 'save-entry':saveEntry();break;
    case 'export-diary':exportDiary();break;
    case 'choose-backup':el('diary-backup').click();break;
    case 'import-diary':{
      if(!pendingDiary)break;
      const saved=importDiary(pendingDiary,updateAccount);
      pendingDiary=null;
      closeDialog();render();
      notify(saved?'Дневник загружен.':'Дневник открыт. Браузер не смог сохранить записи.');
      break;
    }
    case 'retry-sync':await sync(updateAccount);break;
    case 'erase-data':
      showDialog('Удалить данные?','<p>Будут удалены профиль, меню, избранное и записи питания, веса и воды, доступные в этом кабинете.</p>'+
        '<div class="row-actions">'+btn('Удалить данные','confirm-erase','danger','trash')+btn('Отмена','close','quiet')+'</div>');break;
    case 'confirm-erase':
      button.disabled=true;
      try{await erase();closeDialog();render();notify('Данные удалены.');}
      catch{button.disabled=false;notify('Удаление не завершилось. Повторите попытку.');}
      break;
  }
});
document.addEventListener('input',event=>{
  const field=event.target;
  if(field.id==='product-search'){productQuery=field.value;el('products').innerHTML=productControls();return;}
  if(!mealDraft)return;
  if(field.id==='food-description'){
    mealDraft.descriptionAbort?.abort();
    mealDraft.unknown=[];
    mealDraft.text=field.value;
    refreshLookup('description-results','');
  }
  if(field.id==='entry-name')mealDraft.name=field.value;
  if(field.id==='food-search'){mealDraft.catalogAbort?.abort();mealDraft.online=null;mealDraft.query=field.value;el('catalog-results').innerHTML=catalogResults();}
  if(field.classList.contains('grams'))mealDraft.items[field.dataset.index].g=field.valueAsNumber;
  if(field.classList.contains('saved-grams'))mealDraft.manual.g=field.valueAsNumber;
  if(field.matches('.grams,.saved-grams'))el('entry-total').textContent=statsText(entryTotals(mealDraft));
});
document.addEventListener('change',event=>{
  const field=event.target;
  if(field.id==='diary-backup'){
    const file=field.files?.[0];
    field.value='';
    reviewDiary(file);
  }
  if(field.id==='date'&&field.value&&field.value<=dateKey()){date=field.value;render();}
  if(field.id==='entry-slot'&&mealDraft)mealDraft.slot=Number(field.value);
  if(field.id==='food-photo')loadPhoto(field.files?.[0]);
});
document.addEventListener('submit',event=>{
  if(event.target.id==='weight-form'){
    event.preventDefault();
    const weight=Number(new FormData(event.target).get('weight'));
    if(!Number.isFinite(weight)||weight<1||weight>500)return;
    writeDay({...day(),weight});
    closeDialog();render();notify('Вес сохранён.');return;
  }
  if(event.target.id!=='profile-form')return;
  event.preventDefault();
  const form=new FormData(event.target);
  const number=k=>form.get(k)===''?null:Number(form.get(k));
  const p={name:String(form.get('name')).trim(),sex:form.get('sex'),age:number('age'),height:number('height'),weight:number('weight'),
    activity:number('activity'),goal:form.get('goal'),water:number('water'),special:form.has('special')};
  state.profile=p;
  if(state.menu)state.menu.kcal=targets(p)?.kcal??0;
  persist();render();
  notify(targets(p)?'Профиль сохранён. КБЖУ рассчитано.':'Профиль сохранён.');
});
el('dialog').addEventListener('close',()=>{
  mealDraft?.catalogAbort?.abort();
  mealDraft?.descriptionAbort?.abort();
  pendingDiary=null;
  if(mealDraft?.photo)URL.revokeObjectURL(mealDraft.photo);
  mealDraft=null;
  if(activeRecipe&&page==='menu'&&showRecipeBook&&favoritesOnly)render();
  activeRecipe=null;
});
el('dialog').addEventListener('click',event=>{if(event.target===el('dialog'))closeDialog();});
window.addEventListener('hashchange',()=>{
  const next=route();
  if(next===page)return;
  if(el('dialog').open)closeDialog();
  page=next;window.scrollTo(0,0);render();el('main').focus({preventScroll:true});
});
document.querySelector('.top-profile').innerHTML=icon('user',19);
render();
if(!standalone)init(()=>{if(!el('dialog').open)render();else updateAccount();});
