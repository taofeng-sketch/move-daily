import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  isAlias,
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseAllDocuments,
} from 'yaml';

const TEXT_DECODER = new TextDecoder('utf-8', { fatal: true });
const DISALLOWED_TEXT_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;
const BINARY_TEXT_BREAK = /[\u0000-\u001F\u007F-\u009F\uFFFD]/u;
const BINARY_TEXT_SEPARATOR = '\uFFFD';
const BINARY_TEXT_SCAN_LIMIT = 1024 * 1024;
const EXACT_WORKFLOW_PATH = /^\.github\/workflows\/[^/]*\.ya?ml$/u;
const ACTION_MANIFEST_PATH = /(?:^|\/)action\.ya?ml$/u;
const IMMUTABLE_ACTION_REFERENCE =
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\/-]+)?@[0-9a-f]{40}$/iu;
const ACTION_REFERENCE_COPY =
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\/-]+)?@[^@\s]+$/u;
const MAX_ACTION_YAML_ALIASES = 100;

const PUBLIC_PATTERNS = [
  {
    kind: 'email',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
  },
  {
    kind: 'uk-postcode',
    pattern:
      /(?<![A-Z0-9+/_=-])(?:GIR\s?0AA|(?:[A-PR-UWYZ]\d{1,2}|[A-PR-UWYZ][A-HK-Y]\d{1,2}|[A-PR-UWYZ]\d[A-HJKSTUW]|[A-PR-UWYZ][A-HK-Y]\d[ABEHMNPRVWXY])\s?\d[ABD-HJLNP-UW-Z]{2})(?![A-Z0-9+/_=-])/giu,
  },
  {
    kind: 'private-user-path',
    pattern: /(?<![A-Za-z0-9._/-])\/(?:Users|home)\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._~/-]+)*/gu,
  },
  {
    kind: 'private-user-path',
    pattern: /[A-Za-z]:[\\/]+Users[\\/]+[A-Za-z0-9._-]+(?:[\\/][A-Za-z0-9._~ -]+)*/gu,
  },
  {
    kind: 'private-key',
    pattern: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/gu,
  },
  {
    kind: 'github-token',
    pattern: /(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{20,})/gu,
  },
  {
    kind: 'anthropic-key',
    pattern: /sk-ant-[A-Za-z0-9_-]{20,}/gu,
  },
  {
    kind: 'openai-key',
    pattern: /sk-(?!ant-)[A-Za-z0-9_-]{30,}/gu,
  },
  {
    kind: 'aws-access-key',
    pattern: /A(?:KI|SI)A[0-9A-Z]{16}/gu,
  },
  {
    kind: 'slack-token',
    pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/gu,
  },
  {
    kind: 'google-api-key',
    pattern: /AIza[0-9A-Za-z_-]{35}/gu,
  },
  {
    kind: 'npm-token',
    pattern: /npm_[A-Za-z0-9]{36}/gu,
  },
  {
    kind: 'gitlab-token',
    pattern: /glpat-[A-Za-z0-9_-]{20,}/gu,
  },
  {
    kind: 'stripe-live-key',
    pattern: /(?:sk|rk)_live_[A-Za-z0-9]{16,}/gu,
  },
  {
    kind: 'secret-assignment',
    pattern:
      /(?<![A-Za-z0-9_-])["']?(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key|password|passwd|secret)["']?(?![A-Za-z0-9_-])\s*[:=]\s*["']?[A-Za-z0-9+/=_-]{12,}/giu,
  },
];

function normalizedPath(value) {
  return value.split(sep).join('/');
}

function compareFindings(left, right) {
  if (left.path !== right.path) return left.path < right.path ? -1 : 1;
  if (left.line !== right.line) return left.line - right.line;
  if (left.kind !== right.kind) return left.kind < right.kind ? -1 : 1;
  return left.count - right.count;
}

function lineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) starts.push(index + 1);
  }
  return starts;
}

function lineForOffset(starts, offset) {
  let low = 0;
  let high = starts.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] <= offset) low = middle + 1;
    else high = middle;
  }
  return Math.max(1, low);
}

function lineBounds(text, offset) {
  const start = text.lastIndexOf('\n', Math.max(0, offset - 1)) + 1;
  const nextBreak = text.indexOf('\n', offset);
  return { start, end: nextBreak === -1 ? text.length : nextBreak };
}

function isDeprecatedPackageMetadata(text, path, start, end) {
  if (path !== 'package-lock.json') return false;
  const bounds = lineBounds(text, start);
  const line = text.slice(bounds.start, bounds.end).replace(/\r$/, '');
  const match = /^\s*"deprecated"\s*:\s*"((?:\\.|[^"\\])*)"\s*,?\s*$/.exec(line);
  if (!match || match.index === undefined) return false;
  const quotedValue = match[1] ?? '';
  const valueStartInLine = line.indexOf(quotedValue, match.index);
  if (valueStartInLine === -1) return false;
  const valueStart = bounds.start + valueStartInLine;
  const valueEnd = valueStart + quotedValue.length;
  return start >= valueStart && end <= valueEnd;
}

function isGeneratedUnicodeEscape(text, path, candidate, start) {
  return (
    path.startsWith('dist/') &&
    /^u[0-9a-f]{4}$/i.test(candidate) &&
    start > 0 &&
    text[start - 1] === '\\'
  );
}

function addRawMatch(matches, kind, start, length) {
  matches.push({ kind, start, length });
}

function readActionReference(text, start) {
  if (start >= text.length) return '';
  const quote = text[start] === '"' || text[start] === "'" ? text[start] : undefined;
  if (quote) {
    const end = text.indexOf(quote, start + 1);
    if (end === -1 || /[\r\n]/u.test(text.slice(start + 1, end))) return '';
    return text.slice(start + 1, end);
  }

  let end = start;
  while (end < text.length && !/[\s,#}\]`"']/u.test(text[end])) end += 1;
  return text.slice(start, end).replace(/[.;)]+$/u, '');
}

function isSafeLocalActionReference(reference) {
  if (!/^\.\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/u.test(reference)) return false;
  return reference.slice(2).split('/').every((segment) => segment !== '.' && segment !== '..');
}

function scanDocumentationActionReferences(text, matches) {
  const mappingPattern = /(?<![A-Za-z0-9_-])(?:"uses"|'uses'|uses)[ \t]*:[ \t]*/gu;
  for (const match of text.matchAll(mappingPattern)) {
    if (match.index === undefined) continue;
    const reference = readActionReference(text, match.index + match[0].length);
    if (!reference) continue;
    if (isSafeLocalActionReference(reference)) continue;
    if (reference.startsWith('./')) {
      addRawMatch(matches, 'mutable-github-action', match.index, match[0].length);
      continue;
    }

    if (!IMMUTABLE_ACTION_REFERENCE.test(reference) && ACTION_REFERENCE_COPY.test(reference)) {
      addRawMatch(matches, 'mutable-github-action', match.index, match[0].length);
    }
  }
}

function scanSemanticActionYamlReferences(text, matches) {
  const workflowMatches = [];

  try {
    const lineCounter = new LineCounter();
    const documents = parseAllDocuments(text, {
      lineCounter,
      logLevel: 'silent',
      prettyErrors: false,
      strict: true,
      uniqueKeys: true,
    });
    if (documents.length !== 1) throw new TypeError('invalid-action-yaml');

    const document = documents[0];
    if (document.errors.length > 0 || document.warnings.length > 0) {
      throw new TypeError('invalid-action-yaml');
    }

    const visited = new WeakSet();
    let aliasCount = 0;

    function resolveAlias(node) {
      aliasCount += 1;
      if (aliasCount > MAX_ACTION_YAML_ALIASES) throw new TypeError('invalid-action-yaml');
      const resolved = node.resolve(document);
      if (!resolved) throw new TypeError('invalid-action-yaml');
      return resolved;
    }

    function resolveString(node) {
      const resolved = isAlias(node) ? resolveAlias(node) : node;
      if (!isScalar(resolved) || typeof resolved.value !== 'string') {
        throw new TypeError('invalid-action-yaml');
      }
      return resolved.value;
    }

    function nodeOffset(node) {
      const offset = node?.range?.[0];
      return Number.isInteger(offset) ? offset : 0;
    }

    function walkNode(node) {
      if (node === null || node === undefined) return;
      if (typeof node !== 'object') throw new TypeError('invalid-action-yaml');
      if (visited.has(node)) return;
      visited.add(node);

      if (isAlias(node)) {
        walkNode(resolveAlias(node));
        return;
      }

      if (isMap(node)) {
        const semanticKeys = new Set();
        for (const pair of node.items) {
          const key = resolveString(pair.key);
          if (semanticKeys.has(key)) throw new TypeError('invalid-action-yaml');
          semanticKeys.add(key);
          if (key === 'uses') {
            const reference = resolveString(pair.value);
            if (
              !isSafeLocalActionReference(reference) &&
              !IMMUTABLE_ACTION_REFERENCE.test(reference)
            ) {
              addRawMatch(workflowMatches, 'mutable-github-action', nodeOffset(pair.key), 1);
            }
          } else {
            walkNode(pair.value);
          }
        }
        return;
      }

      if (isSeq(node)) {
        for (const item of node.items) walkNode(item);
        return;
      }

      if (!isScalar(node)) throw new TypeError('invalid-action-yaml');
    }

    walkNode(document.contents);
    matches.push(...workflowMatches);
  } catch {
    addRawMatch(matches, 'unscannable-content', 0, 1);
  }
}

function scanActionReferences(text, path, matches) {
  if (EXACT_WORKFLOW_PATH.test(path) || ACTION_MANIFEST_PATH.test(path)) {
    scanSemanticActionYamlReferences(text, matches);
  } else scanDocumentationActionReferences(text, matches);
}

function scanExtraRules(text, extraRules, matches) {
  for (const rule of extraRules) {
    if (
      !rule ||
      typeof rule.kind !== 'string' ||
      rule.kind.length === 0 ||
      typeof rule.literal !== 'string' ||
      rule.literal.length === 0
    ) {
      throw new TypeError('Private scan rules require a non-empty kind and literal.');
    }
    const haystack = rule.caseSensitive === false ? text.toLocaleLowerCase('en') : text;
    const needle = rule.caseSensitive === false ? rule.literal.toLocaleLowerCase('en') : rule.literal;
    let start = haystack.indexOf(needle);
    while (start !== -1) {
      addRawMatch(matches, rule.kind, start, needle.length);
      start = haystack.indexOf(needle, start + Math.max(1, needle.length));
    }
  }
}

export function scanText(text, { path = '<text>', extraRules = [] } = {}) {
  const publicPath = normalizedPath(path);
  const rawMatches = [];

  for (const { kind, pattern } of PUBLIC_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const candidate = match[0];
      const start = match.index;
      if (start === undefined) continue;
      const end = start + candidate.length;
      if (
        (kind === 'email' || kind === 'uk-postcode') &&
        isDeprecatedPackageMetadata(text, publicPath, start, end)
      ) {
        continue;
      }
      if (kind === 'uk-postcode' && isGeneratedUnicodeEscape(text, publicPath, candidate, start)) {
        continue;
      }
      addRawMatch(rawMatches, kind, start, candidate.length);
    }
  }

  scanActionReferences(text, publicPath, rawMatches);
  scanExtraRules(text, extraRules, rawMatches);

  const starts = lineStarts(text);
  const aggregate = new Map();
  for (const match of rawMatches) {
    const line = lineForOffset(starts, match.start);
    const key = `${match.kind}\u0000${line}`;
    const existing = aggregate.get(key);
    if (existing) existing.count += 1;
    else aggregate.set(key, { kind: match.kind, path: publicPath, line, count: 1 });
  }

  return [...aggregate.values()].sort(compareFindings);
}

function hasPrefix(buffer, bytes, offset = 0) {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function recognizedBinaryPayloadOffset(buffer) {
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 8;
  if (hasPrefix(buffer, [0x77, 0x4f, 0x46, 0x46])) return 4;
  if (hasPrefix(buffer, [0x77, 0x4f, 0x46, 0x32])) return 4;
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) return 3;
  if (hasPrefix(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])) return 6;
  if (hasPrefix(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return 6;
  if (
    hasPrefix(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    hasPrefix(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) return 12;
  if (hasPrefix(buffer, [0x00, 0x00, 0x01, 0x00])) return 4;
  return undefined;
}

function extractBinaryText(buffer, payloadOffset) {
  const parts = [];
  let length = 0;
  let pendingBreak = false;

  for (const character of buffer.subarray(payloadOffset).toString('utf8')) {
    if (BINARY_TEXT_BREAK.test(character)) {
      if (parts.length > 0) pendingBreak = true;
      continue;
    }

    if (pendingBreak) {
      parts.push(BINARY_TEXT_SEPARATOR);
      pendingBreak = false;
    }
    parts.push(character);
    length += character.length;
    if (length > BINARY_TEXT_SCAN_LIMIT) return undefined;
  }

  return parts.join('');
}

function scanRecognizedBinary(buffer, { path, extraRules, payloadOffset }) {
  const text = extractBinaryText(buffer, payloadOffset);
  if (text === undefined) throw new TypeError('binary-text-budget-exceeded');

  const publicPath = normalizedPath(path);
  const aggregate = new Map();
  for (const finding of scanText(text, { path: publicPath, extraRules })) {
    aggregate.set(finding.kind, (aggregate.get(finding.kind) ?? 0) + finding.count);
  }

  return [...aggregate.entries()]
    .map(([kind, count]) => ({ kind, path: publicPath, line: 1, count }))
    .sort(compareFindings);
}

export function scanBuffer(buffer, { path, extraRules = [] }) {
  try {
    const payloadOffset = recognizedBinaryPayloadOffset(buffer);
    if (payloadOffset !== undefined) {
      return scanRecognizedBinary(buffer, { path, extraRules, payloadOffset });
    }
    const text = TEXT_DECODER.decode(buffer);
    if (DISALLOWED_TEXT_CONTROLS.test(text)) throw new TypeError('disallowed-text-control');
    return scanText(text, { path, extraRules });
  } catch {
    return [{ kind: 'unscannable-content', path: normalizedPath(path), line: 1, count: 1 }];
  }
}

function trackedPaths(root) {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  return output
    .subarray(0, output.length > 0 && output[output.length - 1] === 0 ? output.length - 1 : output.length)
    .toString('binary')
    .split('\u0000')
    .filter(Boolean)
    .map((entry) => decoder.decode(Buffer.from(entry, 'binary')));
}

function walkDist(root, directory, targets) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    const publicPath = normalizedPath(relative(root, absolute));
    if (entry.isDirectory()) walkDist(root, absolute, targets);
    else targets.add(publicPath);
  }
}

export function collectScanTargets(root = process.cwd()) {
  const repositoryRoot = resolve(root);
  const dist = resolve(repositoryRoot, 'dist');
  if (!existsSync(dist) || !lstatSync(dist).isDirectory()) {
    throw new Error('missing-dist');
  }

  const targets = new Set(trackedPaths(repositoryRoot).map(normalizedPath));
  walkDist(repositoryRoot, dist, targets);
  return [...targets].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function isWithinRoot(root, target) {
  const fromRoot = relative(root, target);
  return fromRoot === '' || (!fromRoot.startsWith(`..${sep}`) && fromRoot !== '..' && !isAbsolute(fromRoot));
}

function readTarget(root, publicPath) {
  const absolute = resolve(root, publicPath);
  if (!isWithinRoot(root, absolute)) throw new Error('outside-repository');
  const metadata = lstatSync(absolute);
  if (metadata.isSymbolicLink()) {
    const realTarget = realpathSync(absolute);
    if (!isWithinRoot(root, realTarget)) throw new Error('outside-repository');
    return readFileSync(realTarget);
  }
  if (!metadata.isFile()) throw new Error('not-a-file');
  return readFileSync(absolute);
}

export function scanRepository(root = process.cwd(), { extraRules = [] } = {}) {
  const repositoryRoot = resolve(root);
  if (!existsSync(resolve(repositoryRoot, 'dist'))) {
    return [{ kind: 'missing-dist', path: 'dist', line: 1, count: 1 }];
  }

  let targets;
  try {
    targets = collectScanTargets(repositoryRoot);
  } catch (error) {
    const kind = error instanceof Error && error.message === 'missing-dist'
      ? 'missing-dist'
      : 'unscannable-content';
    return [{ kind, path: kind === 'missing-dist' ? 'dist' : '.', line: 1, count: 1 }];
  }

  const findings = [];
  for (const publicPath of targets) {
    try {
      findings.push(...scanBuffer(readTarget(repositoryRoot, publicPath), { path: publicPath, extraRules }));
    } catch {
      findings.push({ kind: 'unscannable-content', path: publicPath, line: 1, count: 1 });
    }
  }
  return findings.sort(compareFindings);
}

function runCli() {
  const findings = scanRepository(process.cwd());
  for (const finding of findings) process.stdout.write(`${JSON.stringify(finding)}\n`);
  process.exitCode = findings.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
