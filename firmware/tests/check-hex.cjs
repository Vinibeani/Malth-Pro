const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const file = path.resolve(__dirname, '../releases/MalthPro-Leonardo-v0.1.2.hex');
let base = 0, end = false, bytes = 0, highest = 0;
for (const line of fs.readFileSync(file, 'utf8').trim().split(/\r?\n/)) {
  assert(!end, 'Dados depois do EOF'); assert(/^:[\da-f]+$/i.test(line));
  const data = Buffer.from(line.slice(1), 'hex');
  assert.equal(data.length, data[0] + 5);
  assert.equal([...data].reduce((sum, byte) => (sum + byte) & 255, 0), 0, 'Checksum Intel HEX invalido');
  const address = base + data.readUInt16BE(1), type = data[3];
  if (type === 0) {
    assert(address + data[0] <= 0x7000, 'Imagem invade a regiao do bootloader Leonardo');
    bytes += data[0]; highest = Math.max(highest, address + data[0]);
  } else if (type === 1) end = true;
  else if (type === 4) base = data.readUInt16BE(4) * 65536;
  else assert.fail(`Tipo inesperado: ${type}`);
}
assert(end && bytes > 0);
console.log(`Intel HEX valido: ${bytes} bytes; ultimo endereco 0x${(highest - 1).toString(16)}; bootloader preservado na imagem.`);
