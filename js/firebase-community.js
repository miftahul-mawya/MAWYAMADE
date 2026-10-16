/*
  MAWYAMADE Firebase community.
  1) Fill FIREBASE_CONFIG and ADMIN_EMAIL below.
  2) Follow SETUP.md and deploy Firestore/Storage rules + Cloud Function.
*/
// Firebase modules are loaded dynamically only after a project is configured. This lets local demo login work without Firebase.

const FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_FIREBASE_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_FIREBASE_APP_ID"
};
const ADMIN_EMAIL = "REPLACE_WITH_YOUR_REAL_ADMIN_EMAIL";
const FCM_VAPID_KEY = "PASTE_YOUR_WEB_PUSH_CERTIFICATE_KEY";

const $ = id => document.getElementById(id);
const status = (id, msg) => { const el=$(id); if(el) el.textContent=msg; };
const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const niceDate = ts => ts?.toDate ? ts.toDate().toLocaleString() : new Date().toLocaleString();
const configured = !FIREBASE_CONFIG.apiKey.startsWith("PASTE_") &&
  !FIREBASE_CONFIG.projectId.startsWith("PASTE_") &&
  ADMIN_EMAIL.includes("@") && !ADMIN_EMAIL.startsWith("REPLACE_");
const authState = $("authState");
let app, auth, db, storage, currentUser=null, isAdmin=false, messaging=null;
let stopPosts=null, stopNotices=null, stopRecipes=null;
let postsCache = new Map();

function showSetupMessage() {
  const DEMO_KEY="mawyamade-demo-community-v2", DEMO_USER="mawyamade-demo-user-v2";
  let demoUser=null, demoPosts=[], demoNotices=[];
  try{demoUser=JSON.parse(localStorage.getItem(DEMO_USER)||"null")}catch{}
  try{demoPosts=JSON.parse(localStorage.getItem(DEMO_KEY)||"[]")}catch{}
  if(authState) authState.innerHTML='Firebase is not connected. You can try the local demo login. <span class="demo-badge">Demo mode</span>';
  status("communityStatus","Demo login lets you test the interface in this browser only. It is not a real secure account and does not sync to other devices.");
  const signIn=$("signInBtn"),signOutBtn=$("signOutBtn"),push=$("pushBtn"),nameInput=$("communityName"),feed=$("communityFeed"),noticeBox=$("communityNotifications");
  if(signIn)signIn.textContent="Try demo login";
  if(push)push.hidden=true;
  const escDemo=v=>String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save=()=>{try{localStorage.setItem(DEMO_KEY,JSON.stringify(demoPosts));localStorage.setItem(DEMO_USER,JSON.stringify(demoUser))}catch{status("communityStatus","Browser storage is full. Use smaller uploads or clear older demo posts.")}};
  function updateAuth(){if(authState)authState.innerHTML=demoUser?`Signed in as ${escDemo(demoUser.name)} <span class="demo-badge">Local demo</span>`:'Firebase is not connected. You can try the local demo login. <span class="demo-badge">Demo mode</span>';if(signIn)signIn.hidden=!!demoUser;if(signOutBtn)signOutBtn.hidden=!demoUser;if(nameInput&&demoUser)nameInput.value=demoUser.name;document.querySelectorAll('#communityPostForm input,#communityPostForm textarea,#communityPostForm select').forEach(el=>el.disabled=!demoUser);const submit=$("communityPostForm")?.querySelector('[type="submit"]');if(submit)submit.disabled=!demoUser;}
  function renderDemo(){if(!feed)return;if(!demoPosts.length){feed.innerHTML='<div class="community-note">Demo community is ready. Sign in with the demo button, then publish a test question. Only this browser will see demo posts.</div>';return;}feed.innerHTML=demoPosts.map(p=>`<article class="community-post" data-demo-post="${escDemo(p.id)}"><div class="post-head"><div><strong>${escDemo(p.name)}</strong><div class="post-date">${escDemo(p.type)} · ${escDemo(p.date)}</div></div><span class="post-kind">${p.comments.length} comments</span></div><div class="post-body">${escDemo(p.message)}</div>${p.media? (p.mediaType==='video'?`<video class="post-media" controls src="${p.media}"></video>`:`<img class="post-media" src="${p.media}" alt="Community upload">`):''}<div class="post-comments"><div class="comment-list">${p.comments.map(c=>`<div class="comment-item"><strong>${escDemo(c.name)}:</strong>${escDemo(c.text)}<div class="post-date">${escDemo(c.date)}</div></div>`).join('')}</div><form class="comment-entry" data-demo-comment="${escDemo(p.id)}"><input name="demoComment" maxlength="500" placeholder="${demoUser?'Write a comment…':'Sign in to comment'}" ${demoUser?'':'disabled'} required><button type="submit" ${demoUser?'':'disabled'}>Send</button></form></div></article>`).join('');}
  function renderNotices(){if(!noticeBox)return;noticeBox.innerHTML=demoNotices.length?demoNotices.map(n=>`<div class="notification-item"><span class="notification-dot"></span><div>${escDemo(n)}<small>Local demo · just now</small></div></div>`).join(''):'<div class="notification-item"><span class="notification-dot"></span><div>Demo notifications appear here.<small>Real-time notifications need Firebase setup.</small></div></div>';}
  const loginOverlay=$("demoLoginOverlay"),loginForm=$("demoLoginForm"),loginName=$("demoLoginName");
  const closeDemoLogin=()=>loginOverlay?.classList.remove('open');
  signIn?.addEventListener('click',()=>{if(loginOverlay){loginOverlay.classList.add('open');setTimeout(()=>loginName?.focus(),80);}});
  $("demoLoginClose")?.addEventListener('click',closeDemoLogin);$("demoLoginCancel")?.addEventListener('click',closeDemoLogin);
  loginOverlay?.addEventListener('click',e=>{if(e.target===loginOverlay)closeDemoLogin()});
  loginForm?.addEventListener('submit',e=>{e.preventDefault();const name=loginName?.value.trim();if(!name)return;demoUser={name:name.slice(0,45),demo:true};save();updateAuth();renderDemo();closeDemoLogin();status('communityStatus','Demo login successful. Remember: this is local-only, not a real account.');});
  signOutBtn?.addEventListener('click',()=>{demoUser=null;save();updateAuth();renderDemo();status('communityStatus','Signed out of local demo.');});
  $("communityPostForm")?.addEventListener('submit',e=>{e.preventDefault();if(!demoUser){status('communityStatus','Use Try demo login first.');return;}const message=$("communityMessage").value.trim();if(!message)return;const file=$("communityFile")?.files?.[0];const publish=media=>{demoPosts.unshift({id:'demo-'+Date.now(),name:demoUser.name,type:$("communityType").value,message,date:new Date().toLocaleString(),media:media||'',mediaType:file?.type?.startsWith('video/')?'video':'image',comments:[]});demoPosts=demoPosts.slice(0,20);save();renderDemo();demoNotices.unshift('New demo post by '+demoUser.name);renderNotices();$("communityMessage").value='';if($("communityFile"))$("communityFile").value='';status('communityStatus','Demo post published in this browser. To share with everyone, configure Firebase.');};if(file){if(file.size>900*1024){status('communityStatus','For demo mode choose media under 900 KB. Firebase Storage supports larger uploads after setup.');return;}const rd=new FileReader();rd.onload=()=>publish(String(rd.result));rd.onerror=()=>status('communityStatus','Could not read this file. Try another.');rd.readAsDataURL(file);}else publish('');});
  feed?.addEventListener('submit',e=>{const form=e.target.closest('[data-demo-comment]');if(!form)return;e.preventDefault();if(!demoUser)return;const p=demoPosts.find(x=>x.id===form.dataset.demoComment),text=form.querySelector('[name="demoComment"]').value.trim();if(!p||!text)return;p.comments.push({name:demoUser.name,text,date:new Date().toLocaleString()});save();renderDemo();demoNotices.unshift('New demo comment by '+demoUser.name);renderNotices();});
  $("communityClear")?.addEventListener('click',()=>{$("communityPostForm")?.reset();status('communityStatus','Form cleared.');});
  $("clearNotifications")?.addEventListener('click',()=>{demoNotices=[];renderNotices();});
  const fileInput=$("communityFile"),vid=$("communityVideoPreview"),im=$("communityImagePreview");fileInput?.addEventListener('change',()=>{const f=fileInput.files?.[0];if(!f)return;const url=URL.createObjectURL(f);if(vid)vid.style.display='none';if(im)im.style.display='none';if(f.type.startsWith('video/')&&vid){vid.src=url;vid.style.display='block'}else if(f.type.startsWith('image/')&&im){im.src=url;im.style.display='block'}});
  const shared=$("sharedRecipeFeed");if(shared)shared.innerHTML='<div class="community-note">Admin publishing unlocks after Firebase is connected. Local demo login cannot publish public recipes or grant admin access.</div>';
  renderDemo();renderNotices();updateAuth();
}
if(!configured){
  showSetupMessage();
}else{
  try{
    const [appMod,authMod,dbMod,storageMod,messagingMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js")
    ]);
    const {initializeApp}=appMod;
    const {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged}=authMod;
    const {getFirestore,collection,doc,addDoc,setDoc,getDoc,query,orderBy,limit,onSnapshot,serverTimestamp}=dbMod;
    const {getStorage,ref:storageRef,uploadBytes,getDownloadURL}=storageMod;
    const {getMessaging,getToken,onMessage,isSupported}=messagingMod;
    app=initializeApp(FIREBASE_CONFIG);auth=getAuth(app);db=getFirestore(app);storage=getStorage(app);
    $("signInBtn")?.addEventListener("click",async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){status("communityStatus","Sign-in failed: "+e.message)}});
    $("signOutBtn")?.addEventListener("click",()=>signOut(auth));
    onAuthStateChanged(auth, async user=>{
      currentUser=user;isAdmin=!!user&&user.email?.toLowerCase()===ADMIN_EMAIL.toLowerCase();
      if(authState)authState.textContent=user?`Signed in as ${user.displayName||user.email}${isAdmin?" · ADMIN":""}`:"Sign in to post, comment and upload media.";
      $("signInBtn").hidden=!!user;$("signOutBtn").hidden=!user;$("pushBtn").hidden=!user;
      $("adminRecipePanel").hidden=!isAdmin;
      const name=$("communityName");if(user&&name&&!name.value)name.value=user.displayName||user.email||"Member";
      if(stopPosts)stopPosts();if(stopNotices)stopNotices();if(stopRecipes)stopRecipes();
      startPosts();startNotifications();startRecipes();
      if(user) await saveUserProfile(user);
    });
    function startPosts(){
      const q=query(collection(db,"posts"),orderBy("createdAt","desc"),limit(50));
      stopPosts=onSnapshot(q,snap=>{
        postsCache.clear();snap.forEach(d=>postsCache.set(d.id,{id:d.id,...d.data()}));renderPosts();
      },err=>status("communityStatus","Could not load community: "+err.message));
    }
    function renderPosts(){
      const feed=$("communityFeed");if(!feed)return;
      const items=[...postsCache.values()];
      if(!items.length){feed.innerHTML='<div class="community-note">No posts yet. Sign in and be the first to share!</div>';return}
      feed.innerHTML=items.map(p=>{
        const comments=Array.isArray(p.commentsPreview)?p.commentsPreview:[];
        const media=p.mediaUrl?(p.mediaType==="video"?`<video class="post-media" controls src="${esc(p.mediaUrl)}"></video>`:`<img class="post-media" src="${esc(p.mediaUrl)}" alt="Community upload" loading="lazy">`):"";
        return `<article class="community-post" data-post="${esc(p.id)}"><div class="post-head"><div><strong>${esc(p.authorName||"MawyaMade member")}</strong><div class="post-date">${esc(p.type||"Community post")} · ${esc(niceDate(p.createdAt))}</div></div><span class="post-kind" id="commentCount-${esc(p.id)}">Comments</span></div><div class="post-body">${esc(p.message||"")}</div>${media}<div class="post-actions"><button type="button" data-load-comments="${esc(p.id)}">💬 View / comment</button><button type="button" data-copy-post="${esc(p.id)}">Copy post text</button></div><div class="post-comments"><div class="comment-list" id="comments-${esc(p.id)}"><div class="community-help">Open comments to load live discussion.</div></div><form class="comment-entry" data-comment-form="${esc(p.id)}"><input name="commentText" aria-label="Write a comment" maxlength="500" placeholder="${currentUser?"Write a comment…":"Sign in to comment"}" ${currentUser?"":"disabled"} required><button type="submit" ${currentUser?"":"disabled"}>Send</button></form></div></article>`;
      }).join("");
    }
    const commentListeners=new Map();
    $("communityFeed")?.addEventListener("click",async e=>{
      const load=e.target.closest("[data-load-comments]");
      if(load){const id=load.dataset.loadComments;const target=$("comments-"+id);if(!target)return;
        if(commentListeners.has(id)){commentListeners.get(id)();commentListeners.delete(id);target.innerHTML='<div class="community-help">Comments collapsed. Click to view again.</div>';return}
        const stop=onSnapshot(query(collection(db,"posts",id,"comments"),orderBy("createdAt","asc"),limit(100)),snap=>{
          target.innerHTML=snap.empty?'<div class="community-help">No comments yet — start the conversation.</div>':snap.docs.map(d=>{const c=d.data();return `<div class="comment-item"><strong>${esc(c.authorName||"Member")}:</strong>${esc(c.text)}<div class="post-date">${esc(niceDate(c.createdAt))}</div></div>`}).join("");
          const count=$("commentCount-"+id);if(count)count.textContent=snap.size+" comments";
        },err=>{target.textContent="Could not load comments: "+err.message});
        commentListeners.set(id,stop);return;
      }
      const copy=e.target.closest("[data-copy-post]");if(copy){const p=postsCache.get(copy.dataset.copyPost);if(p)try{await navigator.clipboard.writeText(`${p.authorName}: ${p.message}`);status("communityStatus","Post text copied.")}catch{prompt("Copy post text:",p.message)}}
    });
    $("communityFeed")?.addEventListener("submit",async e=>{
      const form=e.target.closest("[data-comment-form]");if(!form)return;e.preventDefault();
      if(!currentUser){status("communityStatus","Please sign in before commenting.");return}
      const text=form.querySelector('[name="commentText"]').value.trim();if(!text)return;
      try{
        await addDoc(collection(db,"posts",form.dataset.commentForm,"comments"),{text,authorName:currentUser.displayName||currentUser.email,authorId:currentUser.uid,createdAt:serverTimestamp()});
        form.reset();
      }catch(err){status("communityStatus","Comment failed: "+err.message)}
    });
    const fileInput=$("communityFile"),vid=$("communityVideoPreview"),im=$("communityImagePreview");
    fileInput?.addEventListener("change",()=>{
      const f=fileInput.files?.[0];if(!f)return;
      if(f.size>40*1024*1024){status("communityStatus","Choose a media file under 40 MB.");fileInput.value="";return}
      const url=URL.createObjectURL(f);vid.style.display="none";im.style.display="none";
      if(f.type.startsWith("video/")){vid.src=url;vid.style.display="block"}else if(f.type.startsWith("image/")){im.src=url;im.style.display="block"}
    });
    $("communityPostForm")?.addEventListener("submit",async e=>{
      e.preventDefault();if(!currentUser){status("communityStatus","Please sign in with Google before posting.");return}
      const message=$("communityMessage").value.trim(),f=fileInput.files?.[0];if(!message)return;
      const btn=$("communityPostForm").querySelector('[type="submit"]');btn.disabled=true;
      try{
        let mediaUrl="",mediaType="";
        if(f){const safeName=f.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`community/${currentUser.uid}/${Date.now()}_${safeName}`;const rr=storageRef(storage,path);await uploadBytes(rr,f);mediaUrl=await getDownloadURL(rr);mediaType=f.type.startsWith("video/")?"video":"image";}
        await addDoc(collection(db,"posts"),{authorId:currentUser.uid,authorName:currentUser.displayName||currentUser.email,type:$("communityType").value,message,mediaUrl,mediaType,createdAt:serverTimestamp()});
        $("communityMessage").value="";fileInput.value="";vid.style.display="none";im.style.display="none";status("communityStatus","Posted! Other visitors will see it live.");
      }catch(err){status("communityStatus","Post failed: "+err.message)}finally{btn.disabled=false}
    });
    $("communityClear")?.addEventListener("click",()=>{$("communityPostForm").reset();vid.style.display="none";im.style.display="none"});
    function startNotifications(){
      stopNotices=onSnapshot(query(collection(db,"notifications"),orderBy("createdAt","desc"),limit(25)),snap=>{
        const el=$("communityNotifications");if(!el)return;
        el.innerHTML=snap.empty?'<div class="community-help">No notifications yet.</div>':snap.docs.map(d=>{const n=d.data();return `<div class="notification-item"><span class="notification-dot"></span><div><strong>${esc(n.title||"MawyaMade update")}</strong><br>${esc(n.message||"New update")}<small>${esc(n.createdAt?.toDate?n.createdAt.toDate().toLocaleString():"Just now")}</small></div></div>`}).join("");
      },err=>status("communityStatus","Notification stream error: "+err.message));
    }
    function startRecipes(){
      stopRecipes=onSnapshot(query(collection(db,"recipes"),orderBy("createdAt","desc"),limit(60)),snap=>{
        const el=$("sharedRecipeFeed");if(!el)return;
        el.innerHTML=snap.empty?'<div class="community-help">No admin recipes published yet.</div>':snap.docs.map(d=>{const r=d.data();return `<article class="shared-recipe-card"><img src="${esc(r.imageUrl||"")}" alt="${esc(r.name)}" loading="lazy"><div><span class="post-kind">${esc(r.category||"Recipe")}</span><h4>${esc(r.name)}</h4><p>${esc(r.description||"")}</p><p>Ingredients: ${esc((r.ingredients||[]).slice(0,3).join(", "))}</p><div class="post-actions">${r.videoUrl?`<a href="${esc(r.videoUrl)}" target="_blank" rel="noopener">▶ Making video</a>`:""}<button type="button" data-shared-recipe="${esc(d.id)}">Recipe details</button></div><div class="post-body" id="shared-detail-${esc(d.id)}" hidden>${esc((r.steps||[]).join("\n"))}</div></div></article>`}).join("");
      },err=>status("adminRecipeStatus","Recipe stream error: "+err.message));
    }
    $("sharedRecipeFeed")?.addEventListener("click",e=>{
      const b=e.target.closest("[data-shared-recipe]");if(!b)return;const detail=$("shared-detail-"+b.dataset.sharedRecipe);if(detail)detail.hidden=!detail.hidden;
    });
    $("adminRecipeForm")?.addEventListener("submit",async e=>{
      e.preventDefault();if(!isAdmin){status("adminRecipeStatus","Only the configured admin account can publish recipes.");return}
      const btn=$("adminRecipeForm").querySelector('[type="submit"]');btn.disabled=true;
      try{
        const file=$("adminRecipeImage").files?.[0];if(!file)throw new Error("Choose a food image first.");
        if(file.size>10*1024*1024)throw new Error("Food image must be under 10 MB.");
        const name=$("adminRecipeName").value.trim(),category=$("adminRecipeCategory").value,description=$("adminRecipeDescription").value.trim();
        const ingredients=$("adminRecipeIngredients").value.split("\n").map(x=>x.trim()).filter(Boolean);
        const steps=$("adminRecipeSteps").value.split("\n").map(x=>x.trim()).filter(Boolean);
        const rr=storageRef(storage,`recipes/${currentUser.uid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`);
        await uploadBytes(rr,file);const imageUrl=await getDownloadURL(rr);
        const videoUrl=$("adminRecipeVideo").value.trim();
        await addDoc(collection(db,"recipes"),{name,category,description,ingredients,steps,imageUrl,videoUrl,authorId:currentUser.uid,createdAt:serverTimestamp()});
        $("adminRecipeForm").reset();status("adminRecipeStatus","Recipe published for all visitors.");
      }catch(err){status("adminRecipeStatus","Publish failed: "+err.message)}finally{btn.disabled=false}
    });
    async function saveUserProfile(user){
      try{await setDoc(doc(db,"users",user.uid),{uid:user.uid,displayName:user.displayName||"",email:user.email||"",lastSeenAt:serverTimestamp()},{merge:true})}catch(e){console.warn("Profile update failed",e)}
    }
    $("pushBtn")?.addEventListener("click",async()=>{
      if(!currentUser)return;
      try{
        if(!("Notification" in window)||!("serviceWorker" in navigator))throw new Error("Push alerts need a supported browser and HTTPS (or localhost).");
        const permission=await Notification.requestPermission();if(permission!=="granted")throw new Error("Notification permission was not granted.");
        if(FCM_VAPID_KEY.startsWith("PASTE_"))throw new Error("Add your Firebase Web Push certificate key to FCM_VAPID_KEY in index.html first.");
        if(!await isSupported())throw new Error("Firebase Messaging is not supported in this browser.");
        messaging=getMessaging(app);
        const reg=await navigator.serviceWorker.register("./firebase-messaging-sw.js");
        const token=await getToken(messaging,{vapidKey:FCM_VAPID_KEY,serviceWorkerRegistration:reg});
        if(!token)throw new Error("Could not obtain a push token.");
        await setDoc(doc(db,"users",currentUser.uid),{fcmToken:token,updatedAt:serverTimestamp()},{merge:true});
        status("communityStatus","Push alerts enabled on this device.");
        onMessage(messaging,payload=>{if(payload.notification) new Notification(payload.notification.title||"MawyaMade",{body:payload.notification.body||"New update"});});
      }catch(err){status("communityStatus","Push setup: "+err.message)}
    });
  }catch(err){showSetupMessage();console.error(err)}
}
