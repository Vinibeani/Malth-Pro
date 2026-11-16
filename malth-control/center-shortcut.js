(() => {
 const api=window.malthDesktop,label=document.querySelector('#centerShortcutLabel');
 let value=null,capturing=false,previous=new Set(),deadline=0;
 const show=text=>{label.textContent=text||(!value?'Nenhum atalho definido':value.type==='keyboard'?value.key:`Malth Pro · botão ${value.button+1}`);if(!capturing)api?.captureCenterShortcut?.(false).catch(()=>{});};
 async function save(next){try{value=await api.setCenterShortcut(next);capturing=false;show();}catch(e){capturing=false;show(e.message);}}
 document.querySelector('#chooseCenterShortcut').onclick=()=>{if(!api?.setCenterShortcut){show('Disponível no aplicativo Windows.');return;}capturing=true;api.captureCenterShortcut?.(true).catch(()=>{});deadline=Date.now()+15000;show('Pressione uma tecla ou botão · Esc cancela');};
 document.querySelector('#clearCenterShortcut').onclick=()=>{if(api?.setCenterShortcut)save(null);};
 document.addEventListener('keydown',e=>{
  if(!capturing)return;e.preventDefault();e.stopImmediatePropagation();
  if(e.key==='Escape'){capturing=false;show();return;}
  if(['Control','Alt','Shift','Meta'].includes(e.key)||e.repeat)return;
  let key=/^Key[A-Z]$/.test(e.code)?e.code.slice(3):/^Digit\d$/.test(e.code)?e.code.slice(5):e.code==='Space'?'Space':e.key.replace('Arrow','');
  save({type:'keyboard',key:[e.ctrlKey?'Ctrl':null,e.altKey?'Alt':null,e.shiftKey?'Shift':null,e.metaKey?'Super':null,key].filter(Boolean).join('+')});
 },true);
 api?.getCenterShortcut?.().then(v=>{value=v;show();}).catch(()=>show('Não foi possível carregar o atalho.'));
 setInterval(()=>{
  if(capturing&&Date.now()>deadline){capturing=false;show();}
  const pressed=new Set();
  for(const pad of Array.from(navigator.getGamepads?.()||[]))if(pad?.connected&&/malth/i.test(pad.id))pad.buttons.forEach((b,i)=>{
   if(!b.pressed)return;const token=pad.index+':'+i;pressed.add(token);
   if(previous.has(token))return;
   if(capturing){save({type:'gamepad',button:i});capturing=false;}
   else if(value?.type==='gamepad'&&value.button===i)api?.triggerCenterShortcut?.().catch(()=>{});
  });
  previous=pressed;
 },100);
})();
