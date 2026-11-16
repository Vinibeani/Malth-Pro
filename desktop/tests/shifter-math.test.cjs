const {test}=require('node:test'),assert=require('node:assert/strict');
const {gears,calibrate,step}=require('../../malth-control/shifter-math.js');const {encodeProfile}=require('../device-protocol.cjs');
function fixture(mirror=false){const s={};gears.forEach((g,i)=>{s[`gear${g}XCfg`]=mirror?700-Math.floor(i/2)*70:400+Math.floor(i/2)*70;s[`gear${g}YCfg`]=i%2?550:450;});return s;}
test('calibração estreita ajusta as zonas e envia limites/pontos ao firmware',()=>{const s=fixture(),c=calibrate(s);assert.deepEqual(c,{xLowCfg:435,xMidCfg:505,xHighCfg:575,yLowCfg:483,yHighCfg:517,xMinCfg:400,xMaxCfg:610,yMinCfg:450,yMaxCfg:550});const p=encodeProfile({settings:{...s,...c}});assert.deepEqual(p.slice(26,31),[483,517,435,505,575]);assert.deepEqual(p.slice(31,35),[400,450,400,550]);});
test('colunas invertidas conservam marchas e ordenam as linhas X',()=>{const c=calibrate(fixture(true));assert.deepEqual([c.xLowCfg,c.xMidCfg,c.xHighCfg],[525,595,665]);});
test('capturas repetidas e fileiras sobrepostas são recusadas',()=>{const s=fixture();s.gear3XCfg=s.gear4XCfg=400;assert.throws(()=>calibrate(s),/colunas/);const t=fixture();t.gear1YCfg=t.gear2YCfg=500;assert.throws(()=>calibrate(t),/fileiras/);});
test('prévia sequencial permite R N 1 e preserva os extremos',()=>{assert.deepEqual([step(0,2),step(8,2),step(8,1),step(0,1),step(1,2),step(7,1),step(3,0)],[8,8,0,1,0,7,3]);});
