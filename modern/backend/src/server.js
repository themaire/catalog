require('dotenv').config();
const cron = require('node-cron');
const app = require('./app');
const { port, scan } = require('./config');
const { runScan } = require('./services/scan');

function scheduledScan(trigger) {
  runScan()
    .then((r) => {
      // eslint-disable-next-line no-console
      console.log(
        `[scan:${trigger}] ${r.models} modèles (+${r.modelsAdded}/-${r.modelsRemoved}), ` +
          `fichiers +${r.filesAdded}/-${r.filesRemoved}, ${r.errors.length} erreur(s), ${r.durationMs} ms`
      );
      // eslint-disable-next-line no-console
      r.errors.forEach((e) => console.warn(`[scan:${trigger}] ${e}`));
    })
    // eslint-disable-next-line no-console
    .catch((err) => console.error(`[scan:${trigger}]`, err.message));
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Catalog API listening on http://localhost:${port}`);
  if (scan.onStartup) scheduledScan('startup');
  if (scan.cron) cron.schedule(scan.cron, () => scheduledScan('cron'));
});
