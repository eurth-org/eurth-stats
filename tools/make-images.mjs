// Makes the pictures that aren't drawn by hand, with the Chrome on this machine: the favicon,
// the home-screen icons and the sharing image. Run it after changing the logo or the sharing
// image, and commit what it writes to public/:  npm run images
import { makeImages, sharingImage } from '@eurth/style/images';
import { createServer } from 'vite';
import { site } from '../eurth.config.mjs';

// The picture on the sharing image comes from the same code as the site (Vite reads TypeScript):
// a few of the checks of an example nation, with their real bars and verdicts.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { sampleArt } = await vite.ssrLoadModule('/src/stats/card.ts');
  const { checkNation } = await vite.ssrLoadModule('/src/stats/check.ts');
  const { findExample } = await vite.ssrLoadModule('/src/stats/examples.ts');
  const art = sampleArt(checkNation(findExample('skarn').nation.inputs));
  const made = await makeImages({ sharing: [{ file: 'og.png', html: sharingImage({ site, art }) }] });
  console.log(`Made ${made.map((file) => `public/${file}`).join(', ')}`);
} finally {
  await vite.close();
}
