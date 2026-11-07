"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../dist/assets/js/commands.js"), "utf8");
const names = ["home", "life", "resume", "project", "open", "close", "help"];
const descriptions = { home: "首页", life: "生活", resume: "经历", project: "项目", open: "展开", close: "收起", help: "帮助" };

function load() {
  const window = {};
  // The real help renderer only needs element construction, attributes and append.
  const document = {
    createElement(tagName) {
      return {
        tagName, textContent: "", children: [], dataset: {}, attributes: {},
        append(...nodes) { this.children.push(...nodes); },
        setAttribute(name, value) { this.attributes[name] = String(value); }
      };
    }
  };
  vm.runInNewContext(source, { window, document });
  return window.LIZPINK_COMMANDS;
}

const text = node => node.textContent + node.children.map(text).join("");

test("seven public commands derive consistent immutable completion and view catalogs", () => {
  const api = load();
  assert.deepEqual(Array.from(api.items, item => item.name), names);
  assert.deepEqual(Array.from(api.completions), names);
  assert.deepEqual(Array.from(api.routes), ["home", "life", "resume", "project", "help"]);
  assert.equal(Object.isFrozen(api), true);
  assert.equal(Object.isFrozen(api.items), true);
  assert.equal(Object.isFrozen(api.completions), true);
  assert.equal(Object.isFrozen(api.routes), true);
  api.items.forEach(item => {
    assert.equal(Object.isFrozen(item), true);
    assert.equal(item.description, descriptions[item.name]);
  });
});

test("digits and current Chinese shortcuts normalize to canonical commands", () => {
  const api = load();
  ["home", "life", "resume", "project"].forEach((name, number) => {
    assert.equal(api.normalize(String(number)), name);
    assert.equal(api.normalize(` ${name.toUpperCase()} `), name);
  });
  const aliases = {
    首页: "home", 生活: "life", 简历: "resume", 经历: "resume", 项目: "project", 帮助: "help",
    展开: "open", 收起: "close"
  };
  Object.entries(aliases).forEach(([alias, command]) => assert.equal(api.normalize(alias), command));
  assert.equal(api.items.find(item => item.name === api.normalize("展开")).kind, "action");
  assert.equal(api.items.find(item => item.name === api.normalize("收起")).kind, "action");
});

test("removed commands and old route aliases never become executable catalog entries", () => {
  const api = load();
  for (const value of ["clear", "research", "研究", "about", "关于", "info", "cv", "menu", "ls", "4", "5"]) {
    assert.equal(api.completions.includes(api.normalize(value)), false, value);
    assert.equal(api.routes.includes(api.normalize(value)), false, value);
  }
  assert.equal(api.items.some(item => item.name === "clear"), false);
});

test("completion and typo suggestions exclude clear while keeping useful current candidates", () => {
  const api = load();
  assert.deepEqual(Array.from(api.suggest("cl")), ["close"]);
  assert.deepEqual(Array.from(api.suggest("clea")), []);
  assert.deepEqual(Array.from(api.suggest("proejct")), ["project"]);
  assert.deepEqual(Array.from(api.suggest("opne")), ["open"]);
  assert.deepEqual(Array.from(api.suggest("clsoe")), ["close"]);
  for (const value of ["clear", "claer", "clera", "clea", "cl"]) {
    assert.equal(api.suggest(value).includes("clear"), false);
  }
});

test("real help uses short names, two groups and exactly seven complete command rows", () => {
  const api = load();
  const help = api.renderHelp();
  assert.equal(help.children[0].tagName, "h2");
  assert.equal(text(help.children[0]), "帮助");
  const groups = help.children.filter(node => node.className === "help-group");
  assert.deepEqual(groups.map(group => text(group.children[0])), ["浏览路线", "操作"]);
  assert.deepEqual(groups.map(group => group.children[1].children.length), [4, 3]);
  const rows = groups.flatMap(group => group.children[1].children);
  assert.deepEqual(rows.map(row => row.children[0].children[0].dataset.command), names);
  rows.forEach((row, index) => {
    const [term, description] = row.children;
    const button = term.children[0];
    assert.equal(text(button), names[index]);
    assert.equal(text(description), descriptions[names[index]]);
    assert.equal(button.attributes["aria-label"], `${names[index]}：${descriptions[names[index]]}`);
    if (index < 4) assert.equal(text(term.children[1]), `或 ${index}`);
    else assert.equal(term.children.length, 1);
  });
  assert.equal(text(help).includes("clear"), false);
});

test("help retains its keyboard reference and concise Escape instruction", () => {
  const help = load().renderHelp();
  const keys = help.children.find(node => node.className === "help-keys");
  assert.deepEqual(keys.children.map(pair => text(pair.children[0])), ["Enter", "Tab", "↑ ↓", "/", "Esc", "Shift+Tab"]);
  const escape = keys.children.find(pair => text(pair.children[0]) === "Esc");
  assert.equal(text(escape.children[1]), "返回阅读");
});
