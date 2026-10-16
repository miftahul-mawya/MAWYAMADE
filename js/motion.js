/* Motion layer: reliable reveal-on-scroll, including cards rendered after page load. */
(function(){
  document.documentElement.classList.add('reveal-ready');
  const selector='.section-head,.category-strip,.filter-row,.recipe-card,.feature-copy,.community-panel,.owner-card,.mega-card';
  const seen=new WeakSet();
  let io=null;
  if('IntersectionObserver' in window){
    io=new IntersectionObserver(entries=>entries.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target);}
    }),{threshold:0.06,rootMargin:'0px 0px 40px 0px'});
  }
  function watch(root){
    if(!root)return;
    if(root.nodeType===1 && root.matches && root.matches(selector)) add(root);
    if(root.querySelectorAll) root.querySelectorAll(selector).forEach(add);
  }
  function add(el){
    if(seen.has(el))return;
    seen.add(el);
    if(io){
      el.style.transitionDelay=(Math.min((el.parentElement?.children ? Array.prototype.indexOf.call(el.parentElement.children,el):0)%6,5)*45)+'ms';
      io.observe(el);
    }else el.classList.add('in-view');
  }
  watch(document);
  /* Recipe filters replace card nodes dynamically; observe every new card too. */
  const mutationObserver=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
    if(node.nodeType===1)watch(node);
  })));
  mutationObserver.observe(document.body,{childList:true,subtree:true});
  /* Guard against a blank recipe grid if animations are disabled or observer fails. */
  window.setTimeout(()=>{
    document.querySelectorAll('.recipe-card:not(.in-view),.mega-card:not(.in-view)').forEach(el=>{
      if(!el.isConnected)return;
      const r=el.getBoundingClientRect();
      if(r.top<window.innerHeight+80 && r.bottom>-80)el.classList.add('in-view');
    });
  },900);
  const art=document.querySelector('.hero-art');
  if(art&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!matchMedia('(max-width:700px)').matches){
    document.addEventListener('pointermove',e=>{
      const r=art.getBoundingClientRect();
      if(e.clientX<r.left-120||e.clientX>r.right+120||e.clientY<r.top-120||e.clientY>r.bottom+120)return;
      const x=(e.clientX-(r.left+r.width/2))/r.width,y=(e.clientY-(r.top+r.height/2))/r.height;
      art.style.setProperty('--px',(x*7)+'px');art.style.setProperty('--py',(y*7)+'px');
      art.style.transform=`translate3d(${x*5}px,${y*5}px,0)`;
    });
  }
})();
