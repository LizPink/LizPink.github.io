// Shared public command catalog for parsing, completion, and help.
(() => {
  "use strict";

  const items = Object.freeze([
    { name: "home", description: "返回首页", kind: "view", group: "浏览路线", number: "0" },
    { name: "life", description: "生活与记录", kind: "view", group: "浏览路线", number: "1" },
    { name: "resume", description: "经历与能力", kind: "view", group: "浏览路线", number: "2" },
    { name: "research", description: "研究与探索", kind: "view", group: "浏览路线", number: "3" },
    { name: "open", description: "展开最新输出的详情", kind: "action", group: "操作" },
    { name: "close", description: "收起最新输出的详情", kind: "action", group: "操作" },
    { name: "clear", description: "清屏，回到首页", kind: "action", group: "操作" },
    { name: "help", description: "命令与快捷键", kind: "view", group: "操作" }
  ].map(item => Object.freeze(item)));

  const completions = Object.freeze(items.map(item => item.name));
  const routes = Object.freeze(items.filter(item => item.kind === "view").map(item => item.name));

  // Older URLs and familiar aliases remain valid without crowding public help.
  const aliases = Object.freeze({
    ...Object.fromEntries(items.filter(item => item.number !== undefined).map(item => [item.number, item.name])),
    "首页": "home", "关于": "resume", "简历": "resume", "经历": "resume",
    "研究": "research", "生活": "life", "帮助": "help", "about": "resume", "info": "resume",
    "cv": "resume", "menu": "home", "ls": "help"
  });

  function normalize(text) {
    const command = String(text ?? "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(aliases, command) ? aliases[command] : command;
  }

  // Adjacent transpositions count as one typo, like "reserach" or "opne".
  function editDistance(left, right) {
    const rows = Array.from({length: left.length + 1}, (_, index) => [index]);
    rows[0] = Array.from({length: right.length + 1}, (_, index) => index);
    for (let i = 1; i <= left.length; i++) {
      for (let j = 1; j <= right.length; j++) {
        rows[i][j] = Math.min(
          rows[i - 1][j] + 1,
          rows[i][j - 1] + 1,
          rows[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
        );
        if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
          rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
        }
      }
    }
    return rows[left.length][right.length];
  }

  function suggest(text) {
    const command = normalize(text);
    if (!/^[a-z]{2,10}$/.test(command) || completions.includes(command)) return [];
    const prefixes = completions.filter(option => option.startsWith(command));
    if (prefixes.length) return prefixes.slice(0, 2);
    const limit = command.length >= 5 ? 2 : 1;
    const candidates = completions
      .filter(option => Math.abs(option.length - command.length) <= limit)
      .map(option => ({name: option, distance: editDistance(command, option)}))
      .filter(option => option.distance <= limit)
      .sort((left, right) => left.distance - right.distance);
    const best = candidates[0]?.distance;
    return candidates.filter(option => option.distance === best).slice(0, 2).map(option => option.name);
  }

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };

  function renderHelp() {
    const node = element("section", "help-reference");
    node.append(element("h2", "summary-title", "命令帮助"));

    ["浏览路线", "操作"].forEach(group => {
      const section = element("section", "help-group");
      section.append(element("h3", "help-group-title", group));
      const list = element("dl", "help-commands");
      items.filter(item => item.group === group).forEach(item => {
        const row = element("div");
        const term = element("dt");
        const button = element("button", "help-command");
        button.type = "button";
        button.dataset.command = item.name;
        button.setAttribute("aria-label", `${item.name}：${item.description}`);
        button.append(element("code", "", item.name));
        term.append(button);
        if (item.number !== undefined) term.append(element("span", "help-number", `或 ${item.number}`));
        row.append(term, element("dd", "", item.description));
        list.append(row);
      });
      section.append(list);
      node.append(section);
    });

    const keys = element("div", "help-keys");
    [
      ["Enter", "执行"], ["Tab", "补全"], ["↑ ↓", "历史"],
      ["/", "开始输入"], ["Esc", "关闭补全 / 返回阅读，保留草稿"], ["Shift+Tab", "离开"]
    ].forEach(([key, meaning]) => {
      const pair = element("span", "help-key");
      pair.append(element("kbd", "", key), element("span", "", meaning));
      keys.append(pair);
    });
    node.append(keys);
    return node;
  }

  window.LIZPINK_COMMANDS = Object.freeze({ items, completions, routes, normalize, suggest, renderHelp });
})();
