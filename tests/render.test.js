const test = require('node:test');
const assert = require('node:assert');

test('render', async (t) => {
  const { richText, escapeHtml } = await import('../docs/js/render.js');

  await t.test('renders code tags', () => {
    assert.strictEqual(richText('run <code>get_customer</code> now'), 'run <code>get_customer</code> now');
  });
  await t.test('keeps literal XML-ish text visible', () => {
    assert.strictEqual(richText('wrap in <examples> and <example>'), 'wrap in &lt;examples&gt; and &lt;example&gt;');
    assert.strictEqual(richText('use --resume <session-name>'), 'use --resume &lt;session-name&gt;');
  });
  await t.test('neutralises script and attributes', () => {
    assert.ok(!richText('<script>alert(1)</script>').includes('<script>'));
    assert.ok(!richText('<code onclick="x">a</code>').includes('<code>'));
  });
  await t.test('em, ed-note, newlines, punctuation tidy', () => {
    assert.strictEqual(richText('is <em>silent</em>'), 'is <em>silent</em>');
    assert.strictEqual(richText('<span class="ed-note">note</span>'), '<span class="ed-note">note</span>');
    assert.strictEqual(richText('a\nb'), 'a<br>b');
    assert.strictEqual(richText('<code>x</code> ?'), '<code>x</code>?');
  });
  await t.test('escapeHtml basics', () => {
    assert.strictEqual(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});
