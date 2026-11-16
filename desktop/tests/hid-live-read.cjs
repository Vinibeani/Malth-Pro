// Diagnostico real autorizado: HELLO/PING/DISARM, sem perfil, CENTER ou ARM.
const { HidPort } = require('../hid-port.cjs');
const { DeviceLink } = require('../device-link.cjs');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const candidates = await HidPort.list();
  if (candidates.length !== 1) throw Error(`Esperada uma coleção Malth HID, encontradas ${candidates.length}.`);
  const port = new HidPort(candidates[0]);
  let states = 0, failures = 0, lastState;
  const link = new DeviceLink(port, m => {
    if (m.type === 'state') { ++states; lastState = { armed:m.armed, centered:m.centered, overruns:m.overruns }; }
  }, () => { ++failures; });
  const started = Date.now();
  try {
    await new Promise((r,j) => port.open(e => e ? j(e) : r()));
    const hello = await link.handshake();
    for (let i=0;i<30;i++) { await link.command('PING'); await new Promise(r=>setTimeout(r,500)); }
    const result={firmware:hello.firmware,transport:'HID feature 0x40',seconds:(Date.now()-started)/1000,states,failures,lastState,commands:'HELLO/PING only; close sends DISARM'};
    fs.writeFileSync(path.resolve(__dirname,'../../firmware/build/hid-live-read-result.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
    if (failures || states<100) throw Error('Comunicação HID não permaneceu estável.');
  } finally { link.close(); await new Promise(r=>setTimeout(r,50)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
