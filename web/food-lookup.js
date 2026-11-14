const catalogUrl=new URL('./products.json',import.meta.url);
const normalize=value=>value.toLocaleLowerCase('ru').replaceAll('ё','е')
  .replace(/[^\p{L}\p{N}%]+/gu,' ').trim();
let catalogPromise;

function readCatalog() {
  if(!catalogPromise) {
    catalogPromise=fetch(catalogUrl).then(response=>{
      if(!response.ok)throw Error('catalog');
      return response.json();
    }).then(rows=>rows.map(([code,name,brand,stats])=>{
      const title=normalize(name);
      const words=(title+' '+normalize(brand)).trim().split(/\s+/);
      return {code,name,brand,stats,title,words};
    })).catch(error=>{
      catalogPromise=null;
      throw error;
    });
  }
  return catalogPromise;
}

function wordMatches(word,term) {
  if(word===term)return true;
  if(!/^\p{L}{3,}$/u.test(term))return false;
  if(word.startsWith(term))return true;
  const stem=term.replace(/(?:ого|ему|ому|ыми|ими|ами|ями|ов|ев|ей|а|я|ы|и|у|ю|е)$/u,'');
  return stem.length>=3&&word.startsWith(stem);
}

export async function findProducts(label,signal) {
  const query=normalize(label);
  if(query.length<2||query.length>100)return [];
  signal?.throwIfAborted();
  const catalog=await readCatalog();
  signal?.throwIfAborted();
  const terms=query.split(' ');
  const matches=[];
  const seen=new Set();
  for(const product of catalog) {
    if(product.code!==query&&!terms.every(term=>product.words.some(word=>wordMatches(word,term))))continue;
    const key=JSON.stringify([product.title,product.brand.toLowerCase(),product.stats]);
    if(seen.has(key))continue;
    seen.add(key);
    const score=product.code===query?0:product.title===query?1:product.title.startsWith(query+' ')?2:product.title.includes(query)?3:4;
    matches.push({product,score});
  }
  matches.sort((a,b)=>a.score-b.score);
  return matches.slice(0,6).map(({product:{code,name,brand,stats}})=>({code,name,brand,stats}));
}

export const productName=item=>item.product?.name??'';

export function searchNote(result) {
  if(result.loading)return 'Ищем в справочнике Open Food Facts…';
  if(result.error)return 'Справочник временно недоступен. Повторите поиск.';
  return result.products.length?'Выберите нужное совпадение.':'Совпадений с полным КБЖУ нет. Уточните название или марку.';
}
