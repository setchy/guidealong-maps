// Export shape for tours.json: the stable id (url) first, then title, then the
// remaining fields. Keeping identity fields first makes data diffs easier to
// scan, and normalising here means the on-disk order stays stable no matter
// which fetch path built the tour objects.

function toExportTour({ url, title, ...rest }) {
  return { url, title, ...rest };
}

function serializeTours(tours) {
  return `${JSON.stringify(tours.map(toExportTour), null, 2)}\n`;
}

module.exports = { serializeTours, toExportTour };
