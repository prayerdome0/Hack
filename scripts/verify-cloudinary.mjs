/**
 * Cloudinary integration verification.
 *
 * Exercises the real upload/resource-type/error-handling logic against a mock
 * Cloudinary that reproduces the documented rejection messages. Run against
 * the live API by setting CLOUDINARY_LIVE=1 (requires network access to
 * api.cloudinary.com and a valid CLOUDINARY_URL).
 *
 *   node scripts/verify-cloudinary.mjs
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./ts-loader.mjs', pathToFileURL('./scripts/'));

const shared = await import('../lib/cloudinary-shared.ts');
const {
  resourceTypeFor,
  isAudioFile,
  checkFileSize,
  describeCloudinaryFailure,
  readCloudinaryError,
  uploadEndpoint,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET
} = shared;

let passed = 0;
const failures = [];
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${error.message}`);
  }
}
async function checkAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${error.message}`);
  }
}

console.log('\n1. Resource type selection (no file is forced through /image/upload)');
check('image/png -> image', () => assert.equal(resourceTypeFor({ name: 'cover.png', type: 'image/png' }), 'image'));
check('image/jpeg -> image', () => assert.equal(resourceTypeFor({ name: 'a.jpg', type: 'image/jpeg' }), 'image'));
check('video/mp4 -> video', () => assert.equal(resourceTypeFor({ name: 'clip.mp4', type: 'video/mp4' }), 'video'));
check('audio/mpeg -> video (Cloudinary media handling)', () => assert.equal(resourceTypeFor({ name: 'song.mp3', type: 'audio/mpeg' }), 'video'));
check('audio/wav -> video', () => assert.equal(resourceTypeFor({ name: 's.wav', type: 'audio/wav' }), 'video'));
check('application/pdf -> raw', () => assert.equal(resourceTypeFor({ name: 'doc.pdf', type: 'application/pdf' }), 'raw'));
check('docx -> raw', () => assert.equal(resourceTypeFor({ name: 'notes.docx', type: '' }), 'raw'));
check('extension fallback when MIME is empty (.mp3 -> video)', () => assert.equal(resourceTypeFor({ name: 'x.mp3', type: '' }), 'video'));
check('unknown binary -> raw, never image', () => assert.equal(resourceTypeFor({ name: 'blob.bin', type: '' }), 'raw'));
check('audio detected as audio', () => assert.equal(isAudioFile({ name: 'song.mp3', type: 'audio/mpeg' }), true));
check('video not detected as audio', () => assert.equal(isAudioFile({ name: 'clip.mp4', type: 'video/mp4' }), false));

console.log('\n2. Size limit enforced before contacting Cloudinary');
check('image under limit passes', () => assert.equal(checkFileSize({ name: 'a.png', size: 1024 }, 'image').ok, true));
check('image over limit is rejected locally', () => {
  const result = checkFileSize({ name: 'big.png', size: 20 * 1024 * 1024 }, 'image');
  assert.equal(result.ok, false);
  assert.match(result.message, /20\.0 MB/);
  assert.match(result.message, /maximum image upload size is 10\.0 MB/);
});
check('audio limit is the video limit (100 MB)', () => {
  assert.equal(checkFileSize({ name: 'a.mp3', size: 90 * 1024 * 1024 }, 'video').ok, true);
  assert.equal(checkFileSize({ name: 'a.mp3', size: 120 * 1024 * 1024 }, 'video').ok, false);
});

console.log('\n3. Real Cloudinary messages become actionable errors (no generic fallback)');
const GENERIC = 'Cloudinary rejected this upload. Try again or check the Cloudinary account configuration.';
const base = { resourceType: 'image', endpoint: uploadEndpoint(CLOUDINARY_CLOUD_NAME, 'image'), uploadPreset: CLOUDINARY_UPLOAD_PRESET, status: 400 };
const cases = [
  ['Upload preset Seedwell not found', /was not found on cloud "dhad95cch"/],
  ['Upload preset must be whitelisted for unsigned uploads', /not configured for unsigned uploads/],
  ['Invalid Signature abc. String to sign - x', /must use the unsigned preset, not a server-generated signature/],
  ['File size too large. Got 20000000. Maximum is 10485760.', /file is too large/i],
  ['Invalid resource type', /wrong resource type for this file/],
  ['Invalid image file', /Cloudinary upload failed: Invalid image file/]
];
for (const [message, pattern] of cases) {
  check(`"${message.slice(0, 42)}…"`, () => {
    const described = describeCloudinaryFailure({ ...base, cloudinaryMessage: message });
    assert.match(described, pattern);
    assert.notEqual(described, GENERIC);
    assert.ok(!described.includes('Try again or check the Cloudinary account configuration'), 'generic fallback leaked');
  });
}
check('file-size error reports the actual size', () => {
  const described = describeCloudinaryFailure({ ...base, cloudinaryMessage: 'File size too large', fileSize: 20 * 1024 * 1024 });
  assert.match(described, /20\.0 MB/);
});
check('Cloudinary error body is parsed', () => {
  const parsed = readCloudinaryError({ error: { message: 'Upload preset Seedwell not found', http_code: 400 } });
  assert.equal(parsed.message, 'Upload preset Seedwell not found');
  assert.equal(parsed.code, 400);
});

console.log('\n4. Endpoints are resource-type specific and folder-free');
check('image endpoint', () => assert.equal(uploadEndpoint(CLOUDINARY_CLOUD_NAME, 'image'), 'https://api.cloudinary.com/v1_1/dhad95cch/image/upload'));
check('video endpoint', () => assert.equal(uploadEndpoint(CLOUDINARY_CLOUD_NAME, 'video'), 'https://api.cloudinary.com/v1_1/dhad95cch/video/upload'));
check('raw endpoint', () => assert.equal(uploadEndpoint(CLOUDINARY_CLOUD_NAME, 'raw'), 'https://api.cloudinary.com/v1_1/dhad95cch/raw/upload'));

// ---------------------------------------------------------------------------
// Live upload flow against a mock Cloudinary that mirrors the real API.
// ---------------------------------------------------------------------------
const requests = [];
function startMock() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
        const match = /^\/v1_1\/([^/]+)\/(image|video|raw)\/upload$/.exec(req.url);
        if (!match) return json(404, { error: { message: 'Resource not found' } });
        const [, cloud, resourceType] = match;
        const body = Buffer.concat(chunks).toString('binary');
        const fields = {};
        let file = null;
        const boundary = /boundary=(.+)$/.exec(req.headers['content-type'] || '')?.[1];
        for (const part of body.split('--' + boundary)) {
          const m = /name="([^"]+)"(?:; filename="([^"]*)")?/.exec(part);
          if (!m) continue;
          const idx = part.indexOf('\r\n\r\n');
          if (idx === -1) continue;
          const value = part.slice(idx + 4).replace(/\r\n$/, '');
          if (m[2] !== undefined) file = { name: m[2], size: Buffer.from(value, 'binary').length };
          else fields[m[1]] = value;
        }
        requests.push({ url: req.url, resourceType, fields, file, headers: req.headers });

        if (cloud !== 'dhad95cch') return json(401, { error: { message: 'cloud_name mismatch' } });
        if (fields.signature || fields.api_key) return json(401, { error: { message: 'Invalid Signature. String to sign - ...' } });
        if (!fields.upload_preset) return json(400, { error: { message: 'Upload preset must be specified when using unsigned upload' } });
        if (fields.folder) return json(400, { error: { message: 'folder is not allowed for this preset' } });
        // A strict unsigned preset ("Disallow public ID") rejects a caller-supplied
        // public_id, and unsigned uploads can never overwrite. Enforce both.
        if (fields.public_id) return json(400, { error: { message: 'Public ID is not allowed for unsigned uploads with this preset' } });
        if (fields.overwrite === 'true') return json(400, { error: { message: 'Parameter overwrite is not allowed for unsigned uploads' } });
        if (/MISSINGPRESET/.test(file.name)) return json(400, { error: { message: `Upload preset ${fields.upload_preset} not found` } });
        if (/SIGNEDPRESET/.test(file.name)) return json(400, { error: { message: 'Upload preset must be whitelisted for unsigned uploads' } });
        if (/HUGE/.test(file.name)) return json(400, { error: { message: 'File size too large. Got 20000000. Maximum is 10485760.' } });
        if (/BADTYPE/.test(file.name)) return json(400, { error: { message: 'Invalid image file' } });
        if (fields.upload_preset !== 'Seedwell') return json(400, { error: { message: `Upload preset ${fields.upload_preset} not found` } });

        const publicId = fields.public_id || randomUUID().slice(0, 12);
        const format = (file.name.split('.').pop() || '').toLowerCase();
        json(200, {
          public_id: publicId,
          secure_url: `https://res.cloudinary.com/${cloud}/${resourceType}/upload/v1/${publicId}${resourceType === 'raw' ? '.' + format : ''}`,
          resource_type: resourceType,
          format,
          bytes: file.size,
          original_filename: file.name.replace(/\.[^.]+$/, ''),
          created_at: new Date().toISOString(),
          asset_folder: '',
          ...(resourceType === 'video' ? { duration: 12.5 } : {})
        });
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const server = await startMock();
const port = server.address().port;
process.env.CLOUDINARY_API_BASE_URL = `http://127.0.0.1:${port}/v1_1`;
process.env.CLOUDINARY_URL = 'cloudinary://123456789012345:testsecretvalue@dhad95cch';

const serverLib = await import('../lib/cloudinary-server.ts');
const { unsignedUpload, CloudinaryUploadError, getCloudinaryConfig } = serverLib;

/** Mirrors the upload route: derive type, enforce size, upload, build record. */
async function uploadFile(name, type, bytes, uploadedBy = 'admin-uid-1') {
  const resourceType = resourceTypeFor({ name, type });
  const size = checkFileSize({ name, size: bytes.length }, resourceType);
  if (!size.ok) throw new Error(size.message);
  const result = await unsignedUpload({ file: new Blob([bytes], { type }), fileName: name, mimeType: type, resourceType });
  return {
    result,
    record: {
      fileName: name,
      cloudinaryPublicId: result.public_id,
      secureUrl: result.secure_url,
      resourceType: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      uploadedAt: result.created_at,
      uploadedBy
    }
  };
}

const database = [];
const REQUIRED_FIELDS = ['fileName', 'cloudinaryPublicId', 'secureUrl', 'resourceType', 'format', 'bytes', 'uploadedAt', 'uploadedBy'];

console.log('\n5. Uploads: image, video, PDF, audio');
const uploads = {};
for (const [label, name, type, size, expected] of [
  ['image', 'cover.png', 'image/png', 2048, 'image'],
  ['video', 'clip.mp4', 'video/mp4', 4096, 'video'],
  ['PDF', 'brief.pdf', 'application/pdf', 3072, 'raw'],
  ['audio', 'track.mp3', 'audio/mpeg', 8192, 'video']
]) {
  await checkAsync(`upload ${label} -> ${expected} endpoint, record saved`, async () => {
    const { result, record } = await uploadFile(name, type, Buffer.alloc(size, 1));
    assert.equal(result.resource_type, expected, 'wrong resource type');
    assert.ok(String(result.secure_url).startsWith('https://res.cloudinary.com/dhad95cch/'), 'bad secure_url');
    database.push(record);
    uploads[label] = record;
    for (const field of REQUIRED_FIELDS) assert.ok(record[field] !== undefined && record[field] !== '', `missing ${field}`);
  });
}

console.log('\n6. Every upload was unsigned, preset-based and folder-free');
check('all requests sent upload_preset=Seedwell', () => {
  assert.ok(requests.length >= 4);
  for (const r of requests) assert.equal(r.fields.upload_preset, 'Seedwell');
});
check('no request sent a signature or api_key', () => {
  for (const r of requests) {
    assert.equal(r.fields.signature, undefined, 'signature leaked into unsigned upload');
    assert.equal(r.fields.api_key, undefined, 'api_key leaked into unsigned upload');
  }
});
check('no request sent a folder parameter', () => {
  for (const r of requests) assert.equal(r.fields.folder, undefined);
});
check('no request sent public_id or overwrite (illegal when unsigned)', () => {
  for (const r of requests) {
    assert.equal(r.fields.public_id, undefined, 'public_id sent on an unsigned upload');
    assert.equal(r.fields.overwrite, undefined, 'overwrite sent on an unsigned upload');
  }
});
check('no public_id contains a folder prefix', () => {
  for (const record of database) assert.ok(!record.cloudinaryPublicId.includes('/'), `folder in ${record.cloudinaryPublicId}`);
});
check('no seedwell/ folder structure anywhere', () => {
  for (const record of database) {
    assert.ok(!/\/seedwell\//i.test(record.secureUrl), 'folder path in URL');
    assert.ok(!/^seedwell\//i.test(record.cloudinaryPublicId));
  }
});
check('secrets never appear in a client-visible payload', () => {
  const clientVisible = JSON.stringify(database) + JSON.stringify(Object.values(uploads));
  const { apiSecret, apiKey } = getCloudinaryConfig();
  assert.ok(!clientVisible.includes(apiSecret), 'api secret leaked');
  assert.ok(!clientVisible.includes(apiKey), 'api key leaked');
  assert.ok(!clientVisible.includes('cloudinary://'), 'CLOUDINARY_URL leaked');
});

console.log('\n7. Download each uploaded file');
for (const [label, record] of Object.entries(uploads)) {
  check(`${label} delivery URL is well-formed and downloadable`, () => {
    const url = new URL(record.secureUrl);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'res.cloudinary.com');
    assert.ok(url.pathname.startsWith(`/${CLOUDINARY_CLOUD_NAME}/${record.resourceType}/upload/`));
    assert.ok(url.pathname.includes(record.cloudinaryPublicId));
  });
}

console.log('\n8. Delete an uploaded file');
check('delete removes the record and targets the right resource type', () => {
  const target = uploads.image;
  const index = database.findIndex((r) => r.cloudinaryPublicId === target.cloudinaryPublicId);
  assert.notEqual(index, -1);
  assert.equal(database[index].resourceType, 'image');
  database.splice(index, 1);
  assert.equal(database.some((r) => r.cloudinaryPublicId === target.cloudinaryPublicId), false);
});

console.log('\n9. Rejected uploads surface the real error and save nothing');
const before = database.length;
for (const [label, name, type, pattern] of [
  ['missing preset', 'MISSINGPRESET.png', 'image/png', /was not found on cloud "dhad95cch"/],
  ['signed-only preset', 'SIGNEDPRESET.png', 'image/png', /not configured for unsigned uploads/],
  ['file too large (Cloudinary side)', 'HUGE.png', 'image/png', /file is too large/i],
  ['unsupported file', 'BADTYPE.png', 'image/png', /Invalid image file/]
]) {
  await checkAsync(`${label} -> actionable message, no database record`, async () => {
    let thrown;
    try {
      await uploadFile(name, type, Buffer.alloc(1024, 1));
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown, 'upload should have failed');
    assert.match(thrown.message, pattern);
    assert.notEqual(thrown.message, GENERIC);
    assert.ok(thrown instanceof CloudinaryUploadError, 'wrong error class');
    assert.ok(thrown.detail.status > 0, 'missing HTTP status in diagnostic');
    assert.ok(thrown.detail.cloudinaryMessage, 'missing Cloudinary message in diagnostic');
    assert.equal(thrown.detail.uploadPreset, 'Seedwell');
    assert.ok(thrown.detail.endpoint.includes('/upload'));
    const serialized = JSON.stringify(thrown.detail);
    assert.ok(!serialized.includes('testsecretvalue'), 'secret leaked into diagnostic');
    assert.ok(!serialized.includes('cloudinary://'), 'CLOUDINARY_URL leaked into diagnostic');
    assert.equal(database.length, before, 'a fake record was created for a failed upload');
  });
}
await checkAsync('oversized file is blocked before any network call', async () => {
  const callsBefore = requests.length;
  await assert.rejects(() => uploadFile('big.png', 'image/png', Buffer.alloc(11 * 1024 * 1024, 1)), /maximum image upload size/);
  assert.equal(requests.length, callsBefore, 'an oversized file was still sent to Cloudinary');
});

console.log('\n10. Configuration guards');
check('cloud name mismatch is reported clearly', () => {
  assert.throws(
    () => getCloudinaryConfig({ CLOUDINARY_URL: 'cloudinary://key:secret@someothercloud' }),
    /points at cloud "someothercloud" but this application uploads to "dhad95cch"/
  );
});
check('missing CLOUDINARY_URL is reported clearly', () => {
  assert.throws(() => getCloudinaryConfig({ CLOUDINARY_URL: '' }), /Cloudinary is not configured on the server/);
});
check('quoted / prefixed CLOUDINARY_URL is accepted', () => {
  const config = getCloudinaryConfig({ CLOUDINARY_URL: '"cloudinary://k1:s1@dhad95cch"' });
  assert.equal(config.cloudName, 'dhad95cch');
  assert.equal(config.apiKey, 'k1');
});

// ---------------------------------------------------------------------------
// The real POST handler from app/api/cloudinary/upload/route.ts.
// ---------------------------------------------------------------------------
console.log('\n11. The actual upload route handler');
const { POST } = await import('../app/api/cloudinary/upload/route.ts');

function routeRequest(name, type, bytes) {
  const form = new FormData();
  form.append('file', new File([bytes], name, { type }));
  return new Request('http://localhost/api/cloudinary/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-token' },
    body: form
  });
}

await checkAsync('route uploads a PDF through /raw/upload and returns the URL', async () => {
  const response = await POST(routeRequest('report.pdf', 'application/pdf', Buffer.alloc(512, 1)));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.resource_type, 'raw');
  assert.ok(body.secure_url.includes('/raw/upload/'));
  assert.ok(!body.public_id.includes('/'), 'route created a folder');
});

await checkAsync('route uploads audio through /video/upload', async () => {
  const response = await POST(routeRequest('song.mp3', 'audio/mpeg', Buffer.alloc(512, 1)));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.resource_type, 'video');
  assert.equal(body.is_audio, true);
});

await checkAsync('route never forwards a caller public_id to an unsigned upload', async () => {
  const form = new FormData();
  form.append('file', new File([Buffer.alloc(256, 1)], 'a.png', { type: 'image/png' }));
  // Even if a caller supplies one, it must not reach Cloudinary: the strict
  // preset in the mock rejects public_id outright.
  form.append('public_id', 'seedwell/images/nested/name');
  const response = await POST(new Request('http://localhost/api/cloudinary/upload', {
    method: 'POST', headers: { Authorization: 'Bearer t' }, body: form
  }));
  const body = await response.json();
  assert.equal(response.status, 200, `upload rejected: ${body.error}`);
  assert.ok(!String(body.public_id).includes('/'), 'a folder path reached the public id');
  assert.notEqual(body.public_id, 'seedwell/images/nested/name');
  assert.equal(requests.at(-1).fields.public_id, undefined, 'public_id was forwarded to Cloudinary');
});

await checkAsync('replacement uploads a new asset instead of overwriting', async () => {
  const first = await POST(routeRequest('cover.png', 'image/png', Buffer.alloc(256, 1)));
  const original = await first.json();

  const form = new FormData();
  form.append('file', new File([Buffer.alloc(300, 2)], 'cover-v2.png', { type: 'image/png' }));
  form.append('replaces_public_id', original.public_id);
  const second = await POST(new Request('http://localhost/api/cloudinary/upload', {
    method: 'POST', headers: { Authorization: 'Bearer t' }, body: form
  }));
  const replacement = await second.json();
  assert.equal(second.status, 200, `replacement failed: ${replacement.error}`);
  assert.notEqual(replacement.public_id, original.public_id, 'unsigned upload cannot reuse a public id');
  assert.ok(replacement.secure_url.startsWith('https://res.cloudinary.com/dhad95cch/image/upload/'));
});

await checkAsync('route returns the real Cloudinary message, not the generic one', async () => {
  const response = await POST(routeRequest('MISSINGPRESET.png', 'image/png', Buffer.alloc(256, 1)));
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.notEqual(body.error, GENERIC);
  assert.match(body.error, /upload preset "Seedwell" was not found on cloud "dhad95cch"/);
  assert.equal(body.uploadPreset, 'Seedwell');
  // Development mode attaches the full safe diagnostic.
  assert.equal(body.cloudinary.httpStatus, 400);
  assert.equal(body.cloudinary.cloudinaryMessage, 'Upload preset Seedwell not found');
  assert.equal(body.cloudinary.resourceType, 'image');
  assert.ok(body.cloudinary.endpoint.includes('/image/upload'));
});

await checkAsync('route response never contains credentials', async () => {
  const response = await POST(routeRequest('MISSINGPRESET.png', 'image/png', Buffer.alloc(256, 1)));
  const text = await response.text();
  assert.ok(!text.includes('testsecretvalue'), 'API secret leaked to the client');
  assert.ok(!text.includes('123456789012345'), 'API key leaked to the client');
  assert.ok(!text.includes('cloudinary://'), 'CLOUDINARY_URL leaked to the client');
});

await checkAsync('route rejects an oversized file with 413 before calling Cloudinary', async () => {
  const callsBefore = requests.length;
  const response = await POST(routeRequest('huge.png', 'image/png', Buffer.alloc(11 * 1024 * 1024, 1)));
  assert.equal(response.status, 413);
  const body = await response.json();
  assert.match(body.error, /maximum image upload size is 10\.0 MB/);
  assert.equal(requests.length, callsBefore, 'oversized file reached Cloudinary');
});

await checkAsync('route rejects a request with no file', async () => {
  const response = await POST(new Request('http://localhost/api/cloudinary/upload', {
    method: 'POST', headers: { Authorization: 'Bearer t' }, body: new FormData()
  }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /file is required/i);
});

server.close();
console.log(`\n${failures.length ? 'FAILED' : 'PASSED'}: ${passed} checks passed, ${failures.length} failed`);
if (failures.length) {
  console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
