/* Image fallback handler for recipe photos and expanded-library cards. */
(function(){
 const photoSets={
  juice:['photo-1600271886742-f049cd451bba','photo-1513558161293-cdaf765edfd7','photo-1546173159-315724a31696'],
  pizza:['photo-1513104890138-7c749659a591','photo-1579751626657-72bc17010498'],
  coffee:['photo-1509042239860-f550ce710b93','photo-1495474472287-4d71bcdd2085'],
  shake:['photo-1572490122747-3968b75cc699','photo-1553530666-ba11a7da3888'],
  tea:['photo-1544787219-7f47ccb76574','photo-1571934811356-5cc061b6821f'],
  meals:['photo-1473093295043-cdd812d0e601','photo- pasta'.replace('photo- pasta','photo-1473093295043-cdd812d0e601')]
 };
 const emoji={juice:'🍹',pizza:'🍕',coffee:'☕',shake:'🥤',tea:'🫖',meals:'🍝'};
 document.addEventListener('error',function(e){
  const img=e.target;
  if(!img||img.tagName!=='IMG'||!img.closest('.card-image,.mega-photo'))return;
  const host=img.closest('.card-image,.mega-photo');
  const category=(img.dataset.foodCategory||img.closest('.mega-card')?.dataset.category||'meals').toLowerCase();
  const key=category.includes('juice')||category==='fruit drink'?'juice':category.includes('pizza')?'pizza':category.includes('coffee')?'coffee':category.includes('shake')?'shake':category.includes('tea')?'tea':'meals';
  const ids=photoSets[key]||photoSets.meals;
  const step=Number(img.dataset.fallbackStep||0);
  if(step<ids.length){
    img.dataset.fallbackStep=String(step+1);
    img.src='https://images.unsplash.com/'+ids[step]+'?auto=format&fit=crop&w=900&q=80';
  }else{
    host.classList.add('image-fallback');
    host.dataset.fallbackLabel=emoji[key]||'🍽️';
  }
 },true);
})();
