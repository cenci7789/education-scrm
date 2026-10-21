const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n');
for (const file of fs.readdirSync(root).filter(file => file.endsWith('.js'))) {
  new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
}
const elements = new Map();
const document = {
  querySelectorAll: () => [],
  querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', innerHTML: '', textContent: '', focus() {},
      classList: { add() {}, remove() {}, toggle() {} }
    });
    return elements.get(selector);
  }
};
const context = vm.createContext({ document, setTimeout() {} });
vm.runInContext(inline, context);
const run = code => vm.runInContext(code, context);
const value = code => JSON.parse(JSON.stringify(run(code)));
const page = () => document.querySelector('#view').innerHTML;

run("state.page='teaching';render()");
assert(!page().includes('难度配置'));
assert(!page().includes('修改配置'));
assert(run('Object.values(state.config).every(rows=>rows.every(row=>row[0]===row[2]))'));

for (const type of ['学科', '学期', '年级', '班型']) {
  run(`state.tab='${type}';render()`);
  assert(page().includes(`新增${type}`));
  const before = value('state.config[state.tab]');
  const name = `新增${type}测试`;

  run('teachingNew();teachingSave()');
  assert.equal(document.querySelector('#toast').textContent, `请输入${type}名称`);
  assert.deepEqual(value('state.config[state.tab]'), before);

  run(`teachingNameInput('${name}');teachingSave()`);
  assert.deepEqual(value('state.config[state.tab].at(-1)'), [name, true, name, true]);
  run(`teachingNew();teachingNameInput('  ${name}  ');teachingSave()`);
  assert.equal(document.querySelector('#toast').textContent, `${type}名称已存在`);
  assert.equal(run('state.config[state.tab].length'), before.length + 1);
  run('teachingClose()');

  run('teachingEdit()');
  assert(page().includes('<th>是否展示</th>'));
  assert(!page().includes('id="teaching-name"'));
  for (const row of before) assert(page().includes(row[0]));
  run('teachingDisplayInput(state.teachingRows.length-1,"未保存内容");teachingSetVisible(state.teachingRows.length-1,false);teachingClose()');
  assert.deepEqual(value('state.config[state.tab].at(-1)'), [name, true, name, true]);
  run('teachingToggle(state.config[state.tab].length-1)');
  assert.equal(run('state.config[state.tab].at(-1)[3]'), false);
  assert.equal(run('state.config[state.tab].at(-1)[1]'), true);
  assert(page().includes('已停用'));
  assert(page().includes(name));
  run('teachingEdit();teachingDisplayInput(state.teachingRows.length-1,"自定义展示");teachingSetVisible(state.teachingRows.length-1,false)');
  assert(page().includes('value="自定义展示" disabled'));
  run('teachingDisplayInput(state.teachingRows.length-1,"禁用时修改");teachingSaveDisplay()');
  assert.deepEqual(value('state.config[state.tab].at(-1)'), [name, false, '自定义展示', false]);
  assert(page().includes('不展示'));
  run('teachingToggle(state.config[state.tab].length-1)');
  assert.equal(run('state.config[state.tab].at(-1)[3]'), true);
  assert.equal(run('state.config[state.tab].at(-1)[1]'), false);
  run('teachingEdit();teachingSetVisible(state.teachingRows.length-1,true)');
  assert(page().includes('value="自定义展示"  oninput'));
  run('teachingDisplayInput(state.teachingRows.length-1,"一二三四五六七八九");teachingSaveDisplay()');
  assert.equal(document.querySelector('#toast').textContent, '对外展示内容不能超过8个字');
  run('teachingDisplayInput(state.teachingRows.length-1,"  ");teachingSaveDisplay()');
  assert.equal(run('state.config[state.tab].at(-1)[1]'), true);
  assert.equal(run('state.config[state.tab].at(-1)[2]'), name);

  run('teachingAskDelete(state.config[state.tab].length-1)');
  assert(page().includes('确认删除'));
  assert.equal(run('state.config[state.tab].length'), before.length + 1);
  run('teachingClose()');
  assert.equal(run('state.config[state.tab].length'), before.length + 1);
  run('teachingAskDelete(state.config[state.tab].length-1);teachingDelete()');
  assert.deepEqual(value('state.config[state.tab]'), before);
}

run('teachingNew();teachingNameInput("<b>");teachingSave();teachingEdit()');
assert(page().includes('&lt;b&gt;'));
assert(!page().includes('<b>'));
run('teachingClose()');
run("state.config[state.tab]=[];render()");
assert(page().includes('暂无班型'));
run("state.tab='难度';render()");
assert.equal(run('state.tab'), '学科');
console.log('PASS: script syntax; four tabs; defaults; create; whole-table editing; visibility independent of status; disabled inputs; length validation; cancel/save; delete confirmation; escaping; empty state.');
