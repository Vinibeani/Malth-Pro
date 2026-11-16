const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createConnectionLog } = require('../connection-log.cjs');

test('registro guarda causa original, limita crescimento e exclui dados de perfil', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'malth-connection-'));
  try {
    const file = path.join(directory, 'connection.log');
    const log = createConnectionLog(directory);
    log('lost', { path: 'COM4', original: 'Access denied (ReadFile)', profile: { name: 'private' } });
    const row = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(row.original, 'Access denied (ReadFile)');
    assert.equal(row.profile, undefined);
    fs.writeFileSync(file, 'x'.repeat(128 * 1024));
    log('connected', { firmware: '0.1.3' });
    assert.equal(fs.statSync(file + '.1').size, 128 * 1024);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).event, 'connected');
    assert.doesNotThrow(() => createConnectionLog(file)('lost'));
  } finally {
    for (const name of ['connection.log', 'connection.log.1']) {
      const file = path.join(directory, name); if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(directory);
  }
});
