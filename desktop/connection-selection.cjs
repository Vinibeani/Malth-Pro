// Only discover known Leonardo application interfaces, never bootloaders or arbitrary COM ports.
function automaticCandidates(ports, saved) {
  const hex = (value) => String(value || '').toLowerCase().replace(/^0x/, '');
  const remembered = (port) => saved && hex(saved.vendorId) && hex(saved.productId) &&
    hex(port.vendorId) === hex(saved.vendorId) && hex(port.productId) === hex(saved.productId) &&
    (saved.serialNumber ? port.serialNumber === saved.serialNumber : saved.pnpId && port.pnpId === saved.pnpId);
  const leonardo = (port) => ['2341', '2a03'].includes(hex(port.vendorId)) && hex(port.productId) === '8036';
  return ports.filter((port) => remembered(port) || leonardo(port))
    .sort((a, b) => Number(Boolean(remembered(b))) - Number(Boolean(remembered(a))));
}
module.exports = { automaticCandidates };
