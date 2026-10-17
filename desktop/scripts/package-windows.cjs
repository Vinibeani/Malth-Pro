const path = require('node:path');
const builder = require('electron-builder');

// electron-builder 26.15.3 passa somente __COMPAT_LAYER ao helper NSIS no
// Windows. Preservar SystemRoot/PATH evita spawn UNKNOWN nessa etapa.
// O pacote instalado nao e modificado; a correcao so vale neste processo de build.
const vmModule = require.resolve('app-builder-lib/out/vm/WineVm.js', {
  paths: [path.dirname(require.resolve('electron-builder'))],
});
const { WineVmManager } = require(vmModule);
const original = WineVmManager.prototype.execWine;
WineVmManager.prototype.execWine = function (args) {
  if (process.platform === 'win32' && args.options?.env) {
    args = { ...args, options: { ...args.options, env: { ...process.env, ...args.options.env } } };
  }
  return original.call(this, args);
};
builder.build({ targets: builder.Platform.WINDOWS.createTarget('nsis', builder.Arch.x64), publish: 'never' })
  .catch((error) => { console.error(error); process.exitCode = 1; });
