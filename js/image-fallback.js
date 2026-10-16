(function(){
 const imageSets={
  juice:['photo-1600271886742-f049cd451bba','photo-1513558161293-cdaf765edfd7','photo-1546173159-315724a31696'],
  pizza:['photo-1513104890138-7c749659a591','photo-1579751626657-72bc17010498','photo-1571407970349-bc81e7e96d47'],
  coffee:['photo-1509042239860-f550ce710b93','photo-1495474472287-4d71bcdd2085','photo-1442512595331-e89e73853f31'],
  shake:['photo-1572490122747-3968b75cc699','photo-1553530666-ba11a7da3888','photo-1577805947697-89e18249d767'],
  tea:['photo-1544787219-7f47ccb76574','photo-1571934811356-5cc061b6821f','photo-1576092768241-dec231879fc3'],
  meal:['photo-1473093295043-cdd812d0e601','photo-1476224203421-9ac39bcb3327','photo-1547592180-85f173990554'],
  meals:['photo-1473093295043-cdd812d0e601','photo-1476224203421-9ac39bcb3327','photo-1547592180-85f173990554']
 };
 const emojis={juice:'🍹',pizza:'🍕',coffee:'☕',shake:'🥤',tea:'🫖',meal:'🍝',meals:'🍝'};
 document.addEventListener('error',function(e){const im=e.target;if(!(im instanceof HTMLImageElement)||im.dataset.tryIndex==='done')return;const card=im.closest('.card-image,.hero-image,.feature-visual,.mega-photo,.modal-hero');if(!card)return;const cat=im.dataset.foodCategory||im.closest('.recipe-card')?.dataset.category||'juice';const list=imageSets[cat]||imageSets.juice;let n=Number(im.dataset.tryIndex||0);if(n<list.length){im.dataset.tryIndex=String(n+1);im.src='https://images.unsplash.com/'+list[n]+'?auto=format&fit=crop&w=1000&q=85';return;}im.dataset.tryIndex='done';im.style.display='none';if(!card.querySelector('.image-fallback')){const el=document.createElement('div');el.className='image-fallback';el.style.cssText='position:absolute;inset:0;display:grid;place-items:center;font-size:clamp(58px,9vw,94px);';el.textContent=emojis[cat]||'🍽️';card.appendChild(el);}},true);
})();
