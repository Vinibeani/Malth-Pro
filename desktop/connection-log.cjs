const fs = require('node:fs');
const path = require('node:path');

// Somente eventos de conexao: nenhum perfil, entrada ou comando de torque.
function createConnectionLog(directory) {
  const target = path.join(directory, 'connection.log');
  return (event, detail = {}) => {
    try {
      fs.mkdirSync(directory, { recursive: true });
      if (fs.existsSync(target) && fs.statSync(target).size >= 128 * 1024) {
        fs.copyFileSync(target, target + '.1');
        fs.writeFileSync(target, '');
      }
      const row = { time: new Date().toISOString(), event };
      for (const key of ['path', 'operation', 'code', 'command', 'message', 'original', 'firmware']) {
        if (detail[key] !== undefined) row[key] = String(detail[key]).slice(0, 800);
      }
      fs.appendFileSync(target, JSON.stringify(row) + '\n', 'utf8');
    } catch { /* Falha de registro nao interrompe a sessao do volante. */ }
  };
}
module.exports = { createConnectionLog };
