import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const templatePath = new URL('../templates/collection.doll-category.json', import.meta.url);
const navigationSnippets = [
  '../snippets/header-drawer.liquid',
  '../snippets/header-dropdown-menu.liquid',
  '../snippets/header-mega-menu.liquid',
];
const urlSnippetPath = new URL('../snippets/doll-category-url.liquid', import.meta.url);

test('doll category template uses the standard filtered product grid', async () => {
  const source = await readFile(templatePath, 'utf8');
  const json = JSON.parse(source.replace(/^\/\*[\s\S]*?\*\//, '').trim());
  const banner = json.sections.banner.settings;
  const grid = json.sections['product-grid'].settings;

  assert.equal(banner.show_collection_image, false);
  assert.equal(grid.filter_type, 'vertical');
  assert.equal(grid.enable_filtering, true);
  assert.equal(grid.enable_sorting, true);
  assert.equal(grid.image_ratio, 'square');
  assert.equal(grid.quick_add, 'standard');
  assert.deepEqual(json.order, ['banner', 'product-grid']);
});

test('doll category URL helper targets only Tops and Bottoms', async () => {
  const source = await readFile(urlSnippetPath, 'utf8');

  assert.match(source, /\/collections\/tops/);
  assert.match(source, /\/collections\/bottoms/);
  assert.match(source, /view=doll-category/);
});

for (const snippetPath of navigationSnippets) {
  test(`${snippetPath} uses the doll category URL helper for nested links`, async () => {
    const source = await readFile(new URL(snippetPath, import.meta.url), 'utf8');
    const helperCalls = source.match(/render 'doll-category-url'/g) ?? [];

    assert.ok(helperCalls.length >= 2);
  });
}
