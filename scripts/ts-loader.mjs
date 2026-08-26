/**
 * Minimal TypeScript loader for the verification script.
 * Strips types with the TypeScript compiler already present in devDependencies
 * and rewrites the `@/` path alias, so the real source files can be imported.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function resolve(specifier, context, nextResolve) {
  // `next/server` is a bundler-only subpath export; the verification script
  // only needs NextResponse.json, so stub it.
  if (specifier === 'next/server') {
    return { url: pathToFileURL(path.join(root, 'scripts', 'next-server-stub.mjs')).href, shortCircuit: true, format: 'module' };
  }
  if (specifier === '@/lib/server-auth') {
    return { url: pathToFileURL(path.join(root, 'scripts', 'server-auth-stub.mjs')).href, shortCircuit: true, format: 'module' };
  }
  if (specifier.startsWith('@/')) {
    const target = path.join(root, specifier.slice(2));
    const candidate = target.endsWith('.ts') ? target : `${target}.ts`;
    return { url: pathToFileURL(candidate).href, shortCircuit: true, format: 'module' };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts')) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: fileURLToPath(url)
    });
    return { format: 'module', source: outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
