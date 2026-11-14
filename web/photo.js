import {foods} from './catalog.js';
// Alphabetical Food-101 classes used by the Torchvision training checkpoint.
const names=[
'Яблочный пирог','Свиные рёбрышки','Пахлава','Карпаччо из говядины','Тартар из говядины','Свекольный салат','Пончики бенье','Пибимпап','Хлебный пудинг','Буррито на завтрак','Брускетта','Салат цезарь','Канноли','Капрезе','Морковный торт','Севиче','Чизкейк','Сырная тарелка','Курица карри','Кесадилья с курицей','Куриные крылышки','Шоколадный торт','Шоколадный мусс','Чуррос','Суп с моллюсками','Клаб-сэндвич','Крабовые котлеты','Крем-брюле','Крок-мадам','Капкейки','Фаршированные яйца','Пончики','Пельмени или клёцки','Эдамаме','Яйца бенедикт','Улитки','Фалафель','Филе-миньон','Рыба с картофелем фри','Фуа-гра','Картофель фри','Французский луковый суп','Французский тост','Жареные кальмары','Жареный рис','Замороженный йогурт','Чесночный хлеб','Ньокки','Греческий салат','Сэндвич с сыром','Лосось на гриле','Гуакамоле','Гёдза','Гамбургер','Кисло-острый суп','Хот-дог','Яйца по-мексикански','Хумус','Мороженое','Лазанья','Суп из лобстера','Ролл с лобстером','Макароны с сыром','Пирожные макарон','Мисо-суп','Мидии','Начос','Омлет','Луковые кольца','Устрицы','Пад-тай','Паэлья','Блины или панкейки','Панна-котта','Утка по-пекински','Суп фо','Пицца','Свиная отбивная','Путин (картофель с сыром)','Ростбиф','Сэндвич с рваной свининой','Рамен','Равиоли','Торт «Красный бархат»','Ризотто','Самоса','Сашими','Морские гребешки','Салат из морских водорослей','Креветки с кукурузной кашей','Спагетти болоньезе','Спагетти карбонара','Спринг-роллы','Стейк','Клубничный торт','Суши','Тако','Такояки','Тирамису','Тартар из тунца','Вафли'];
const mapped={57:'hummus',58:'icecream',72:'pancake',76:'pizza'};
let sessionPromise;
export async function recognize(image) {
  const ort=await import('./assets/ort.wasm.min.mjs');
  if(!sessionPromise) {
    ort.env.wasm.numThreads=1;
    ort.env.wasm.wasmPaths=new URL('./assets/',import.meta.url).href;
    sessionPromise=ort.InferenceSession.create('./assets/food101-trained.onnx',{executionProviders:['wasm']})
      .catch(error=>{sessionPromise=null;throw error;});
  }
  const side=224;
  const pixels=side*side;
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=side;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const crop=Math.min(image.naturalWidth,image.naturalHeight)*224/256;
  ctx.drawImage(image,(image.naturalWidth-crop)/2,(image.naturalHeight-crop)/2,crop,crop,0,0,side,side);
  const rgba=ctx.getImageData(0,0,side,side).data;
  const data=new Float32Array(pixels*3);
  const mean=[.485,.456,.406], deviation=[.229,.224,.225];
  for(let i=0;i<pixels;i++) for(let c=0;c<3;c++) data[c*pixels+i]=(rgba[i*4+c]/255-mean[c])/deviation[c];
  const session=await sessionPromise;
  const result=await session.run({input:new ort.Tensor('float32',data,[1,3,side,side])});
  const logits=Array.from(result.output1.data);
  const peak=Math.max(...logits);
  const scores=logits.map(v=>Math.exp(v-peak));
  const norm=scores.reduce((a,b)=>a+b,0);
  return scores.map((score,i)=>({name:names[i],id:foods['dish'+i]?'dish'+i:mapped[i],confidence:score/norm}))
    .sort((a,b)=>b.confidence-a.confidence).slice(0,3);
}
