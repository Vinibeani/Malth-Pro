(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MalthShifterMath=api;})(globalThis,()=>{
 const gears=['1','2','3','4','5','6','7','R'];
 function step(gear,direction){
  if(direction===1)return gear===8?0:Math.min(7,gear+1);
  if(direction===2)return gear===8?8:gear===0?8:gear-1;
  return gear;
 }
 function calibrate(settings){
  const points=gears.map(g=>({x:Number(settings[`gear${g}XCfg`]),y:Number(settings[`gear${g}YCfg`])}));
  if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1023||p.y<0||p.y>1023))throw Error('Capture X/Y válidos para todas as marchas.');
  const columns=[0,2,4,6].map(i=>({min:Math.min(points[i].x,points[i+1].x),max:Math.max(points[i].x,points[i+1].x)})).sort((a,b)=>a.min-b.min);
  if(columns.some((c,i)=>i&&c.min-columns[i-1].max<8))throw Error('As colunas X se sobrepõem. Confira as posições das oito marchas.');
  const top=Math.max(...[0,2,4,6].map(i=>Math.min(points[i].y,points[i+1].y)));
  const bottom=Math.min(...[0,2,4,6].map(i=>Math.max(points[i].y,points[i+1].y)));
  if(bottom-top<16)throw Error('As fileiras Y se sobrepõem. Capture cada marcha com a alavanca engatada.');
  return {xLowCfg:Math.round((columns[0].max+columns[1].min)/2),xMidCfg:Math.round((columns[1].max+columns[2].min)/2),xHighCfg:Math.round((columns[2].max+columns[3].min)/2),
   yLowCfg:Math.round(top+(bottom-top)/3),yHighCfg:Math.round(bottom-(bottom-top)/3),
   xMinCfg:Math.min(...points.map(p=>p.x)),xMaxCfg:Math.max(...points.map(p=>p.x)),yMinCfg:Math.min(...points.map(p=>p.y)),yMaxCfg:Math.max(...points.map(p=>p.y))};
 }
 return {gears,step,calibrate};
});
