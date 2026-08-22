import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, it } from 'node:test';
import {
  collectScanTargets,
  scanBuffer,
  scanRepository,
  scanText,
} from './scan-public-content.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SCANNER_PATH = join(SCRIPT_DIR, 'scan-public-content.mjs');
const REPOSITORY_ROOT = resolve(SCRIPT_DIR, '..');
const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function findingKinds(text, options = {}) {
  return scanText(text, { path: 'fixture.txt', ...options }).map(({ kind }) => kind);
}

function makeRepository({ withDist = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'move-daily scan repo with spaces '));
  temporaryDirectories.push(root);
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  if (withDist) {
    mkdirSync(join(root, 'dist'), { recursive: true });
    writeFileSync(join(root, 'dist', 'index.html'), '<title>Move Daily</title>\n');
  }
  return root;
}

function writeTracked(root, relativePath, contents) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
  execFileSync('git', ['add', '--', relativePath], { cwd: root });
}

function recognizedBinaryFixtures() {
  return [
    {
      name: 'png',
      extension: 'png',
      signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      prefix: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    },
    {
      name: 'woff',
      extension: 'woff',
      signature: Buffer.from('wOFF', 'latin1'),
      printableSignatureLiterals: ['wOFF'],
      prefix: Buffer.concat([Buffer.from('wOFF', 'latin1'), Buffer.alloc(40)]),
    },
    {
      name: 'woff2',
      extension: 'woff2',
      signature: Buffer.from('wOF2', 'latin1'),
      printableSignatureLiterals: ['wOF2'],
      prefix: Buffer.concat([Buffer.from('wOF2', 'latin1'), Buffer.alloc(44)]),
    },
    {
      name: 'jpeg',
      extension: 'jpg',
      signature: Buffer.from([0xff, 0xd8, 0xff]),
      prefix: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]),
    },
    {
      name: 'gif87a',
      extension: 'gif',
      signature: Buffer.from('GIF87a', 'latin1'),
      printableSignatureLiterals: ['GIF87a'],
      prefix: Buffer.concat([Buffer.from('GIF87a', 'latin1'), Buffer.alloc(7)]),
    },
    {
      name: 'gif89a',
      extension: 'gif',
      signature: Buffer.from('GIF89a', 'latin1'),
      printableSignatureLiterals: ['GIF89a'],
      prefix: Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(7)]),
    },
    {
      name: 'webp',
      extension: 'webp',
      signature: Buffer.concat([
        Buffer.from('RIFF', 'latin1'),
        Buffer.alloc(4),
        Buffer.from('WEBP', 'latin1'),
      ]),
      printableSignatureLiterals: ['RIFF', 'WEBP'],
      prefix: Buffer.concat([
        Buffer.from('RIFF', 'latin1'),
        Buffer.alloc(4),
        Buffer.from('WEBPVP8 ', 'latin1'),
        Buffer.alloc(4),
      ]),
    },
    {
      name: 'ico',
      extension: 'ico',
      signature: Buffer.from([0x00, 0x00, 0x01, 0x00]),
      prefix: Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10, 0x00, 0x00]),
    },
  ];
}

describe('public text rules', () => {
  it('leaves ordinary product and generic clinical-boundary copy legal', () => {
    assert.deepEqual(findingKinds('Move Daily — local progress only.'), []);
    assert.deepEqual(
      findingKinds('Illustration only. Follow guidance from your clinician or physiotherapist.'),
      [],
    );
  });

  it('detects email and compact lowercase UK postcode candidates', () => {
    const address = 'person' + String.fromCharCode(64) + 'example.com';
    const postcode = 'sw11' + '6qf';

    assert.deepEqual(findingKinds(`${address}\n${postcode}`), ['email', 'uk-postcode']);
  });

  it('detects concrete macOS, Linux, and Windows private user paths', () => {
    const macPath = '/' + 'Users' + '/sample/private-notes';
    const linuxPath = '/' + 'home' + '/sample/private-notes';
    const windowsPath = 'C:' + '\\Users\\sample\\private-notes';

    assert.deepEqual(findingKinds(`${macPath}\n${linuxPath}\n${windowsPath}`), [
      'private-user-path',
      'private-user-path',
      'private-user-path',
    ]);
  });

  it('does not confuse repository-relative feature paths or dense integrity data for private data', () => {
    const relativeFeaturePath = 'src/features/' + 'home/HomeScreen.tsx';
    const integrityFragment = 'sha512-' + 'ab1c2de' + '/tail';

    assert.deepEqual(findingKinds(`${relativeFeaturePath}\n${integrityFragment}`), []);
  });

  it('detects PEM material and common provider credential formats', () => {
    const fixtures = [
      ['private-key', '-----BEGIN ' + 'PRIVATE KEY-----'],
      ['github-token', 'gh' + 'p_' + 'a'.repeat(36)],
      ['github-token', 'github' + '_pat_' + 'a'.repeat(30)],
      ['openai-key', 's' + 'k-' + 'a'.repeat(40)],
      ['anthropic-key', 's' + 'k-ant-api03-' + 'a'.repeat(40)],
      ['aws-access-key', 'A' + 'KIA' + 'A'.repeat(16)],
      ['slack-token', 'xo' + 'xb-' + 'a'.repeat(30)],
      ['google-api-key', 'AI' + 'za' + 'a'.repeat(35)],
      ['npm-token', 'np' + 'm_' + 'a'.repeat(36)],
      ['gitlab-token', 'gl' + 'pat-' + 'a'.repeat(24)],
      ['stripe-live-key', 'sk' + '_live_' + 'a'.repeat(24)],
    ];

    for (const [expectedKind, fixture] of fixtures) {
      assert.deepEqual(findingKinds(fixture), [expectedKind], expectedKind);
    }
  });

  it('detects a narrowly labelled secret assignment', () => {
    const fixture = 'api' + '_key = "' + 'a'.repeat(24) + '"';

    assert.deepEqual(findingKinds(fixture), ['secret-assignment']);
  });

  it('detects labelled secrets behind quoted JSON and YAML keys', () => {
    const jsonKey = ['api', 'key'].join('_');
    const yamlKey = ['client', 'secret'].join('_');
    const tokenKey = ['access', 'token'].join('_');
    const text = [
      JSON.stringify({ [jsonKey]: 'a'.repeat(24) }),
      `'${yamlKey}': '${'b'.repeat(24)}'`,
      `"${tokenKey}": ${'c'.repeat(24)}`,
    ].join('\n');

    assert.deepEqual(scanText(text, { path: 'config.example' }), [
      { kind: 'secret-assignment', path: 'config.example', line: 1, count: 1 },
      { kind: 'secret-assignment', path: 'config.example', line: 2, count: 1 },
      { kind: 'secret-assignment', path: 'config.example', line: 3, count: 1 },
    ]);
  });

  it('does not match a labelled fragment inside a longer quoted key', () => {
    const longerKey = ['example', 'api', 'key', 'suffix'].join('_');

    assert.deepEqual(findingKinds(JSON.stringify({ [longerKey]: 'a'.repeat(24) })), []);
  });

  it('reports one-based lines for LF and CRLF input', () => {
    const address = 'person' + String.fromCharCode(64) + 'example.com';

    assert.equal(scanText(`safe\n${address}`, { path: 'lf.txt' })[0]?.line, 2);
    assert.equal(scanText(`safe\r\n${address}`, { path: 'crlf.txt' })[0]?.line, 2);
  });

  it('aggregates repeated same-kind candidates on one line without disclosing values', () => {
    const first = 'first' + String.fromCharCode(64) + 'example.com';
    const second = 'second' + String.fromCharCode(64) + 'example.org';

    const findings = scanText(`${first} ${second}`, { path: 'same-line.txt' });

    assert.deepEqual(findings, [
      { kind: 'email', path: 'same-line.txt', line: 1, count: 2 },
    ]);
    assert.deepEqual(Object.keys(findings[0]).sort(), ['count', 'kind', 'line', 'path']);
    assert.doesNotMatch(JSON.stringify(findings), /first|second|example/);
  });
});

describe('GitHub Action immutability rule', () => {
  const actionLine = (reference) => 'uses' + ': actions/checkout' + `@${reference}`;
  const mappingKey = ['us', 'es'].join('');
  const escapedMappingKey = `"us${String.fromCharCode(92)}u0065s"`;
  const mutableReference = ['actions', 'checkout@v4'].join('/');
  const exactReference = ['actions', `checkout@${'a'.repeat(40)}`].join('/');
  const exactSubpathReference = ['acme', `tools/build@${'b'.repeat(40)}`].join('/');
  const localReference = ['./.github', 'actions/check'].join('/');

  it('accepts an exact 40-hex remote ref and a local action', () => {
    assert.deepEqual(findingKinds(actionLine('a'.repeat(40))), []);
    assert.deepEqual(findingKinds('uses' + ': ./actions/check'), []);
  });

  it('rejects a tag, branch, and 39- or 41-character pseudo-pin', () => {
    assert.deepEqual(findingKinds(actionLine('v7')), ['mutable-github-action']);
    assert.deepEqual(findingKinds(actionLine('main')), ['mutable-github-action']);
    assert.deepEqual(findingKinds(actionLine('a'.repeat(39))), ['mutable-github-action']);
    assert.deepEqual(findingKinds(actionLine('a'.repeat(41))), ['mutable-github-action']);
  });

  it('detects mutable remote Actions in block, flow, and quoted workflow mappings', () => {
    const workflow = [
      'steps:',
      `  - ${mappingKey}: '${mutableReference}'`,
      `  - { ${mappingKey}: ${mutableReference} }`,
      `  - { "${mappingKey}": "${mutableReference}" }`,
      `  - '${mappingKey}': "${mutableReference}"`,
      `  - { ${mappingKey}: ${['actions', `checkout@${'a'.repeat(39)}`].join('/')} }`,
      `  - { ${mappingKey}: ${['actions', `checkout@${'a'.repeat(41)}`].join('/')} }`,
    ].join('\n');

    assert.deepEqual(scanText(workflow, { path: '.github/workflows/example.yml' }), [
      { kind: 'mutable-github-action', path: '.github/workflows/example.yml', line: 2, count: 1 },
      { kind: 'mutable-github-action', path: '.github/workflows/example.yml', line: 3, count: 1 },
      { kind: 'mutable-github-action', path: '.github/workflows/example.yml', line: 4, count: 1 },
      { kind: 'mutable-github-action', path: '.github/workflows/example.yml', line: 5, count: 1 },
      { kind: 'mutable-github-action', path: '.github/workflows/example.yml', line: 6, count: 1 },
      { kind: 'mutable-github-action', path: '.github/workflows/example.yml', line: 7, count: 1 },
    ]);
  });

  it('flags workflow aliases without trusting their anchor target', () => {
    const workflow = [
      `x-action: &checkout ${mutableReference}`,
      'jobs:',
      '  build:',
      '    steps:',
      `      - ${mappingKey}: *checkout`,
    ].join('\n');

    assert.deepEqual(scanText(workflow, { path: '.github/workflows/alias.yml' }), [
      { kind: 'mutable-github-action', path: '.github/workflows/alias.yml', line: 5, count: 1 },
    ]);
  });

  it('flags folded and literal workflow uses scalars', () => {
    const workflow = [
      `- ${mappingKey}: >-`,
      `    ${mutableReference}`,
      `- "${mappingKey}": |`,
      `    ${exactReference}`,
    ].join('\n');

    assert.deepEqual(scanText(workflow, { path: '.github/workflows/scalars.yaml' }), [
      { kind: 'mutable-github-action', path: '.github/workflows/scalars.yaml', line: 1, count: 1 },
      { kind: 'mutable-github-action', path: '.github/workflows/scalars.yaml', line: 3, count: 1 },
    ]);
  });

  it('flags workflow uses values that cannot be parsed on the same line', () => {
    const workflow = [
      `- ${mappingKey}:`,
      `    ${mutableReference}`,
      `- "${mappingKey}": "${['actions', 'checkout@'].join('/')}\\`,
      '    v4"',
    ].join('\n');

    assert.deepEqual(scanText(workflow, { path: '.github/workflows/continued.yml' }), [
      { kind: 'mutable-github-action', path: '.github/workflows/continued.yml', line: 1, count: 1 },
      { kind: 'mutable-github-action', path: '.github/workflows/continued.yml', line: 3, count: 1 },
    ]);
  });

  it('resolves escaped and explicit semantic uses keys in workflow YAML', () => {
    const workflow = [
      'steps:',
      `  - ${escapedMappingKey}: ${mutableReference}`,
      `  - ? ${mappingKey}`,
      `    : ${mutableReference}`,
    ].join('\n');

    assert.deepEqual(scanText(workflow, { path: '.github/workflows/semantic-keys.yml' }), [
      {
        kind: 'mutable-github-action',
        path: '.github/workflows/semantic-keys.yml',
        line: 2,
        count: 1,
      },
      {
        kind: 'mutable-github-action',
        path: '.github/workflows/semantic-keys.yml',
        line: 3,
        count: 1,
      },
    ]);
  });

  it('resolves aliases used as semantic uses keys and values', () => {
    const workflow = [
      `x-key: &action-key ${mappingKey}`,
      `x-action: &action-value ${mutableReference}`,
      'steps:',
      '  - ? *action-key',
      '    : *action-value',
    ].join('\n');

    assert.deepEqual(scanText(workflow, { path: '.github/workflows/alias-pair.yaml' }), [
      {
        kind: 'mutable-github-action',
        path: '.github/workflows/alias-pair.yaml',
        line: 4,
        count: 1,
      },
    ]);
  });

  it('scans an anchored whole mapping once at its source definition', () => {
    const workflow = [
      'x-step: &whole-step',
      `  ${escapedMappingKey}: ${mutableReference}`,
      'steps:',
      '  - *whole-step',
      '  - *whole-step',
    ].join('\n');

    assert.deepEqual(scanText(workflow, { path: '.github/workflows/whole-map.yml' }), [
      {
        kind: 'mutable-github-action',
        path: '.github/workflows/whole-map.yml',
        line: 2,
        count: 1,
      },
    ]);
  });

  it('accepts semantically exact pins and local Actions across YAML forms', () => {
    const workflow = [
      `x-key: &action-key ${mappingKey}`,
      `x-action: &action-value ${exactReference}`,
      'x-step: &whole-step',
      `  ${escapedMappingKey}: ${exactReference}`,
      'steps:',
      `  - ${escapedMappingKey}: ${exactReference}`,
      `  - ? ${mappingKey}`,
      `    : ${localReference}`,
      '  - ? *action-key',
      '    : *action-value',
      '  - *whole-step',
      `  - ${mappingKey}: >-`,
      `      ${exactReference}`,
      `  - ${mappingKey}: ${exactSubpathReference}`,
    ].join('\n');

    assert.deepEqual(
      scanText(workflow, { path: '.github/workflows/semantic-safe.yml' }),
      [],
    );
  });

  it('fails closed once for invalid, duplicate-key, multi-document, and warning YAML', () => {
    const fixtures = [
      ['invalid.yml', `steps:\n  - ${mappingKey}: [`],
      [
        'duplicate.yml',
        [
          'steps:',
          `  - ${mappingKey}: ${exactReference}`,
          `    ${mappingKey}: ${exactReference}`,
        ].join('\n'),
      ],
      [
        'alias-duplicate.yml',
        [
          `x-key: &action-key ${mappingKey}`,
          'step:',
          `  ${mappingKey}: ${exactReference}`,
          '  ? *action-key',
          `  : ${exactReference}`,
        ].join('\n'),
      ],
      [
        'multiple.yml',
        [`${mappingKey}: ${exactReference}`, '---', `${mappingKey}: ${exactReference}`].join('\n'),
      ],
      ['warning.yml', `${mappingKey}: !unknown ${exactReference}`],
    ];

    for (const [name, workflow] of fixtures) {
      const path = `.github/workflows/${name}`;
      const findings = scanText(workflow, { path });
      assert.deepEqual(findings, [
        { kind: 'unscannable-content', path, line: 1, count: 1 },
      ], name);
      assert.deepEqual(Object.keys(findings[0]).sort(), ['count', 'kind', 'line', 'path']);
      assert.doesNotMatch(
        JSON.stringify(findings.map(({ path: _path, ...finding }) => finding)),
        /checkout|unknown|duplicate/iu,
      );
    }
  });

  it('fails closed once for non-string and unresolvable workflow keys or values', () => {
    const fixtures = [
      ['sequence-value.yml', `${mappingKey}: [${exactReference}]`],
      ['missing-value-alias.yml', `${mappingKey}: *missing-value`],
      [
        'missing-key-alias.yml',
        ['steps:', '  - ? *missing-key', `    : ${exactReference}`].join('\n'),
      ],
      ['complex-key.yml', [`? [${mappingKey}]`, `: ${exactReference}`].join('\n')],
    ];

    for (const [name, workflow] of fixtures) {
      const path = `.github/workflows/${name}`;
      assert.deepEqual(scanText(workflow, { path }), [
        { kind: 'unscannable-content', path, line: 1, count: 1 },
      ], name);
    }
  });

  it('fails closed when workflow aliases exceed the bounded parser budget', () => {
    const workflow = [
      'x-step: &safe-step',
      `  ${mappingKey}: ${localReference}`,
      'steps:',
      ...Array.from({ length: 101 }, () => '  - *safe-step'),
    ].join('\n');

    assert.deepEqual(scanText(workflow, { path: '.github/workflows/alias-budget.yml' }), [
      {
        kind: 'unscannable-content',
        path: '.github/workflows/alias-budget.yml',
        line: 1,
        count: 1,
      },
    ]);
  });

  it('detects mutable Action copies embedded in documentation text', () => {
    const docs = [
      `Example: ${mappingKey}: ${mutableReference}`,
      `Copy \`${mappingKey}: "${mutableReference}"\` into the workflow.`,
      `Flow copy: { ${mappingKey}: ${['acme', 'tools/build@main'].join('/')} }`,
    ].join('\n');

    assert.deepEqual(scanText(docs, { path: 'docs/example.md' }), [
      { kind: 'mutable-github-action', path: 'docs/example.md', line: 1, count: 1 },
      { kind: 'mutable-github-action', path: 'docs/example.md', line: 2, count: 1 },
      { kind: 'mutable-github-action', path: 'docs/example.md', line: 3, count: 1 },
    ]);
  });

  it('ignores slash-shaped prose outside workflow YAML when it is not an Action reference', () => {
    const docs = [
      `This module ${mappingKey}: src/features/home.ts`,
      `Movement ${mappingKey}: arms/legs.`,
      `Flow example: { "${mappingKey}": "src/features/settings.ts" }`,
    ].join('\n');

    assert.deepEqual(scanText(docs, { path: 'docs/architecture.md' }), []);
  });

  it('keeps workflow conservatism scoped to the workflow YAML path', () => {
    const text = `${mappingKey}: src/features/home.ts`;

    assert.deepEqual(scanText(text, { path: '.github/workflows/example.txt' }), []);
    assert.deepEqual(scanText(text, { path: 'docs/.github/workflows/example.yml' }), []);
    assert.deepEqual(scanText(text, { path: '.github/workflows/nested/example.yml' }), []);
  });

  it('semantically scans extension-only hidden workflow basenames', () => {
    const workflow = `${escapedMappingKey}: ${mutableReference}`;

    for (const extension of ['yml', 'yaml']) {
      const path = `.github/workflows/.${extension}`;
      assert.deepEqual(scanText(workflow, { path }), [
        { kind: 'mutable-github-action', path, line: 1, count: 1 },
      ], extension);
    }
  });

  it('ignores empty and continued uses prose outside workflow YAML', () => {
    const prose = [
      `This section ${mappingKey}:`,
      '  src/features/home.ts',
      `Example ${mappingKey}: "${['src', 'features/'].join('/')}\\`,
      '  home.ts"',
    ].join('\n');

    assert.deepEqual(scanText(prose, { path: 'docs/architecture.md' }), []);
    assert.deepEqual(scanText(prose, { path: '.github/workflows/example.txt' }), []);
  });

  it('accepts exact pins and local Actions in flow mappings and documentation', () => {
    const text = [
      `- { ${mappingKey}: ${exactReference} }`,
      `- { "${mappingKey}": "${localReference}" }`,
      `Example: ${mappingKey}: '${exactReference}'`,
      `Example: ${mappingKey}: ${localReference}`,
    ].join('\n');

    assert.deepEqual(scanText(text, { path: 'docs/safe-examples.md' }), []);
  });

  it('ignores near-boundary prose that is not a uses mapping', () => {
    const text = [
      `abuses: ${mutableReference}`,
      `reuses: ${mutableReference}`,
      `${mappingKey}-example: ${mutableReference}`,
      `${mappingKey} ${mutableReference}`,
    ].join('\n');

    assert.deepEqual(scanText(text, { path: 'docs/prose.md' }), []);
  });
});

describe('semantic local composite Action manifests', () => {
  const mappingKey = ['us', 'es'].join('');
  const escapedMappingKey = `"us${String.fromCharCode(92)}u0065s"`;
  const mutableReference = ['actions', 'checkout@v4'].join('/');
  const exactReference = ['actions', `checkout@${'a'.repeat(40)}`].join('/');
  const exactSubpathReference = ['acme', `tools/build@${'b'.repeat(40)}`].join('/');

  it('finds escaped, explicit, aliased, and anchored mutable refs in either manifest extension', () => {
    const manifest = [
      `x-key: &action-key ${mappingKey}`,
      `x-action: &action-value ${mutableReference}`,
      'x-step: &whole-step',
      `  ${escapedMappingKey}: ${mutableReference}`,
      'runs:',
      '  using: composite',
      '  steps:',
      `    - ${escapedMappingKey}: ${mutableReference}`,
      `    - ? ${mappingKey}`,
      `      : ${mutableReference}`,
      '    - ? *action-key',
      '      : *action-value',
      '    - *whole-step',
    ].join('\n');
    const paths = [
      'action.yml',
      '.github/actions/example/action.yaml',
    ];

    for (const path of paths) {
      assert.deepEqual(scanText(manifest, { path }), [
        { kind: 'mutable-github-action', path, line: 4, count: 1 },
        { kind: 'mutable-github-action', path, line: 8, count: 1 },
        { kind: 'mutable-github-action', path, line: 9, count: 1 },
        { kind: 'mutable-github-action', path, line: 11, count: 1 },
      ], path);
    }
  });

  it('accepts exact remote pins and ordinary normalized local paths in manifests', () => {
    const manifest = [
      'runs:',
      '  using: composite',
      '  steps:',
      `    - ${mappingKey}: ${exactReference}`,
      `    - ${mappingKey}: ${exactSubpathReference}`,
      `    - ${mappingKey}: ./actions/child`,
      `    - ${mappingKey}: ./.github/actions/check`,
    ].join('\n');

    assert.deepEqual(scanText(manifest, { path: 'nested/action.yml' }), []);
    assert.deepEqual(scanText(manifest, { path: 'dist/vendor/action.yaml' }), []);
  });

  it('fails closed once on invalid local Action manifests in either extension', () => {
    const manifest = ['runs:', '  using: composite', '  steps:', `    - ${mappingKey}: [`].join('\n');

    for (const path of ['action.yml', 'nested/action.yaml']) {
      assert.deepEqual(scanText(manifest, { path }), [
        { kind: 'unscannable-content', path, line: 1, count: 1 },
      ], path);
    }
  });

  it('rejects empty, traversal, expression, non-normal, and backslash local Action values', () => {
    const unsafeReferences = [
      './',
      './../escape',
      './actions/../other',
      './actions//child',
      './${{ matrix.path }}',
      './actions\\child',
      '../action',
      '',
    ];
    const manifest = [
      'runs:',
      '  using: composite',
      '  steps:',
      ...unsafeReferences.map((reference) => `    - ${mappingKey}: '${reference}'`),
    ].join('\n');

    for (const path of ['.github/workflows/local.yml', '.github/actions/local/action.yaml']) {
      assert.deepEqual(scanText(manifest, { path }), unsafeReferences.map((_, index) => ({
        kind: 'mutable-github-action',
        path,
        line: index + 4,
        count: 1,
      })), path);
    }
  });

  it('leaves near-name, nested-segment, and ordinary documentation controls outside semantic parsing', () => {
    const encodedCopy = `${escapedMappingKey}: ${mutableReference}`;
    const nearPaths = [
      'tools/action.yml.example',
      'tools/my-action.yml',
      'docs/action.yaml.md',
      'tools/action.yml/readme.md',
      'tools/Action.yml',
    ];

    for (const path of nearPaths) assert.deepEqual(scanText(encodedCopy, { path }), [], path);
    assert.deepEqual(
      scanText(`This module ${mappingKey}: arms/legs.`, { path: 'docs/composite-actions.md' }),
      [],
    );
  });
});

describe('path-aware suppressions', () => {
  it('suppresses only email and postcode candidates in a package-lock deprecated value', () => {
    const address = 'maintainer' + String.fromCharCode(64) + 'example.com';
    const postcode = 'sw11' + '6qf';
    const text = JSON.stringify({ packages: { x: { deprecated: `${address} ${postcode}` } } }, null, 2);

    assert.deepEqual(scanText(text, { path: 'package-lock.json' }), []);
  });

  it('does not suppress package-lock candidates under another key or a credential', () => {
    const address = 'maintainer' + String.fromCharCode(64) + 'example.com';
    const credential = 'gh' + 'p_' + 'a'.repeat(36);
    const text = JSON.stringify(
      { packages: { x: { description: address, deprecated: credential } } },
      null,
      2,
    );

    assert.deepEqual(
      scanText(text, { path: 'package-lock.json' }).map(({ kind }) => kind),
      ['email', 'github-token'],
    );
  });

  it('suppresses only a generated dist Unicode-escape postcode lookalike', () => {
    const escapeCandidate = '\\' + 'u00' + 'AD';
    const realPostcode = 'sw11' + '6qf';

    assert.deepEqual(scanText(escapeCandidate, { path: 'dist/assets/app.js' }), []);
    assert.deepEqual(findingKinds(escapeCandidate), ['uk-postcode']);
    assert.deepEqual(
      scanText(realPostcode, { path: 'dist/assets/app.js' }).map(({ kind }) => kind),
      ['uk-postcode'],
    );
  });
});

describe('repository target enumeration and decoding', () => {
  it('enumerates every tracked target plus recursive dist files, including hidden and spaced names', () => {
    const root = makeRepository();
    writeTracked(root, '.hidden', 'safe\n');
    writeTracked(root, 'NOTICE', 'safe\n');
    writeTracked(root, 'docs/name with spaces.md', 'safe\n');
    writeFileSync(join(root, 'untracked.txt'), 'not part of the public candidate\n');
    mkdirSync(join(root, 'dist', 'assets', 'nested'), { recursive: true });
    writeFileSync(join(root, 'dist', 'assets', 'nested', 'app.js'), 'safe\n');

    assert.deepEqual(collectScanTargets(root), [
      '.hidden',
      'NOTICE',
      'dist/assets/nested/app.js',
      'dist/index.html',
      'docs/name with spaces.md',
    ]);
  });

  it('excludes untracked source files while scanning recursive dist output', () => {
    const root = makeRepository();
    const address = 'person' + String.fromCharCode(64) + 'example.com';
    writeTracked(root, 'safe.txt', 'safe\n');
    writeFileSync(join(root, 'untracked.txt'), address);

    assert.deepEqual(scanRepository(root), []);

    mkdirSync(join(root, 'dist', 'deep'), { recursive: true });
    writeFileSync(join(root, 'dist', 'deep', 'unsafe.js'), address);
    assert.deepEqual(scanRepository(root), [
      { kind: 'email', path: 'dist/deep/unsafe.js', line: 1, count: 1 },
    ]);
  });

  it('fails closed when dist is missing', () => {
    const root = makeRepository({ withDist: false });
    writeTracked(root, 'safe.txt', 'safe\n');

    assert.deepEqual(scanRepository(root), [
      { kind: 'missing-dist', path: 'dist', line: 1, count: 1 },
    ]);
  });

  it('accepts clean recognised binary shells and fails closed on undecodable text', () => {
    const recognisedBinaries = [
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff]),
      Buffer.from('wOFFbinary', 'latin1'),
      Buffer.from('wOF2binary', 'latin1'),
      Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      Buffer.from('GIF87a\xff', 'latin1'),
      Buffer.from('GIF89a\xff', 'latin1'),
      Buffer.concat([Buffer.from('RIFF1234WEBP', 'latin1'), Buffer.from([0xff])]),
      Buffer.from([0x00, 0x00, 0x01, 0x00, 0xff]),
    ];
    const invalidUtf8 = Buffer.from([0xc3, 0x28]);

    for (const binary of recognisedBinaries) {
      assert.deepEqual(scanBuffer(binary, { path: 'dist/asset.bin' }), []);
    }
    assert.deepEqual(scanBuffer(invalidUtf8, { path: 'dist/data.bin' }), [
      { kind: 'unscannable-content', path: 'dist/data.bin', line: 1, count: 1 },
    ]);
  });

  it('scans visible UTF-8 payloads behind every recognized binary family magic', () => {
    const address = 'person' + String.fromCharCode(64) + 'example.com';
    const credential = 'gh' + 'p_' + 'a'.repeat(36);
    const privatePath = '/' + 'Users' + '/sample/private-notes';
    const postcode = 'sw11' + '6qf';
    const privateLiteral = ['private', '-delta-', '标', '记'].join('');
    const embeddedPrivateLiteral = ['PRIVATE', '-DELTA-', '标', '记'].join('');
    const payload = [address, credential, privatePath, postcode, embeddedPrivateLiteral].join('\u0000');

    for (const { name, extension, prefix } of recognizedBinaryFixtures()) {
      const path = `dist/${name}.${extension}`;
      const buffer = Buffer.concat([
        prefix,
        Buffer.from([0x00, 0xff, 0x00]),
        Buffer.from(payload, 'utf8'),
      ]);
      const findings = scanBuffer(buffer, {
        path,
        extraRules: [{
          kind: 'private-identifier',
          literal: privateLiteral,
          caseSensitive: false,
        }],
      });

      assert.deepEqual(findings, [
        { kind: 'email', path, line: 1, count: 1 },
        { kind: 'github-token', path, line: 1, count: 1 },
        { kind: 'private-identifier', path, line: 1, count: 1 },
        { kind: 'private-user-path', path, line: 1, count: 1 },
        { kind: 'uk-postcode', path, line: 1, count: 1 },
      ], name);
      assert.ok(findings.every((finding) => (
        JSON.stringify(Object.keys(finding).sort()) === JSON.stringify(['count', 'kind', 'line', 'path'])
      )));
      assert.doesNotMatch(JSON.stringify(findings), /person|example|private-notes|标记/iu);
    }
  });

  it('does not join text fragments across binary controls or flag safe metadata-like islands', () => {
    const fragmentedPayload = Buffer.concat([
      Buffer.from('Creator Move Daily; person', 'utf8'),
      Buffer.from([0x00]),
      Buffer.from(String.fromCharCode(64) + 'example.com; gh' + 'p_' + 'a'.repeat(10), 'utf8'),
      Buffer.from([0xff]),
      Buffer.from('a'.repeat(30) + '; /' + 'Users' + '/', 'utf8'),
      Buffer.from([0x00]),
      Buffer.from('sample/private; sw11', 'utf8'),
      Buffer.from([0x00]),
      Buffer.from('6qf; PRIVATE-', 'utf8'),
      Buffer.from([0x00]),
      Buffer.from('DELTA-标记', 'utf8'),
    ]);
    const privateLiteral = ['private', '-delta-', '标', '记'].join('');

    for (const { name, extension, prefix } of recognizedBinaryFixtures()) {
      assert.deepEqual(scanBuffer(Buffer.concat([prefix, fragmentedPayload]), {
        path: `dist/${name}-control.${extension}`,
        extraRules: [{ kind: 'private-identifier', literal: privateLiteral, caseSensitive: false }],
      }), [], name);
    }
  });

  it('fails closed when printable binary metadata exceeds the bounded scan budget', () => {
    const [{ prefix }] = recognizedBinaryFixtures();
    const oversized = Buffer.concat([
      prefix,
      Buffer.from([0x00]),
      Buffer.alloc(1_100_000, 0x41),
    ]);

    assert.deepEqual(scanBuffer(oversized, { path: 'dist/oversized.png' }), [
      { kind: 'unscannable-content', path: 'dist/oversized.png', line: 1, count: 1 },
    ]);
  });

  it('keeps current generated PNG and WOFF2 assets clean under binary text scanning', () => {
    const realAssets = collectScanTargets(REPOSITORY_ROOT).filter((path) => (
      path.startsWith('dist/') && /\.(?:png|woff2)$/u.test(path)
    ));

    assert.ok(realAssets.some((path) => path.endsWith('.png')));
    assert.ok(realAssets.some((path) => path.endsWith('.woff2')));
    for (const path of realAssets) {
      assert.deepEqual(
        scanBuffer(readFileSync(join(REPOSITORY_ROOT, path)), { path }),
        [],
        path,
      );
    }
  });

  describe('recognized binary signature boundaries', () => {
    const privatePath = '/' + 'Users' + '/sample/private-notes';
    const privateLiteral = ['boundary', '-delta-', '标', '记'].join('');
    const embeddedPrivateLiteral = ['BOUNDARY', '-DELTA-', '标', '记'].join('');

    for (const { name, extension, signature } of recognizedBinaryFixtures()) {
      it(`starts ${name} metadata scanning at the exact first payload byte`, () => {
        const path = `dist/${name}-adjacent.${extension}`;

        assert.deepEqual(scanBuffer(Buffer.concat([
          signature,
          Buffer.from(embeddedPrivateLiteral, 'utf8'),
        ]), {
          path,
          extraRules: [{ kind: 'private-identifier', literal: privateLiteral, caseSensitive: false }],
        }), [
          { kind: 'private-identifier', path, line: 1, count: 1 },
        ]);
        assert.deepEqual(scanBuffer(Buffer.concat([
          signature,
          Buffer.from(privatePath, 'utf8'),
        ]), { path }), [
          { kind: 'private-user-path', path, line: 1, count: 1 },
        ]);
      });
    }

    const boundarySensitivePayloads = [
      { kind: 'email', value: 'person' + String.fromCharCode(64) + 'example.com' },
      { kind: 'private-user-path', value: privatePath },
      { kind: 'secret-assignment', value: ['pass', 'word=', 'a'.repeat(12)].join('') },
      { kind: 'uk-postcode', value: ['sw11', '6qf'].join('') },
    ];

    for (const {
      name,
      extension,
      signature,
      printableSignatureLiterals,
    } of recognizedBinaryFixtures().filter((fixture) => fixture.printableSignatureLiterals)) {
      for (const { kind, value } of boundarySensitivePayloads) {
        it(`detects ${kind} adjacent to ${name} magic`, () => {
          const path = `dist/${name}-boundary.${extension}`;
          assert.deepEqual(scanBuffer(Buffer.concat([
            signature,
            Buffer.from(value, 'utf8'),
          ]), { path }), [
            { kind, path, line: 1, count: 1 },
          ], kind);
        });
      }

      it(`does not scan ${name} signature bytes as metadata`, () => {
        const path = `dist/${name}-signature.${extension}`;
        for (const literal of printableSignatureLiterals) {
          assert.deepEqual(scanBuffer(Buffer.concat([
            signature,
            Buffer.from('safe metadata', 'utf8'),
          ]), {
            path,
            extraRules: [{ kind: 'private-signature', literal }],
          }), [], literal);
        }
      });
    }

    it('excludes recognized signature bytes from the printable metadata budget', () => {
      const { signature } = recognizedBinaryFixtures().find(({ name }) => name === 'woff');

      assert.deepEqual(scanBuffer(Buffer.concat([
        signature,
        Buffer.alloc(1024 * 1024, 0x41),
      ]), { path: 'dist/exact-budget.woff' }), []);
    });

    it('does not charge trailing binary controls to the exact printable budget', () => {
      const { signature } = recognizedBinaryFixtures().find(({ name }) => name === 'woff');

      assert.deepEqual(scanBuffer(Buffer.concat([
        signature,
        Buffer.alloc(1024 * 1024, 0x41),
        Buffer.from([0x00, 0xff, 0x00]),
      ]), { path: 'dist/exact-budget-trailing-controls.woff' }), []);
    });

    it('does not charge manufactured separators between exact-budget text islands', () => {
      const { signature } = recognizedBinaryFixtures().find(({ name }) => name === 'woff');

      assert.deepEqual(scanBuffer(Buffer.concat([
        signature,
        Buffer.alloc(512 * 1024, 0x41),
        Buffer.from([0x00]),
        Buffer.alloc(512 * 1024, 0x42),
      ]), { path: 'dist/exact-budget-split-islands.woff' }), []);
    });
  });

  it('fails closed on BOM-less UTF-16 and disallowed decoded controls', () => {
    const bomlessUtf16Le = Buffer.from('Move Daily', 'utf16le');
    const bomlessUtf16Be = Buffer.from(
      [...'Move Daily'].flatMap((character) => [0, character.charCodeAt(0)]),
    );
    const decodedControl = Buffer.from('safe\u000bsuffix', 'utf8');

    assert.deepEqual(scanBuffer(bomlessUtf16Le, { path: 'dist/utf16le.txt' }), [
      { kind: 'unscannable-content', path: 'dist/utf16le.txt', line: 1, count: 1 },
    ]);
    assert.deepEqual(scanBuffer(bomlessUtf16Be, { path: 'dist/utf16be.txt' }), [
      { kind: 'unscannable-content', path: 'dist/utf16be.txt', line: 1, count: 1 },
    ]);
    assert.deepEqual(scanBuffer(decodedControl, { path: 'dist/control.txt' }), [
      { kind: 'unscannable-content', path: 'dist/control.txt', line: 1, count: 1 },
    ]);
  });

  it('fails closed on UTF-16 BOMs and accepts a UTF-8 BOM', () => {
    const utf16LeBom = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('Move Daily', 'utf16le'),
    ]);
    const utf16BeBom = Buffer.from([0xfe, 0xff, 0x00, 0x4d, 0x00, 0x6f, 0x00, 0x76, 0x00, 0x65]);
    const utf8Bom = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('Move Daily', 'utf8'),
    ]);

    assert.deepEqual(scanBuffer(utf16LeBom, { path: 'dist/utf16le-bom.txt' }), [
      { kind: 'unscannable-content', path: 'dist/utf16le-bom.txt', line: 1, count: 1 },
    ]);
    assert.deepEqual(scanBuffer(utf16BeBom, { path: 'dist/utf16be-bom.txt' }), [
      { kind: 'unscannable-content', path: 'dist/utf16be-bom.txt', line: 1, count: 1 },
    ]);
    assert.deepEqual(scanBuffer(utf8Bom, { path: 'dist/utf8-bom.txt' }), []);
  });

  it('does not follow a tracked symlink outside the repository', () => {
    const root = makeRepository();
    const outsideRoot = mkdtempSync(join(tmpdir(), 'move-daily outside '));
    temporaryDirectories.push(outsideRoot);
    const outsideFile = join(outsideRoot, 'private.txt');
    writeFileSync(outsideFile, 'safe\n');
    symlinkSync(outsideFile, join(root, 'outside-link'));
    execFileSync('git', ['add', '--', 'outside-link'], { cwd: root });

    assert.deepEqual(scanRepository(root), [
      { kind: 'unscannable-content', path: 'outside-link', line: 1, count: 1 },
    ]);
  });
});

describe('private-rule injection and scanner self-protection', () => {
  it('supports an in-memory private literal without ever returning its value', () => {
    const privateValue = ['synthetic', 'private', 'marker'].join('-');
    const findings = scanText(`safe ${privateValue}`, {
      path: 'public.txt',
      extraRules: [{ kind: 'private-identifier', literal: privateValue }],
    });

    assert.deepEqual(findings, [
      { kind: 'private-identifier', path: 'public.txt', line: 1, count: 1 },
    ]);
    assert.doesNotMatch(JSON.stringify(findings), /synthetic|marker/);
  });

  it('keeps the scanner source and fragmented test fixtures clean', () => {
    const scannerSource = readFileSync(SCANNER_PATH, 'utf8');
    const testSource = readFileSync(fileURLToPath(import.meta.url), 'utf8');

    assert.deepEqual(scanText(scannerSource, { path: 'scripts/scan-public-content.mjs' }), []);
    assert.deepEqual(scanText(testSource, { path: 'scripts/scan-public-content.test.mjs' }), []);
  });
});

describe('CLI behavior', () => {
  it('is silent and successful for a clean repository', () => {
    const root = makeRepository();
    writeTracked(root, 'safe file.txt', 'safe\n');

    const result = spawnSync(process.execPath, [SCANNER_PATH], { cwd: root, encoding: 'utf8' });

    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });

  it('prints deterministic minimal JSON findings and exits non-zero', () => {
    const root = makeRepository();
    const first = 'first' + String.fromCharCode(64) + 'example.com';
    const second = 'second' + String.fromCharCode(64) + 'example.org';
    writeTracked(root, 'z file.txt', `${first}\n`);
    writeTracked(root, 'a.txt', `${second} ${second}\n`);

    const result = spawnSync(process.execPath, [SCANNER_PATH], { cwd: root, encoding: 'utf8' });

    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    const output = result.stdout.trim().split('\n').map((line) => JSON.parse(line));
    assert.deepEqual(output, [
      { kind: 'email', path: 'a.txt', line: 1, count: 2 },
      { kind: 'email', path: 'z file.txt', line: 1, count: 1 },
    ]);
    assert.doesNotMatch(result.stdout, /first|second|example/);
    assert.ok(output.every((finding) => (
      JSON.stringify(Object.keys(finding).sort()) === JSON.stringify(['count', 'kind', 'line', 'path'])
    )));
  });
});

describe('checked release candidate', () => {
  it('builds before scanning and browser verification in the release command', () => {
    const manifest = JSON.parse(readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'));

    assert.equal(
      manifest.scripts['test:public-scan'],
      'node --test scripts/scan-public-content.test.mjs',
    );
    assert.equal(
      manifest.scripts.check,
      'npm run lint && npm test && npm run build && npm run test:public-scan',
    );
    assert.equal(manifest.scripts['scan:public'], 'node scripts/scan-public-content.mjs');
    assert.equal(
      manifest.scripts['verify:release'],
      'npm run check && npm run scan:public && npm run test:e2e',
    );
  });

  it('keeps Pages deployment immutable, least-privilege, main-only, and release-gated', () => {
    const workflow = readFileSync(join(REPOSITORY_ROOT, '.github/workflows/pages.yml'), 'utf8');
    const dependabot = readFileSync(join(REPOSITORY_ROOT, '.github/dependabot.yml'), 'utf8');
    const build = workflow.match(/\n  build:\n(?<body>[\s\S]*?)\n  deploy:\n/)?.groups?.body ?? '';
    const deploy = workflow.match(/\n  deploy:\n(?<body>[\s\S]*)$/)?.groups?.body ?? '';
    const actionPins = [
      ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1', 'v7.0.1'],
      ['actions/setup-node', '820762786026740c76f36085b0efc47a31fe5020', 'v7.0.0'],
      ['actions/configure-pages', '45bfe0192ca1faeb007ade9deae92b16b8254a0d', 'v6.0.0'],
      ['actions/upload-pages-artifact', 'fc324d3547104276b827a68afc52ff2a11cc49c9', 'v5.0.0'],
      ['actions/deploy-pages', 'cd2ce8fcbc39b97be8ca5fce6e763baed58fa128', 'v5.0.0'],
    ];

    assert.match(workflow, /\npermissions: \{\}\n/);
    assert.match(build, /(?:^|\n)    permissions:\n      contents: read\n/);
    assert.doesNotMatch(build, /pages:|id-token:/);
    assert.match(deploy, /(?:^|\n)    permissions:\n      pages: write\n      id-token: write\n/);
    assert.doesNotMatch(deploy, /contents:/);
    assert.match(deploy, /(?:^|\n)    if: github\.ref == 'refs\/heads\/main'\n/);
    assert.match(build, /persist-credentials: false/);
    assert.ok(
      build.indexOf('npm ci') < build.indexOf('npx playwright install --with-deps chromium'),
    );
    assert.ok(
      build.indexOf('npx playwright install --with-deps chromium') <
        build.indexOf('npm run verify:release'),
    );
    assert.doesNotMatch(build, /npm run check|npm run test:e2e/);
    assert.match(build, /path: dist/);

    for (const [action, sha, tag] of actionPins) {
      assert.match(workflow, new RegExp(`${action}@${sha}\\s+# ${tag.replaceAll('.', '\\.')}`));
    }

    assert.match(dependabot, /package-ecosystem: ['"]?github-actions['"]?/);
    assert.match(dependabot, /interval: ['"]?weekly['"]?/);
  });

  it('has no findings across tracked source, workflow documentation, and current dist', () => {
    assert.deepEqual(scanRepository(REPOSITORY_ROOT), []);
  });
});
