// Compilacao cruzada do instalador Windows a partir do Linux.
// Igual a scripts/package-windows.cjs, mas sem assinatura (o certificado "Malth Pro" fica no Windows do usuario).
// Uso: node scripts/package-windows-linux.cjs <pasta desktop> <pasta de saida>
// Requer wine (com wine32) e o pacote npm rcedit@4 instalado onde o script roda.
const path = require('node:path');
const projectDir = process.argv[2];
const builder = require(require.resolve('electron-builder', { paths: [projectDir] }));
const pkg = require(path.join(projectDir, 'package.json'));
const config = JSON.parse(JSON.stringify(pkg.build));
config.forceCodeSigning = false;

config.directories.output = process.argv[3];
// Sem PowerShell no Linux, o electron-builder 26 nao edita o .exe; o rcedit roda pelo wine no afterPack.
config.win.signAndEditExecutable = false;
config.win.signExecutable = false;
config.win.signtoolOptions = { sign: async () => {} }; // assinatura feita depois, no Windows
const rceditModule = require('rcedit'); const rcedit = rceditModule.rcedit || rceditModule.default || rceditModule;
config.afterPack = async (context) => {
  const exe = path.join(context.appOutDir, pkg.productName + '.exe');
  const year = new Date().getFullYear();
  await rcedit(exe, {
    icon: path.join(projectDir, config.win.icon),
    'file-version': pkg.version + '.0', 'product-version': pkg.version,
    'version-string': { FileDescription: pkg.description, ProductName: pkg.productName, CompanyName: pkg.author,
      InternalName: pkg.productName, OriginalFilename: pkg.productName + '.exe', LegalCopyright: `Copyright © ${year} ${pkg.author}` },
  });
  console.log('  • rcedit aplicado', exe);
};
builder.build({ projectDir, config, targets: builder.Platform.WINDOWS.createTarget('nsis', builder.Arch.x64), publish: 'never' })
  .then((files) => console.log('ARQUIVOS:', files.join('\n')))
  .catch((error) => { console.error(error); process.exitCode = 1; });
