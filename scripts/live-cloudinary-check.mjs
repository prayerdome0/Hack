/**
 * Live Cloudinary check — run this where CLOUDINARY_URL is set and
 * api.cloudinary.com is reachable (local dev or the deployment shell):
 *
 *   CLOUDINARY_URL='cloudinary://KEY:SECRET@dhad95cch' node scripts/live-cloudinary-check.mjs
 *
 * It performs a REAL unsigned upload of one image, one audio file, one video
 * and one PDF using the `Seedwell` preset, downloads each result, then deletes
 * them with the signed Admin API. Nothing is printed except non-secret values.
 */
import { Buffer } from 'node:buffer';

const CLOUD = 'dhad95cch';
const PRESET = 'Seedwell';
const API = `https://api.cloudinary.com/v1_1/${CLOUD}`;

const url = (process.env.CLOUDINARY_URL || '').trim();
if (!url) {
  console.error('CLOUDINARY_URL is not set. Export it before running this check.');
  process.exit(1);
}
const parsed = new URL(url);
const apiKey = decodeURIComponent(parsed.username);
const apiSecret = decodeURIComponent(parsed.password);
if (parsed.hostname !== CLOUD) {
  console.error(`CLOUDINARY_URL points at "${parsed.hostname}" but this app uses "${CLOUD}".`);
  process.exit(1);
}

// Smallest valid real files so the check exercises Cloudinary's real decoders.
const FILES = [
  { label: 'image', name: 'verify-image.png', type: 'image/png', resourceType: 'image',
    data: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') },
  { label: 'audio', name: 'verify-audio.mp3', type: 'audio/mpeg', resourceType: 'video',
    data: Buffer.concat([Buffer.from('fffb90640000000000000000', 'hex'), Buffer.alloc(4096)]) },
  { label: 'video', name: 'verify-video.mp4', type: 'video/mp4', resourceType: 'video',
    data: Buffer.from('AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAhtZGF0', 'base64') },
  { label: 'pdf', name: 'verify-doc.pdf', type: 'application/pdf', resourceType: 'raw',
    data: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n') }
];

async function sha1Hex(input) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

let failed = 0;
const uploaded = [];

console.log(`\nChecking the "${PRESET}" preset on cloud "${CLOUD}"…\n`);

// 0. Confirm the preset exists and is unsigned (signed Admin API).
try {
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const response = await fetch(`${API}/upload_presets/${PRESET}`, { headers: { Authorization: `Basic ${auth}` } });
  const body = await response.json();
  if (!response.ok) {
    console.log(`  FAIL preset lookup: HTTP ${response.status} — ${body?.error?.message || 'unknown error'}`);
    failed += 1;
  } else if (body.unsigned === false) {
    console.log(`  FAIL preset "${PRESET}" exists but is SIGNED. Set its signing mode to Unsigned.`);
    failed += 1;
  } else {
    const folder = body?.settings?.folder;
    console.log(`  ok   preset "${PRESET}" is unsigned${folder ? ` (WARNING: it sets folder "${folder}")` : ' and sets no folder'}`);
  }
} catch (error) {
  console.log(`  FAIL preset lookup threw: ${error.message}`);
  failed += 1;
}

// 1-4. Real unsigned uploads.
for (const file of FILES) {
  const endpoint = `${API}/${file.resourceType}/upload`;
  const form = new FormData();
  form.append('file', new Blob([file.data], { type: file.type }), file.name);
  form.append('upload_preset', PRESET);
  try {
    const response = await fetch(endpoint, { method: 'POST', body: form });
    const body = await response.json();
    if (!response.ok) {
      console.log(`  FAIL upload ${file.label}: HTTP ${response.status} — ${body?.error?.message || 'no message'} [resourceType=${file.resourceType} preset=${PRESET}]`);
      failed += 1;
      continue;
    }
    uploaded.push({ ...file, publicId: body.public_id, secureUrl: body.secure_url });
    const foldered = String(body.public_id).includes('/');
    console.log(`  ok   upload ${file.label} -> ${body.resource_type} / ${body.public_id}${foldered ? '  FAIL: contains a folder!' : ''}`);
    if (foldered) failed += 1;
  } catch (error) {
    console.log(`  FAIL upload ${file.label} threw: ${error.message}`);
    failed += 1;
  }
}

// 5. Download each uploaded asset.
for (const item of uploaded) {
  try {
    const response = await fetch(item.secureUrl);
    if (response.ok) console.log(`  ok   download ${item.label} (${response.headers.get('content-length') || '?'} bytes)`);
    else { console.log(`  FAIL download ${item.label}: HTTP ${response.status}`); failed += 1; }
  } catch (error) {
    console.log(`  FAIL download ${item.label} threw: ${error.message}`);
    failed += 1;
  }
}

// 6. Delete each asset with the signed API.
for (const item of uploaded) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await sha1Hex(`public_id=${item.publicId}&timestamp=${timestamp}${apiSecret}`);
    const form = new FormData();
    form.append('public_id', item.publicId);
    form.append('timestamp', String(timestamp));
    form.append('api_key', apiKey);
    form.append('signature', signature);
    const response = await fetch(`${API}/${item.resourceType}/destroy`, { method: 'POST', body: form });
    const body = await response.json();
    if (body.result === 'ok') console.log(`  ok   delete ${item.label}`);
    else { console.log(`  FAIL delete ${item.label}: ${body.result || body?.error?.message}`); failed += 1; }
  } catch (error) {
    console.log(`  FAIL delete ${item.label} threw: ${error.message}`);
    failed += 1;
  }
}

// 7. Confirm no folders were created at the account root.
try {
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  const response = await fetch(`${API}/folders`, { headers: { Authorization: `Basic ${auth}` } });
  const body = await response.json();
  const names = (body.folders || []).map((f) => f.name);
  const offenders = names.filter((n) => /^seedwell$/i.test(n));
  if (offenders.length) { console.log(`  FAIL app-created folders found: ${offenders.join(', ')}`); failed += 1; }
  else console.log(`  ok   no app-created folders (root folders: ${names.length ? names.join(', ') : 'none'})`);
} catch (error) {
  console.log(`  note folder listing unavailable: ${error.message}`);
}

console.log(`\n${failed ? `FAILED: ${failed} check(s) failed` : 'PASSED: live Cloudinary integration is working'}\n`);
process.exit(failed ? 1 : 0);
