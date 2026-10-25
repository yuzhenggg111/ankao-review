(() => {
  "use strict";

  const DATA = window.APP_DATA;
  const STORAGE_KEY = "wanben-review-v02";
  const PAGE_TITLES = {
    today: "今天",
    types: "题型突破",
    papers: "五年真题库",
    practice: "训练场",
    mistakes: "错题复盘",
    progress: "学习进度",
  };

  let currentPage = "today";
  let currentSubject = "english";
  let paperFilter = "all";
  let diagnosticRuntime = null;
  let quizRuntime = null;
  let toastTimer = null;

  const modalLayer = document.getElementById("modal-layer");
  const modalCard = document.getElementById("modal-card");
  const toastElement = document.getElementById("toast");

  function defaultState() {
    return {
      diagnostic: { completed: false, result: null },
      days: {},
      completedMethods: [],
      typeStats: {},
      practice: {
        answeredFirst: 0,
        correctFirst: 0,
        firstAttemptIds: [],
        completedSets: {},
      },
      mistakes: [],
      openedPapers: [],
    };
  }

  function loadState() {
    const defaults = defaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const saved = JSON.parse(raw);
      return {
        ...defaults,
        ...saved,
        diagnostic: { ...defaults.diagnostic, ...(saved.diagnostic || {}) },
        practice: {
          ...defaults.practice,
          ...(saved.practice || {}),
          firstAttemptIds: Array.isArray(saved.practice?.firstAttemptIds)
            ? saved.practice.firstAttemptIds
            : [],
          completedSets: { ...(saved.practice?.completedSets || {}) },
        },
        typeStats: saved.typeStats || {},
        completedMethods: Array.isArray(saved.completedMethods)
          ? saved.completedMethods
          : [],
        mistakes: Array.isArray(saved.mistakes) ? saved.mistakes : [],
        openedPapers: Array.isArray(saved.openedPapers) ? saved.openedPapers : [],
        days: saved.days && typeof saved.days === "object" ? saved.days : {},
      };
    } catch (error) {
      console.warn("无法读取本地记录。", error);
      return defaults;
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("学习记录保存失败，请检查浏览器存储设置。");
      console.warn(error);
    }
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateKey(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(date, amount) {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function formatChineseDate(date) {
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · ${weekdays[date.getDay()]}`;
  }

  function formatShortDate(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ""
      : `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function ensureDay() {
    const key = dateKey();
    if (!state.days[key]) {
      const day = parseDateKey(key);
      const weekend = day.getDay() === 0 || day.getDay() === 6;
      state.days[key] = { mode: weekend ? 180 : 90, completed: [] };
      saveState();
    }
    return state.days[key];
  }

  function plan() {
    const day = ensureDay();
    let ids = DATA.plans.modes[day.mode] || DATA.plans.modes[90];
    if (!state.diagnostic.completed) {
      ids = ["diagnostic", "methodVocab", "review"];
    }
    return ids.map((id) => DATA.plans.taskTemplates[id]).filter(Boolean);
  }

  function taskDone(id) {
    return Boolean(ensureDay().completed.includes(id));
  }

  function completeTask(id) {
    const day = ensureDay();
    if (id === "diagnostic" || plan().some((task) => task.id === id)) {
      if (!day.completed.includes(id)) {
        day.completed.push(id);
        saveState();
        updateChrome();
      }
    }
  }

  function toggleTask(id) {
    const day = ensureDay();
    if (day.completed.includes(id)) {
      day.completed = day.completed.filter((item) => item !== id);
    } else {
      day.completed.push(id);
    }
    saveState();
    renderPage("today");
    updateChrome();
  }

  function completedDays() {
    return Object.values(state.days).filter((day) => day.completed?.length).length;
  }

  function streak() {
    let cursor = new Date();
    if (!state.days[dateKey(cursor)]?.completed?.length) {
      cursor = addDays(cursor, -1);
    }
    let count = 0;
    while (state.days[dateKey(cursor)]?.completed?.length && count < 3650) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  function firstAccuracy() {
    return state.practice.answeredFirst
      ? Math.round(
          (state.practice.correctFirst / state.practice.answeredFirst) * 100
        )
      : 0;
  }

  function typeStats(typeId) {
    return state.typeStats[typeId] || {
      attempts: 0,
      correct: 0,
      lastDate: "",
    };
  }

  function getType(id) {
    return DATA.typeModules.find((item) => item.id === id);
  }

  function getPaper(id) {
    return DATA.papers.find((item) => item.id === id);
  }

  function getSet(id) {
    return DATA.practiceSets[id];
  }

  function subjectTag(subject) {
    const map = {
      english: ["english", "英语"],
      chinese: ["chinese", "语文"],
      both: ["both", "综合"],
    };
    const [className, label] = map[subject] || map.both;
    return `<span class="subject-tag ${className}">${label}</span>`;
  }

  function reliabilityBadge(key) {
    const item = DATA.reliability[key] || DATA.reliability.pending;
    return `<span class="source-badge ${item.className}">${escapeHTML(item.label)}</span>`;
  }

  function updateChrome() {
    const now = new Date();
    document.getElementById("current-date-label").textContent = formatChineseDate(now);
    document.getElementById("page-title").textContent = PAGE_TITLES[currentPage];
    const examDate = new Date(2027, 3, 17);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.max(
      0,
      Math.ceil((examDate.getTime() - today.getTime()) / 86400000)
    );
    document.getElementById("exam-countdown").textContent = `预计考试 ${days} 天`;
    document.getElementById("side-stage-progress").style.width = `${
      state.completedMethods.length
        ? Math.min(100, 10 + state.completedMethods.length * 9)
        : 6
    }%`;
    document.querySelectorAll("[data-mistake-count]").forEach((element) => {
      element.textContent = String(state.mistakes.length);
      element.hidden = state.mistakes.length === 0;
    });
    document.querySelectorAll("[data-page]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.page === currentPage);
    });
  }

  function setPage(page, options = {}) {
    if (!PAGE_TITLES[page]) return;
    currentPage = page;
    document.querySelectorAll(".page-view").forEach((view) => {
      view.hidden = view.dataset.view !== page;
    });
    renderPage(page);
    updateChrome();
    if (options.scroll !== false) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function renderPage(page = currentPage) {
    const view = document.querySelector(`[data-view="${page}"]`);
    if (!view) return;
    if (page === "today") view.innerHTML = renderToday();
    if (page === "types") view.innerHTML = renderTypes();
    if (page === "papers") view.innerHTML = renderPapers();
    if (page === "practice") view.innerHTML = renderPractice();
    if (page === "mistakes") view.innerHTML = renderMistakes();
    if (page === "progress") view.innerHTML = renderProgress();
  }

  function renderToday() {
    const currentPlan = plan();
    const done = currentPlan.filter((task) => taskDone(task.id)).length;
    const next = currentPlan.find((task) => !taskDone(task.id)) || currentPlan[0];
    const totalMinutes = currentPlan.reduce((sum, task) => sum + task.duration, 0);
    const dailyPercent = currentPlan.length
      ? Math.round((done / currentPlan.length) * 100)
      : 0;
    const diagnosticDone = state.diagnostic.completed;
    const heroTitle = diagnosticDone
      ? "今天先把“凭感觉”改成“按题型步骤判断”"
      : "先测出起点，再进入真题";
    const heroText = diagnosticDone
      ? "从词汇与结构开始，把一道真题拆成“空格功能、语法形式、语义搭配、整句复核”四步。每一步都要留下可检查的依据。"
      : "10道小题只用于判断先补基础还是直接进入近年真题，不作为分数预测。";
    const firstAction = diagnosticDone
      ? `data-action="start-task" data-task-id="${next?.id || ""}"`
      : `data-action="start-diagnostic"`;
    const firstLabel = diagnosticDone
      ? done === currentPlan.length
        ? "查看今天完成情况"
        : "开始今日路线"
      : "开始起点诊断";
    const modeButtons = [45, 90, 180]
      .map(
        (minutes) => `
          <button type="button" class="${ensureDay().mode === minutes ? "is-active" : ""}" data-action="set-mode" data-minutes="${minutes}">
            ${minutes === 180 ? "周末深度" : `${minutes}分钟`}
          </button>`
      )
      .join("");

    const tasks = currentPlan
      .map((task, index) => {
        const isDone = taskDone(task.id);
        return `
          <article class="task-row ${isDone ? "is-done" : ""}">
            <div class="task-index">${isDone ? "✓" : index + 1}</div>
            <div class="task-copy">
              <h4>${escapeHTML(task.title)}</h4>
              <p>${escapeHTML(task.detail)}</p>
              <div class="task-meta">
                ${subjectTag(task.subject)}
                <span class="task-duration">${task.duration}分钟</span>
              </div>
            </div>
            <div class="task-controls">
              <button class="secondary-button button-small" type="button" data-action="start-task" data-task-id="${task.id}">
                ${isDone ? "再看一遍" : "开始"}
              </button>
              <button class="circle-check" type="button" data-action="toggle-task" data-task-id="${task.id}" aria-label="${isDone ? "取消完成" : "标记完成"}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5"/></svg>
              </button>
            </div>
          </article>`;
      })
      .join("");

    const coverage = [2022, 2023, 2024, 2025, 2026]
      .map(
        (year) => `
          <div class="coverage-year is-ready">
            <strong>${year}</strong>
            <span>语文✓ 英语✓</span>
          </div>`
      )
      .join("");

    return `
      <div class="exam-target-row">
        <article class="exam-target"><span>冲刺目标</span><strong>240 / 300</strong><small>稳固目标先看 220 分</small></article>
        <article class="exam-target"><span>五年真题</span><strong>10 / 10</strong><small>2022—2026 两科科目年度</small></article>
        <article class="exam-target"><span>当前阶段</span><strong>题型起步</strong><small>先方法，后刷量</small></article>
      </div>

      <div class="dashboard-grid">
        <section class="hero-card exam-hero">
          <div class="hero-content">
            <div class="eyebrow">真题驱动 · 当前最高回报</div>
            <h2>${heroTitle}</h2>
            <p>${heroText}</p>
            <div class="hero-actions">
              <button class="primary-button" type="button" ${firstAction}>${firstLabel}</button>
              <button class="secondary-button" type="button" data-action="nav" data-page="papers">查看五年真题库</button>
            </div>
          </div>
          <div class="hero-gridline" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
          <div class="target-band">
            <div class="target-item"><span>今日学习</span><strong>${totalMinutes}分钟</strong><small>已完成 ${done} / ${currentPlan.length} 个任务</small></div>
            <div class="target-item"><span>当前主攻</span><strong>词汇与结构</strong><small>先掌握四步判断法</small></div>
            <div class="target-item"><span>完成标准</span><strong>能说出依据</strong><small>猜对不计作掌握</small></div>
          </div>
        </section>

        <aside class="side-column">
          <section class="card priority-card">
            <span class="mini-kicker">今日关键动作</span>
            <h3>把选择题拆开做</h3>
            <p>现阶段不是追求一次做对，而是让每个答案都有理由。</p>
            <div class="priority-path">
              <div class="priority-step"><b>1</b><span>判断空格要填什么成分</span></div>
              <div class="priority-step"><b>2</b><span>检查时态、语态和搭配</span></div>
              <div class="priority-step"><b>3</b><span>把答案放回整句复核</span></div>
            </div>
            <button class="soft-button button-small" type="button" data-action="open-type" data-type-id="en-vocab">打开题型方法卡</button>
          </section>
          <section class="card card-padded">
            <div class="card-heading"><div><span class="mini-kicker">今日完成度</span><h3>${done} / ${currentPlan.length} 个任务</h3></div></div>
            <div class="progress-ring-card">
              <div class="progress-ring" style="--progress:${dailyPercent * 3.6}deg">
                <div class="progress-ring-content"><strong>${dailyPercent}%</strong><span>今日</span></div>
              </div>
              <div class="ring-copy"><strong>先完成任务，再看效果</strong><p>第一次作答正确率会在训练后记录，重复做对不会虚增掌握度。</p></div>
            </div>
          </section>
        </aside>
      </div>

      <section class="section-block">
        <div class="section-heading">
          <div><h2>今天按顺序完成</h2><p>当前路线先把方法与真题连起来，再安排基础补缺。</p></div>
          <button class="text-link" type="button" data-action="nav" data-page="types">浏览全部题型</button>
        </div>
        <div class="task-list">${tasks}</div>
        <div class="mode-bar">
          <span>今天可用时间</span>
          <div class="mode-switch">${modeButtons}</div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading">
          <div><h2>2022—2026 试卷主体覆盖</h2><p>购买资料补齐了2023和2026年；答案仍按科目分别标状态。</p></div>
          <button class="text-link" type="button" data-action="nav" data-page="papers">打开真题库</button>
        </div>
        <div class="card card-padded"><div class="coverage-strip">${coverage}</div></div>
      </section>

      <section class="strategy-banner">
        <div class="notice-icon">i</div>
        <div><strong>为什么现在还保留基础训练</strong>她的英语接近零基础，如果只背题型步骤，会在词汇和句子层面卡住。每个题型方法都会配最小基础补丁，但不再单独花几周从头学字母。</div>
      </section>
    `;
  }

  function renderTypes() {
    const modules = DATA.typeModules.filter((item) => item.subject === currentSubject);
    const totalScore = modules.reduce((sum, item) => sum + item.score, 0);
    const completed = modules.filter((item) =>
      state.completedMethods.includes(item.id)
    ).length;
    const tabs = [
      ["english", "英语 · 5题型"],
      ["chinese", "大学语文 · 6板块"],
    ]
      .map(
        ([key, label]) => `
          <button type="button" class="${currentSubject === key ? "is-active" : ""}" data-action="subject-tab" data-subject="${key}">${label}</button>`
      )
      .join("");
    const cards = modules
      .map(
        (module) => `
          <button class="type-card" type="button" data-action="open-type" data-type-id="${module.id}">
            <span class="type-card-main">
              <span class="type-card-top">
                <span class="type-priority">${module.priority}</span>
                ${reliabilityBadge("purchased")}
              </span>
              <h3>${escapeHTML(module.title)}</h3>
              <p>${escapeHTML(module.summary)}</p>
              <span class="type-card-bottom">
                ${module.tags.slice(0, 4).map((tag) => `<span class="micro-tag">${escapeHTML(tag)}</span>`).join("")}
              </span>
            </span>
            <span class="type-score-ball">${module.score}<small>分</small></span>
          </button>`
      )
      .join("");

    return `
      <section class="types-hero">
        <div>
          <span class="mini-kicker" style="color:#bcd7c8">考试题型架构</span>
          <h2>${currentSubject === "english" ? "英语五类题型" : "大学语文六个板块"}</h2>
          <p>${currentSubject === "english" ? "词汇与结构决定基础判断，完形和阅读考语篇，翻译与写作考输出。" : "客观基础、默写、三类阅读和作文都是固定板块，作文独占60分。"}</p>
        </div>
        <div class="types-score"><strong>${totalScore}<small style="font-size:12px"> / 150</small></strong><span>${completed} / ${modules.length} 个方法卡已学</span></div>
      </section>
      <div class="subject-tabs">${tabs}</div>
      <div class="type-grid">${cards}</div>
      <div class="notice-box">
        <div class="notice-icon">!</div>
        <div><strong>题型分值是确定的，优先级不是绝对的</strong>P0表示现阶段更值得投入，不表示其他板块可以放弃，也不表示明年一定按同一难度出题。</div>
      </div>
    `;
  }

  function renderPapers() {
    const papers = DATA.papers
      .filter((paper) => paperFilter === "all" || paper.subject === paperFilter)
      .sort((a, b) => b.year - a.year || a.subject.localeCompare(b.subject));
    const rows = papers
      .map(
        (paper) => `
          <article class="paper-row">
            <div class="paper-year">${paper.year}</div>
            <div class="paper-main">
              <h3>${escapeHTML(paper.title)}</h3>
              <p>${escapeHTML(paper.note)}</p>
            </div>
            <div class="paper-statuses">
              <div class="status-line"><span>试题</span><b>${escapeHTML(paper.questionStatus)}</b></div>
              <div class="status-line"><span>答案</span><b>${escapeHTML(paper.answerStatus)}</b></div>
              <div class="status-line">${reliabilityBadge(paper.reliability)}<span>${paper.pages}页</span></div>
            </div>
            <div class="paper-action">
              <button class="soft-button button-small" type="button" data-action="open-paper" data-paper-id="${paper.id}">查看</button>
            </div>
          </article>`
      )
      .join("");
    const buttons = [
      ["all", "全部"],
      ["english", "英语"],
      ["chinese", "大学语文"],
    ]
      .map(
        ([key, label]) => `
          <button type="button" class="${paperFilter === key ? "is-active" : ""}" data-action="paper-filter" data-filter="${key}">${label}</button>`
      )
      .join("");

    return `
      <div class="coverage-summary">
        <article class="card metric-card"><span>当前主统计</span><strong>${DATA.meta.mainYearRange}</strong><small>与2027考试结构最接近的五年</small></article>
        <article class="card metric-card"><span>科目年度</span><strong>10 / 10</strong><small>两份购买合集已拆分核对</small></article>
        <article class="card metric-card"><span>答案状态</span><strong>重点复核</strong><small>英语答案与部分语文答案仍待建立</small></article>
      </div>
      <div class="paper-toolbar">
        <div><h2 style="margin:0;font-family:var(--serif);font-size:20px">近五年真题总目录</h2><p style="margin:4px 0 0;color:var(--ink-faint);font-size:10px">2020—2021另作历史补充，不进入当前五年主统计。</p></div>
        <div class="paper-filter">${buttons}</div>
      </div>
      <div class="paper-list">${rows}</div>
      <div class="notice-box">
        <div class="notice-icon">!</div>
        <div><strong>为什么试题完整仍不能马上用于判分</strong>购买文件没有提供全部英语答案；部分语文答案表也有错位。网站只在答案通过逐题复核后，才把该题计入正式得分。</div>
      </div>
    `;
  }

  function renderPractice() {
    const sets = Object.values(DATA.practiceSets);
    const cards = sets
      .map((set) => {
        const result = state.practice.completedSets[set.id];
        return `
          <article class="card practice-card">
            <div class="practice-card-top">
              ${subjectTag(set.subject)}
              ${reliabilityBadge(set.reliability)}
            </div>
            <h3>${escapeHTML(set.title)}</h3>
            <p>${escapeHTML(set.description)}</p>
            <div class="practice-card-footer">
              <span>${set.questions.length}题 · 约${set.estimate}分钟${result ? ` · 上次${result.correct}/${result.total}` : ""}</span>
              <button class="soft-button button-small" type="button" data-action="start-quiz" data-set-id="${set.id}">开始</button>
            </div>
          </article>`;
      })
      .join("");

    return `
      <section class="practice-feature">
        <div><span class="mini-kicker" style="color:#bcd7c8">先方法，再做真题</span><h2>今天把选择题从“猜”变成“判断”</h2><p>训练会记录首次作答，答错自动进入错题复盘；做完后给出这个题型下一步该检查什么。</p></div>
        <button class="primary-button" type="button" data-action="open-type" data-type-id="en-vocab">先看词汇结构方法</button>
      </section>
      <div class="section-heading">
        <div><h2>已录入的真题专项</h2><p>只开放题目和答案已达到当前使用标准的题组。</p></div>
        <button class="text-link" type="button" data-action="nav" data-page="mistakes">错题本 ${state.mistakes.length}</button>
      </div>
      <div class="practice-grid">${cards}</div>
      <div class="notice-box">
        <div class="notice-icon">i</div>
        <div><strong>练习不等于完整模考</strong>专项训练用于拆方法；完整套卷要等英语答案核验完成后才能计入240分目标测量。</div>
      </div>
    `;
  }

  function renderMistakes() {
    if (!state.mistakes.length) {
      return `
        <div class="empty-state">
          <div>
            <div class="empty-mark">净</div>
            <h3>错题本还是空的</h3>
            <p>开始一组真题专项后，答错的题会自动记录。复盘时会同时保留来源、正确依据和错误陷阱。</p>
            <button class="primary-button" type="button" data-action="nav" data-page="practice">去做真题专项</button>
          </div>
        </div>`;
    }

    const cards = state.mistakes
      .slice()
      .reverse()
      .map((mistake) => {
        const selected = mistake.options[mistake.selectedIndex] ?? "未记录";
        const correct = mistake.options[mistake.answerIndex] ?? "未记录";
        return `
          <article class="card mistake-card">
            <div class="mistake-header">
              <div class="mistake-meta">
                ${subjectTag(mistake.subject)}
                <span class="source-badge original">${escapeHTML(mistake.skill)}</span>
                <span class="mistake-date">${formatShortDate(mistake.createdAt)}</span>
              </div>
            </div>
            <h3>${escapeHTML(mistake.stem)}</h3>
            ${mistake.passage ? `<div class="passage-box">${escapeHTML(mistake.passage)}</div>` : ""}
            <div class="answer-review">
              <div class="answer-box wrong"><span>当时选择</span><strong>${escapeHTML(selected)}</strong></div>
              <div class="answer-box right"><span>正确答案</span><strong>${escapeHTML(correct)}</strong></div>
            </div>
            <p class="mistake-explanation">${escapeHTML(mistake.explanation)}</p>
            <p class="mistake-explanation"><strong>易错点：</strong>${escapeHTML(mistake.trap || "")}</p>
            <div class="mistake-actions">
              <button class="soft-button button-small" type="button" data-action="retry-mistake" data-mistake-id="${mistake.id}">重新作答</button>
              <button class="secondary-button button-small" type="button" data-action="remove-mistake" data-mistake-id="${mistake.id}">已掌握，移出</button>
            </div>
          </article>`;
      })
      .join("");

    return `
      <div class="section-heading">
        <div><h2>错题要重新证明会</h2><p>${state.mistakes.length}道题仍在等待再次作答。</p></div>
        <button class="text-link" type="button" data-action="nav" data-page="practice">继续训练</button>
      </div>
      <div class="mistake-list">${cards}</div>
    `;
  }

  function renderProgress() {
    const englishTypes = DATA.typeModules.filter((item) => item.subject === "english");
    const chineseTypes = DATA.typeModules.filter((item) => item.subject === "chinese");
    const typeRows = [...englishTypes, ...chineseTypes]
      .map((module) => {
        const stats = typeStats(module.id);
        const accuracy = stats.attempts
          ? Math.round((stats.correct / stats.attempts) * 100)
          : 0;
        return `
          <div class="mastery-row">
            <span><b>${escapeHTML(module.title)}</b><em>${stats.attempts ? `${stats.correct}/${stats.attempts} · ${accuracy}%` : "尚未训练"}</em></span>
            <div class="linear-progress"><i style="width:${stats.attempts ? accuracy : 0}%"></i></div>
          </div>`;
      })
      .join("");

    return `
      <div class="metric-grid">
        <article class="card metric-card"><span>有效学习日</span><strong>${completedDays()}</strong><small>至少完成一个任务</small></article>
        <article class="card metric-card"><span>连续记录</span><strong>${streak()}</strong><small>中断一天可继续</small></article>
        <article class="card metric-card"><span>首次正确率</span><strong>${firstAccuracy()}%</strong><small>重复作答不抬高</small></article>
        <article class="card metric-card"><span>待复盘错题</span><strong>${state.mistakes.length}</strong><small>需要再次证明掌握</small></article>
      </div>
      <div class="progress-layout">
        <section class="goal-card">
          <span class="mini-kicker" style="color:#bcd7c8">240 分路线</span>
          <h3>先稳住220，再冲240</h3>
          <p>题库覆盖已经建立，但完整模考分数要等答案逐题核验后才能计算。现阶段不报“预测分数”。</p>
          <div class="goal-score-row">
            <div class="goal-score"><span>临时分科目标</span><strong>128 + 112</strong><small>语文 + 英语，随模考调整</small></div>
            <div class="goal-score"><span>五年覆盖</span><strong>10 / 10</strong><small>2022—2026 两科年度</small></div>
            <div class="goal-score"><span>第一阶段</span><strong>方法闭环</strong><small>会判断、会说依据、会复盘</small></div>
          </div>
          <p class="goal-footnote">英语目标暂不机械设为120：零基础起步阶段，应让语文承担部分稳定分，英语先降低基础失分。</p>
        </section>
        <aside class="card mastery-card">
          <h3>各题型训练证据</h3>
          <div class="mastery-list">${typeRows}</div>
          <div class="settings-row">
            <p>学习记录仅保存在本设备浏览器。</p>
            <button class="danger-button button-small" type="button" data-action="reset-data">清空记录</button>
          </div>
        </aside>
      </div>
    `;
  }

  function modalHeader(kicker, title, subtitle = "", extra = "") {
    return `
      <header class="modal-header">
        <div>
          <span class="mini-kicker">${escapeHTML(kicker)}</span>
          <h2 id="modal-title">${escapeHTML(title)}</h2>
          ${subtitle ? `<p>${escapeHTML(subtitle)}</p>` : ""}
          ${extra ? `<div style="margin-top:8px">${extra}</div>` : ""}
        </div>
        <button class="close-button" type="button" data-action="close-modal" aria-label="关闭">×</button>
      </header>`;
  }

  function openModal(content, type = "") {
    modalCard.innerHTML = content;
    modalLayer.hidden = false;
    if (type) modalLayer.dataset.modalType = type;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => {
      modalCard.querySelector(".close-button")?.focus();
    });
  }

  function closeModal() {
    modalLayer.hidden = true;
    modalCard.innerHTML = "";
    modalLayer.removeAttribute("data-modal-type");
    document.body.style.overflow = "";
    diagnosticRuntime = null;
    quizRuntime = null;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.hidden = false;
    toastTimer = window.setTimeout(() => {
      toastElement.hidden = true;
    }, 2500);
  }

  function openType(typeId) {
    const module = getType(typeId);
    if (!module) return;
    const sets = module.setIds.map(getSet).filter(Boolean);
    const isDone = state.completedMethods.includes(module.id);
    const setButtons = sets.length
      ? sets
          .map(
            (set) =>
              `<button class="secondary-button" type="button" data-action="start-quiz" data-set-id="${set.id}">${escapeHTML(set.title)}</button>`
          )
          .join("")
      : `<span class="source-code">对应专项题组正在逐题录入</span>`;

    openModal(
      `
        ${modalHeader(
          module.kicker,
          module.title,
          module.summary,
          `${reliabilityBadge("purchased")} <span class="source-badge outline">${escapeHTML(module.coverage)}</span>`
        )}
        <div class="modal-body">
          <div class="method-head"><span>一句话方法</span><strong>${escapeHTML(module.method.takeaway)}</strong></div>
          <div class="method-grid">
            <section class="method-panel"><h4>看到什么信号</h4><ul>${module.method.signals.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></section>
            <section class="method-panel"><h4>常见陷阱</h4><ul>${module.method.traps.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul></section>
          </div>
          <section class="method-panel">
            <h4>执行步骤</h4>
            <ol>${module.method.steps.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ol>
          </section>
          <div class="debrief-box">
            <h3>做完之后不要只记答案</h3>
            <p>每次复盘都要回答：这题靠什么信号识别？第一步做了什么？哪个选项最容易误导？下次遇到同类题先检查什么？</p>
          </div>
          <div class="source-action">${setButtons}</div>
        </div>
        <footer class="modal-footer">
          <span style="color:var(--ink-faint);font-size:9px">方法卡不是押题结论，而是对当前五年题型结构的可验证拆解。</span>
          <button class="primary-button" type="button" data-action="complete-method" data-type-id="${module.id}" ${isDone ? "disabled" : ""}>${isDone ? "方法卡已学" : "我记住了，开始验证"}</button>
        </footer>
      `,
      "type"
    );
  }

  function openPaper(paperId) {
    const paper = getPaper(paperId);
    if (!paper) return;
    if (!state.openedPapers.includes(paper.id)) {
      state.openedPapers.push(paper.id);
      saveState();
    }
    const relatedSets = Object.values(DATA.practiceSets).filter(
      (set) =>
        set.subject === paper.subject && set.source.startsWith(String(paper.year))
    );
    const typeNames =
      paper.subject === "english"
        ? ["词汇与结构", "完形填空", "阅读理解", "句子翻译", "短文写作"]
        : ["语言基础与文学常识", "名句默写", "古诗鉴赏", "文言文阅读", "现代文阅读", "文学写作"];
    const setActions = relatedSets.length
      ? relatedSets
          .map(
            (set) =>
              `<button class="secondary-button" type="button" data-action="start-quiz" data-set-id="${set.id}">${escapeHTML(set.title)}</button>`
          )
          .join("")
      : `<span class="source-code">完整题目已收录，逐题训练正在录入</span>`;
    openModal(
      `
        ${modalHeader(
          `真题档案 · ${paper.year}`,
          paper.title,
          paper.note,
          `${subjectTag(paper.subject)} ${reliabilityBadge(paper.reliability)}`
        )}
        <div class="modal-body">
          <div class="paper-detail-grid">
            <div class="paper-detail-box"><span>来源文件</span><strong>${escapeHTML(paper.file)}</strong><small>本题库内部引用，不直接公开传播原始文件。</small></div>
            <div class="paper-detail-box"><span>页数</span><strong>${paper.pages}页${paper.answerPages ? ` + 答案${paper.answerPages}页` : ""}</strong><small>按科目年度拆分使用</small></div>
            <div class="paper-detail-box"><span>试题状态</span><strong>${escapeHTML(paper.questionStatus)}</strong><small>题目主体已找到</small></div>
            <div class="paper-detail-box"><span>答案状态</span><strong>${escapeHTML(paper.answerStatus)}</strong><small>未通过校验前不用于正式估分</small></div>
          </div>
          <section class="method-panel">
            <h4>这份卷子对应哪些题型</h4>
            <p style="margin:0;color:var(--ink-soft);font-size:10px;line-height:1.8">${typeNames.map(escapeHTML).join(" · ")}</p>
          </section>
          <div class="source-action">${setActions}</div>
          <div class="notice-box">
            <div class="notice-icon">!</div>
            <div><strong>资料等级</strong>${escapeHTML(DATA.reliability[paper.reliability]?.description || "")}</div>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="secondary-button" type="button" data-action="close-modal">返回真题库</button>
          <button class="primary-button" type="button" data-action="nav-from-modal" data-page="types">查看对应题型方法</button>
        </footer>
      `,
      "paper"
    );
  }

  function openTrust() {
    const paperRows = DATA.papers
      .map(
        (paper) => `
          <div class="source-row">
            <strong>${paper.year} · ${paper.subject === "english" ? "英语" : "语文"}</strong>
            <p>${escapeHTML(paper.note)}</p>
            <span class="status-badge ${DATA.reliability[paper.reliability].className}">${DATA.reliability[paper.reliability].label}</span>
          </div>`
      )
      .join("");
    openModal(
      `
        ${modalHeader(
          "版本 0.2 · 真题驱动版",
          "资料来源与使用边界",
          "五年试卷主体已覆盖，答案仍按可靠度分级。"
        )}
        <div class="modal-body">
          <div class="trust-intro">当前主样本为2022—2026年。2020—2021年的购买试卷作为历史补充，不纳入当前五年主统计。购买资料与公开来源的比对结果已写入本地研究报告。</div>
          <h3 style="margin:18px 0 9px;font-family:var(--serif);font-size:16px">十个科目年度</h3>
          <div class="source-table">${paperRows}</div>
          <h3 style="margin:22px 0 9px;font-family:var(--serif);font-size:16px">内容标签</h3>
          <div class="legend-list">
            ${Object.values(DATA.reliability).map((item) => `<div class="legend-row">${reliabilityBadge(Object.keys(DATA.reliability).find((key) => DATA.reliability[key] === item))}<p>${escapeHTML(item.description)}</p></div>`).join("")}
          </div>
          <div class="notice-box">
            <div class="notice-icon">!</div>
            <div><strong>不把整理版冒充官方原卷</strong>水印整理的完整试卷可以用于学习和交叉分析；没有官方原卷和完整答案时，不宣称“百分之百还原”。</div>
          </div>
        </div>
        <footer class="modal-footer">
          <span style="color:var(--ink-faint);font-size:9px">${escapeHTML(DATA.meta.estimateNote)}</span>
          <button class="primary-button" type="button" data-action="close-modal">我知道了</button>
        </footer>
      `,
      "trust"
    );
  }

  function startTask(taskId) {
    const task = DATA.plans.taskTemplates[taskId];
    if (!task) return;
    if (task.action.type === "diagnostic") return openDiagnostic();
    if (task.action.type === "type") return openType(task.action.id);
    if (task.action.type === "quiz") return openQuiz(task.action.id);
    if (task.action.type === "mistakes") {
      closeModal();
      setPage("mistakes");
    }
  }

  function openDiagnostic() {
    diagnosticRuntime = { index: 0, answers: {} };
    renderDiagnostic();
  }

  function renderDiagnostic() {
    const questions = DATA.diagnostic.questions;
    const question = questions[diagnosticRuntime.index];
    const selected = diagnosticRuntime.answers[question.id];
    const progress = ((diagnosticRuntime.index + 1) / questions.length) * 100;
    const options = question.options
      .map(
        (option, index) => `
          <button class="option-button ${selected === index ? "is-selected" : ""}" type="button" data-action="diag-select" data-choice="${index}">
            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
            <span class="option-text">${escapeHTML(option)}</span>
            <span class="option-result">${selected === index ? "已选" : ""}</span>
          </button>`
      )
      .join("");
    const isLast = diagnosticRuntime.index === questions.length - 1;
    openModal(
      `
        ${modalHeader(
          `起点诊断 · ${diagnosticRuntime.index + 1}/${questions.length}`,
          DATA.diagnostic.title,
          DATA.diagnostic.subtitle,
          `${reliabilityBadge("original")} ${subjectTag(question.subject)}`
        )}
        <div class="modal-body">
          <div class="quiz-progress"><div class="quiz-progress-bar"><span style="width:${progress}%"></span></div><em>${diagnosticRuntime.index + 1}/${questions.length}</em></div>
          <span class="source-badge outline">${escapeHTML(question.skill)}</span>
          <h3 class="question-stem">${escapeHTML(question.stem)}</h3>
          <div class="option-list">${options}</div>
        </div>
        <footer class="modal-footer">
          <button class="secondary-button" type="button" data-action="diag-prev" ${diagnosticRuntime.index === 0 ? "disabled" : ""}>上一题</button>
          <button class="primary-button" type="button" data-action="${isLast ? "diag-finish" : "diag-next"}" ${selected === undefined ? "disabled" : ""}>${isLast ? "查看起点建议" : "下一题"}</button>
        </footer>
      `,
      "diagnostic"
    );
  }

  function finishDiagnostic() {
    const questions = DATA.diagnostic.questions;
    if (questions.some((question) => diagnosticRuntime.answers[question.id] === undefined)) {
      showToast("还有题目没有选择。");
      return;
    }
    const english = questions.filter((item) => item.subject === "english");
    const chinese = questions.filter((item) => item.subject === "chinese");
    const englishCorrect = english.filter(
      (question) => diagnosticRuntime.answers[question.id] === question.answer
    ).length;
    const chineseCorrect = chinese.filter(
      (question) => diagnosticRuntime.answers[question.id] === question.answer
    ).length;
    const recommendations = [];
    recommendations.push(
      englishCorrect <= 2
        ? "英语从最小词句基础开始，但每次基础课都要接一道真题或真题变式。"
        : englishCorrect <= 4
          ? "英语已能认部分词句，可以进入主谓、时态和词汇结构的真题拆解。"
          : "英语可加快进入真题方法训练，同时补齐不认识的高频词。"
    );
    recommendations.push(
      chineseCorrect <= 2
        ? "语文先抓字形、默写、文学常识和文言实词，先把确定性分数拿稳。"
        : "语文基础可进入题型训练，主观题要开始练习证据和得分点。"
    );
    recommendations.push("每天保留20到30分钟错题复现；真题答案未核验前不做分数预测。");
    state.diagnostic = {
      completed: true,
      result: {
        date: new Date().toISOString(),
        englishCorrect,
        englishTotal: english.length,
        chineseCorrect,
        chineseTotal: chinese.length,
        recommendations,
      },
    };
    completeTask("diagnostic");
    saveState();
    renderDiagnosticResult();
    renderPage(currentPage);
    updateChrome();
  }

  function diagnosticResultContent() {
    const result = state.diagnostic.result;
    return `
      ${modalHeader("起点建议", "现在知道先补哪里了", "这不是预测分数，也不是能力标签。")}
      <div class="modal-body">
        <div class="diagnostic-complete">
          <div class="result-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 12.5 4.8 4.8L19.8 6.8"/></svg></div>
          <h2>建议从“基础补丁 + 题型方法”并行开始</h2>
          <p>英语基础薄弱时仍要先理解句子，但不再把基础学习和考试题型割裂。</p>
          <div class="result-grid">
            <div class="result-card"><span>英语基础识别</span><strong>${result.englishCorrect} / ${result.englishTotal}</strong><p>字母、词义、句子主干、短阅读</p></div>
            <div class="result-card"><span>语文基础识别</span><strong>${result.chineseCorrect} / ${result.chineseTotal}</strong><p>语法、文言、文学常识、默写</p></div>
          </div>
          <ol class="recommendation-list">${result.recommendations.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ol>
        </div>
      </div>
      <footer class="modal-footer">
        <button class="secondary-button" type="button" data-action="nav-from-modal" data-page="types">查看题型方法</button>
        <button class="primary-button" type="button" data-action="open-first-method">开始英语词汇结构</button>
      </footer>`;
  }

  function renderDiagnosticResult() {
    openModal(diagnosticResultContent(), "diagnostic-result");
    diagnosticRuntime = null;
  }

  function openQuiz(setId) {
    const set = getSet(setId);
    if (!set) {
      showToast("这个专项还没有接入。");
      return;
    }
    quizRuntime = {
      set,
      index: 0,
      answers: {},
      finished: false,
    };
    renderQuiz();
  }

  function renderQuiz() {
    if (!quizRuntime) return;
    if (quizRuntime.finished) {
      renderQuizResult();
      return;
    }
    const { set } = quizRuntime;
    const question = set.questions[quizRuntime.index];
    const answer = quizRuntime.answers[question.id];
    const isLast = quizRuntime.index === set.questions.length - 1;
    const progress = ((quizRuntime.index + 1) / set.questions.length) * 100;
    const options = question.options
      .map((option, index) => {
        const selected = answer?.choice === index;
        const correct = Boolean(answer) && question.answer === index;
        const wrong = Boolean(answer) && selected && question.answer !== index;
        return `
          <button class="option-button ${selected ? "is-selected" : ""} ${correct ? "is-correct" : ""} ${wrong ? "is-wrong" : ""}" type="button" data-action="quiz-answer" data-choice="${index}" ${answer ? "disabled" : ""}>
            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
            <span class="option-text">${escapeHTML(option)}</span>
            <span class="option-result">${correct ? "✓" : wrong ? "×" : ""}</span>
          </button>`;
      })
      .join("");
    const feedback = answer
      ? `
        <div class="feedback-box ${answer.correct ? "good" : "bad"}">
          <div class="feedback-title">${answer.correct ? "答对了 · 再看一次依据" : "这题需要回看"}</div>
          <p>${escapeHTML(question.explanation)}</p>
          <p style="margin-top:7px"><strong>陷阱：</strong>${escapeHTML(question.trap)}</p>
        </div>`
      : "";
    openModal(
      `
        ${modalHeader(
          `${set.source} · 第${quizRuntime.index + 1}题`,
          set.title,
          "先独立选择，再看依据。",
          `${subjectTag(set.subject)} ${reliabilityBadge(set.reliability)}`
        )}
        <div class="modal-body">
          <div class="quiz-progress"><div class="quiz-progress-bar"><span style="width:${progress}%"></span></div><em>${quizRuntime.index + 1}/${set.questions.length}</em></div>
          <span class="source-badge outline">${escapeHTML(question.skill)}</span>
          ${set.passage ? `<div class="passage-box">${escapeHTML(set.passage)}</div>` : ""}
          <h3 class="question-stem">${escapeHTML(question.stem)}</h3>
          <div class="option-list">${options}</div>
          ${feedback}
        </div>
        <footer class="modal-footer">
          <span style="color:var(--ink-faint);font-size:9px">首次作答计入正确率，重做不虚增掌握。</span>
          <button class="primary-button" type="button" data-action="${isLast ? "quiz-finish" : "quiz-next"}" ${answer ? "" : "disabled"}>${isLast ? "查看结果与方法回执" : "下一题"}</button>
        </footer>
      `,
      "quiz"
    );
  }

  function answerQuiz(choiceIndex) {
    if (!quizRuntime || quizRuntime.finished) return;
    const { set } = quizRuntime;
    const question = set.questions[quizRuntime.index];
    if (quizRuntime.answers[question.id]) return;
    const correct = choiceIndex === question.answer;
    quizRuntime.answers[question.id] = { choice: choiceIndex, correct };

    if (!state.practice.firstAttemptIds.includes(question.id)) {
      state.practice.firstAttemptIds.push(question.id);
      state.practice.answeredFirst += 1;
      if (correct) state.practice.correctFirst += 1;
    }
    const stats = typeStats(set.typeId);
    stats.attempts += 1;
    if (correct) stats.correct += 1;
    stats.lastDate = new Date().toISOString();
    state.typeStats[set.typeId] = stats;

    if (!correct) {
      const existing = state.mistakes.find(
        (item) => item.questionId === question.id
      );
      const mistake = {
        id: existing?.id || `m-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        questionId: question.id,
        subject: set.subject,
        typeId: set.typeId,
        skill: question.skill,
        stem: question.stem,
        passage: set.passage || "",
        options: question.options,
        selectedIndex: choiceIndex,
        answerIndex: question.answer,
        explanation: question.explanation,
        trap: question.trap,
        source: set.source,
        createdAt: new Date().toISOString(),
      };
      if (existing) {
        Object.assign(existing, mistake, { id: existing.id });
      } else {
        state.mistakes.push(mistake);
      }
    }
    saveState();
    updateChrome();
    renderQuiz();
  }

  function finishQuiz() {
    const { set } = quizRuntime;
    quizRuntime.finished = true;
    const correct = Object.values(quizRuntime.answers).filter((item) => item.correct).length;
    const total = set.questions.length;
    state.practice.completedSets[set.id] = {
      date: new Date().toISOString(),
      correct,
      total,
    };
    if (set.taskId) completeTask(set.taskId);
    saveState();
    renderPage(currentPage);
    updateChrome();
    renderQuizResult();
  }

  function renderQuizResult() {
    const { set } = quizRuntime;
    const correct = Object.values(quizRuntime.answers).filter((item) => item.correct).length;
    const total = set.questions.length;
    const wrong = total - correct;
    const module = getType(set.typeId);
    const wrongSkills = [
      ...new Set(
        set.questions
          .filter((question) => !quizRuntime.answers[question.id]?.correct)
          .map((question) => question.skill)
      ),
    ];
    openModal(
      `
        ${modalHeader("本组完成", "成绩只是诊断，不是最终目标", "下一轮要验证方法有没有迁移。", `${reliabilityBadge(set.reliability)} ${subjectTag(set.subject)}`)}
        <div class="modal-body">
          <div class="quiz-complete">
            <div class="result-mark"><strong style="font-family:var(--serif);font-size:23px">${Math.round((correct / total) * 100)}%</strong></div>
            <h2>${correct} / ${total} 题正确</h2>
            <p>${wrong ? `有${wrong}题需要回看，已进入错题本。先重做，再判断是否掌握。` : "本组全部答对。下一次要在混合题或限时情境中再次检查。"}</p>
          </div>
          <div class="debrief-box">
            <h3>方法回执</h3>
            <p><strong>带走这句话：</strong>${escapeHTML(module?.method.takeaway || "先判断题型，再按步骤完成。")}</p>
            ${wrongSkills.length ? `<p><strong>本次需回看：</strong>${wrongSkills.map(escapeHTML).join("、")}</p>` : ""}
            <ul>
              <li>这组题里，哪一个信号让你确定了第一步？</li>
              <li>哪个错误选项最容易让你凭感觉选择？</li>
              <li>下次遇到同类题，先检查结构还是先翻译意思？</li>
            </ul>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="secondary-button" type="button" data-action="open-type" data-type-id="${set.typeId}">回看方法卡</button>
          <div class="modal-footer-group">
            ${wrong ? `<button class="secondary-button" type="button" data-action="nav-from-modal" data-page="mistakes">打开错题</button>` : ""}
            <button class="primary-button" type="button" data-action="close-modal">完成</button>
          </div>
        </footer>
      `,
      "quiz-result"
    );
  }

  function retryMistake(id) {
    const mistake = state.mistakes.find((item) => item.id === id);
    if (!mistake) return;
    const module = getType(mistake.typeId);
    quizRuntime = {
      set: {
        id: `retry-${mistake.id}`,
        subject: mistake.subject,
        title: "错题重做",
        description: "",
        source: mistake.source,
        reliability: "purchased",
        typeId: mistake.typeId,
        taskId: "review",
        estimate: 2,
        passage: mistake.passage,
        questions: [
          {
            id: mistake.questionId,
            stem: mistake.stem,
            options: mistake.options,
            answer: mistake.answerIndex,
            skill: mistake.skill,
            explanation: mistake.explanation,
            trap: mistake.trap,
          },
        ],
      },
      index: 0,
      answers: {},
      finished: false,
    };
    renderQuiz();
  }

  function removeMistake(id) {
    state.mistakes = state.mistakes.filter((item) => item.id !== id);
    saveState();
    renderPage("mistakes");
    updateChrome();
    showToast("已移出错题本，之后仍会在混合训练中复现。");
  }

  function resetData() {
    if (!window.confirm("确认清空全部诊断、练习、错题和进度吗？此操作无法撤销。")) {
      return;
    }
    state = defaultState();
    saveState();
    closeModal();
    setPage("today");
  }

  function handleAction(action, trigger) {
    switch (action) {
      case "nav":
        closeModal();
        setPage(trigger.dataset.page);
        break;
      case "progress":
        setPage("progress");
        break;
      case "trust":
        openTrust();
        break;
      case "close-modal":
        closeModal();
        break;
      case "set-mode": {
        const mode = Number(trigger.dataset.minutes);
        if (![45, 90, 180].includes(mode)) return;
        ensureDay().mode = mode;
        saveState();
        renderPage("today");
        break;
      }
      case "start-task":
        startTask(trigger.dataset.taskId);
        break;
      case "toggle-task":
        toggleTask(trigger.dataset.taskId);
        break;
      case "start-diagnostic":
        openDiagnostic();
        break;
      case "subject-tab":
        currentSubject = trigger.dataset.subject;
        renderPage("types");
        break;
      case "paper-filter":
        paperFilter = trigger.dataset.filter;
        renderPage("papers");
        break;
      case "open-type":
        openType(trigger.dataset.typeId);
        break;
      case "open-paper":
        openPaper(trigger.dataset.paperId);
        break;
      case "complete-method": {
        const typeId = trigger.dataset.typeId;
        if (!state.completedMethods.includes(typeId)) {
          state.completedMethods.push(typeId);
        }
        if (typeId === "en-vocab") completeTask("method-vocab");
        saveState();
        trigger.textContent = "方法卡已学";
        trigger.disabled = true;
        updateChrome();
        showToast("已记录方法卡，下一步用真题验证。");
        break;
      }
      case "diag-select":
        diagnosticRuntime.answers[
          DATA.diagnostic.questions[diagnosticRuntime.index].id
        ] = Number(trigger.dataset.choice);
        renderDiagnostic();
        break;
      case "diag-prev":
        if (diagnosticRuntime.index > 0) {
          diagnosticRuntime.index -= 1;
          renderDiagnostic();
        }
        break;
      case "diag-next":
        if (diagnosticRuntime.index < DATA.diagnostic.questions.length - 1) {
          diagnosticRuntime.index += 1;
          renderDiagnostic();
        }
        break;
      case "diag-finish":
        finishDiagnostic();
        break;
      case "open-first-method":
        closeModal();
        openType("en-vocab");
        break;
      case "nav-from-modal": {
        const page = trigger.dataset.page;
        closeModal();
        setPage(page);
        break;
      }
      case "start-quiz":
        openQuiz(trigger.dataset.setId);
        break;
      case "quiz-answer":
        answerQuiz(Number(trigger.dataset.choice));
        break;
      case "quiz-next":
        quizRuntime.index += 1;
        renderQuiz();
        break;
      case "quiz-finish":
        finishQuiz();
        break;
      case "retry-mistake":
        retryMistake(trigger.dataset.mistakeId);
        break;
      case "remove-mistake":
        removeMistake(trigger.dataset.mistakeId);
        break;
      case "reset-data":
        resetData();
        break;
      default:
        break;
    }
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;
    event.preventDefault();
    handleAction(trigger.dataset.action, trigger);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalLayer.hidden) closeModal();
  });

  ensureDay();
  updateChrome();
  setPage("today", { scroll: false });
})();
