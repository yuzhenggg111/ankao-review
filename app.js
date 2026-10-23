(() => {
  "use strict";

  const DATA = window.APP_DATA;
  const STORAGE_KEY = "wanben-review-v01";
  const PAGE_TITLES = {
    today: "今天",
    learn: "学习地图",
    practice: "练习中心",
    mistakes: "错题本",
    progress: "学习进度",
  };

  let currentPage = "today";
  let learnSubject = "english";
  let diagnosticRuntime = null;
  let quizRuntime = null;
  let quizTimerId = null;
  let toastTimerId = null;

  const modalLayer = document.getElementById("modal-layer");
  const modalCard = document.getElementById("modal-card");
  const toastElement = document.getElementById("toast");

  function createDefaultState() {
    return {
      diagnostic: {
        completed: false,
        result: null,
      },
      lessonRead: [],
      knownWords: [],
      practice: {
        firstAttemptIds: [],
        answeredFirst: 0,
        correctFirst: 0,
        bySkill: {},
        completedSets: {},
      },
      mistakes: [],
      days: {},
    };
  }

  function loadState() {
    const defaults = createDefaultState();
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
          bySkill: { ...(saved.practice?.bySkill || {}) },
          completedSets: { ...(saved.practice?.completedSets || {}) },
          firstAttemptIds: Array.isArray(saved.practice?.firstAttemptIds)
            ? saved.practice.firstAttemptIds
            : [],
        },
        lessonRead: Array.isArray(saved.lessonRead) ? saved.lessonRead : [],
        knownWords: Array.isArray(saved.knownWords) ? saved.knownWords : [],
        mistakes: Array.isArray(saved.mistakes) ? saved.mistakes : [],
        days: saved.days && typeof saved.days === "object" ? saved.days : {},
      };
    } catch (error) {
      console.warn("无法读取本地学习记录，将使用新进度。", error);
      return defaults;
    }
  }

  let state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("本地进度保存失败，请检查浏览器存储设置。");
      console.warn("无法保存学习记录。", error);
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

  function pad(number) {
    return String(number).padStart(2, "0");
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

  function formatShortDate(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function ensureDayState(key = todayKey()) {
    if (!state.days[key]) {
      const day = parseDateKey(key);
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      state.days[key] = {
        mode: isWeekend ? 180 : 90,
        completed: [],
      };
      saveState();
    }
    if (!Array.isArray(state.days[key].completed)) {
      state.days[key].completed = [];
    }
    return state.days[key];
  }

  function currentPlan() {
    const dayState = ensureDayState();
    let taskIds = DATA.planModes[dayState.mode] || DATA.planModes[90];
    if (!state.diagnostic.completed) {
      taskIds = ["diagnostic", "words", "review"];
    }
    return taskIds.map((id) => DATA.taskTemplates[id]).filter(Boolean);
  }

  function planMinutes(plan = currentPlan()) {
    return plan.reduce((sum, task) => sum + task.duration, 0);
  }

  function isTaskDone(taskId, dayKeyValue = todayKey()) {
    return Boolean(state.days[dayKeyValue]?.completed?.includes(taskId));
  }

  function completeTask(taskId) {
    const key = todayKey();
    const dayState = ensureDayState(key);
    const planIds = currentPlan().map((task) => task.id);
    if (taskId !== "diagnostic" && !planIds.includes(taskId)) return;
    if (!dayState.completed.includes(taskId)) {
      dayState.completed.push(taskId);
      saveState();
      updateChrome();
    }
  }

  function toggleTask(taskId) {
    const key = todayKey();
    const dayState = ensureDayState(key);
    if (dayState.completed.includes(taskId)) {
      dayState.completed = dayState.completed.filter((id) => id !== taskId);
    } else {
      dayState.completed.push(taskId);
    }
    saveState();
    renderPage("today");
    updateChrome();
  }

  function completedDayCount() {
    return Object.values(state.days).filter(
      (day) => Array.isArray(day.completed) && day.completed.length > 0
    ).length;
  }

  function dayHasCompletion(key) {
    return Boolean(state.days[key]?.completed?.length);
  }

  function calculateStreak() {
    let cursor = new Date();
    if (!dayHasCompletion(dateKey(cursor))) {
      cursor = addDays(cursor, -1);
    }
    let streak = 0;
    while (dayHasCompletion(dateKey(cursor)) && streak < 3650) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function getWeekDates() {
    const now = new Date();
    const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
    const monday = addDays(now, mondayOffset);
    return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  }

  function getWeekCompletion() {
    const week = getWeekDates();
    const completedDays = week.filter((date) => dayHasCompletion(dateKey(date))).length;
    return { completedDays, totalDays: week.length };
  }

  function firstAttemptAccuracy() {
    if (!state.practice.answeredFirst) return 0;
    return Math.round((state.practice.correctFirst / state.practice.answeredFirst) * 100);
  }

  function readLessonCount(subject) {
    const lessonIds = Object.values(DATA.lessons)
      .filter((lesson) => lesson.subject === subject)
      .map((lesson) => lesson.id);
    return lessonIds.filter((id) => state.lessonRead.includes(id)).length;
  }

  function totalLessonCount(subject) {
    return Object.values(DATA.lessons).filter(
      (lesson) => lesson.subject === subject
    ).length;
  }

  function getSubjectProgress(subject) {
    const lessons = totalLessonCount(subject);
    const lessonsRead = readLessonCount(subject);
    const skillEntries = Object.entries(state.practice.bySkill).filter(([skill]) =>
      subject === "english"
        ? skill.startsWith("英语")
        : skill.startsWith("语文")
    );
    const attempts = skillEntries.reduce((sum, [, value]) => sum + value.attempts, 0);
    const correct = skillEntries.reduce((sum, [, value]) => sum + value.correct, 0);
    const practicePart = attempts ? correct / attempts : 0;
    const lessonPart = lessons ? lessonsRead / lessons : 0;
    return {
      percentage: Math.round((lessonPart * 0.55 + practicePart * 0.45) * 100),
      lessonsRead,
      lessons,
      attempts,
      correct,
    };
  }

  function updateChrome() {
    const now = new Date();
    document.getElementById("current-date-label").textContent = formatChineseDate(now);
    document.getElementById("page-title").textContent = PAGE_TITLES[currentPage];

    const examDate = new Date(2027, 3, 17);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysUntilExam = Math.max(
      0,
      Math.ceil((examDate.getTime() - today.getTime()) / 86400000)
    );
    document.getElementById("exam-countdown").textContent = `预计考试 ${daysUntilExam} 天`;

    const completedLessons = state.lessonRead.length;
    const totalLessons = Math.max(1, Object.keys(DATA.lessons).length);
    document.getElementById("side-stage-progress").style.width = `${Math.max(
      4,
      Math.min(100, (completedLessons / totalLessons) * 100)
    )}%`;

    const mistakeCount = state.mistakes.length;
    ["nav-mistake-count", "mobile-mistake-count"].forEach((id) => {
      const count = document.getElementById(id);
      count.textContent = String(mistakeCount);
      count.hidden = mistakeCount === 0;
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
    if (page === "learn") view.innerHTML = renderLearn();
    if (page === "practice") view.innerHTML = renderPractice();
    if (page === "mistakes") view.innerHTML = renderMistakes();
    if (page === "progress") view.innerHTML = renderProgress();
  }

  function subjectTag(subject) {
    const map = {
      english: { className: "english", label: "英语" },
      chinese: { className: "chinese", label: "语文" },
      both: { className: "both", label: "综合" },
    };
    const item = map[subject] || map.both;
    return `<span class="subject-tag ${item.className}">${item.label}</span>`;
  }

  function sourceBadge(type, forcedLabel = "") {
    const labels = {
      verified: "已核对",
      outline: "依据大纲",
      original: "原创练习",
      pending: "待核验",
    };
    return `<span class="source-badge ${type}">${escapeHTML(
      forcedLabel || labels[type] || "未标注"
    )}</span>`;
  }

  function renderToday() {
    const plan = currentPlan();
    const dayState = ensureDayState();
    const doneCount = plan.filter((task) => isTaskDone(task.id)).length;
    const totalMinutes = planMinutes(plan);
    const completedMinutes = plan
      .filter((task) => isTaskDone(task.id))
      .reduce((sum, task) => sum + task.duration, 0);
    const dailyPercentage = plan.length
      ? Math.round((doneCount / plan.length) * 100)
      : 0;
    const nextTask = plan.find((task) => !isTaskDone(task.id)) || plan[0];
    const diagnosticDone = state.diagnostic.completed;

    let heroTitle = "先用12道小题，找到最合适的起点";
    let heroText =
      "看不懂或做错都很正常。诊断只帮助我们决定先补字母、词汇还是句子，不会给出不可靠的分数预测。";
    let heroButtonLabel = "开始基础诊断";
    let heroButtonAction = `data-action="start-diagnostic"`;

    if (diagnosticDone) {
      heroTitle = "今天不追求学很多，只完成这条最小路径";
      heroText =
        "先认词，再理解一句话怎么组成，最后回看旧错。每一步都留有练习和反馈，学完就能判断自己是否真的会了。";
      heroButtonLabel = doneCount === plan.length ? "今天已完成，查看进度" : "继续今日任务";
      heroButtonAction =
        doneCount === plan.length
          ? `data-action="progress"`
          : `data-action="start-task" data-task-id="${nextTask?.id || ""}"`;
    }

    const modeButtons = [
      { minutes: 45, label: "45分钟" },
      { minutes: 90, label: "90分钟" },
      { minutes: 180, label: "周末深度" },
    ]
      .map(
        (item) =>
          `<button type="button" class="${dayState.mode === item.minutes ? "is-active" : ""}" data-action="set-mode" data-minutes="${item.minutes}">${item.label}</button>`
      )
      .join("");

    const taskRows = plan
      .map((task, index) => {
        const done = isTaskDone(task.id);
        return `
          <article class="task-row ${done ? "is-done" : ""}">
            <div class="task-index">${done ? "✓" : index + 1}</div>
            <div class="task-copy">
              <h4>${escapeHTML(task.title)}</h4>
              <p>${escapeHTML(task.detail)}</p>
              <div class="task-meta">
                ${subjectTag(task.subject)}
                <span class="task-duration">${task.duration}分钟</span>
                ${task.id === "diagnostic" && diagnosticDone ? sourceBadge("verified") : ""}
              </div>
            </div>
            <div class="task-controls">
              <button class="secondary-button button-small" type="button" data-action="start-task" data-task-id="${task.id}">
                ${done ? "再看一遍" : "开始"}
              </button>
              <button class="circle-check" type="button" data-action="toggle-task" data-task-id="${task.id}" aria-label="${done ? "取消完成" : "标记完成"}">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5"/></svg>
              </button>
            </div>
          </article>`;
      })
      .join("");

    const baselineNotice = diagnosticDone
      ? `
        <div class="diagnostic-banner">
          <div class="diagnostic-icon">起</div>
          <div>
            <strong>起点诊断已完成</strong>
            <span>英语 ${state.diagnostic.result?.englishCorrect ?? 0}/${state.diagnostic.result?.englishTotal ?? 7}，语文 ${state.diagnostic.result?.chineseCorrect ?? 0}/${state.diagnostic.result?.chineseTotal ?? 5}。不据此预测最终分数。</span>
          </div>
          <button class="text-link" type="button" data-action="show-diagnostic-result">查看建议</button>
        </div>`
      : `
        <div class="diagnostic-banner">
          <div class="diagnostic-icon">1</div>
          <div>
            <strong>今天先完成起点诊断</strong>
            <span>约15分钟，包含7道英语和5道语文基础题。</span>
          </div>
          <button class="text-link" type="button" data-action="start-diagnostic">开始</button>
        </div>`;

    return `
      <div class="dashboard-grid">
        <section class="hero-card">
          <div class="hero-content">
            <div class="eyebrow">${diagnosticDone ? "今日学习路径" : "第一步 · 学习起点"}</div>
            <h2>${heroTitle}</h2>
            <p>${heroText}</p>
            <div class="hero-actions">
              <button class="primary-button" type="button" ${heroButtonAction}>${heroButtonLabel}</button>
              <button class="secondary-button" type="button" data-action="nav" data-page="learn">看看完整路线</button>
            </div>
          </div>
          ${
            diagnosticDone
              ? `<div class="hero-progress-ring"><strong>${doneCount}/${plan.length}</strong><span>今日任务</span></div>`
              : ""
          }
          <div class="target-band">
            <div class="target-item">
              <span>目标总分</span>
              <strong>240 / 300</strong>
              <small>当前目标，不保证结果</small>
            </div>
            <div class="target-item">
              <span>今日路径</span>
              <strong>${totalMinutes}分钟</strong>
              <small>已完成 ${completedMinutes} 分钟</small>
            </div>
            <div class="target-item">
              <span>当前原则</span>
              <strong>先会基础</strong>
              <small>资料有出处，再进入训练</small>
            </div>
          </div>
        </section>

        <aside class="side-column">
          <section class="card card-padded">
            <div class="card-heading">
              <div>
                <span class="mini-kicker">今日完成度</span>
                <h3>${doneCount ? "路线正在推进" : "从第一小步开始"}</h3>
              </div>
            </div>
            <div class="progress-ring-card">
              <div class="progress-ring" style="--progress:${dailyPercentage * 3.6}deg">
                <div class="progress-ring-content">
                  <strong>${dailyPercentage}%</strong>
                  <span>今日</span>
                </div>
              </div>
              <div class="ring-copy">
                <strong>${doneCount} / ${plan.length} 个任务</strong>
                <p>完成标准比学习时长更重要。不会的内容可以重学，不要只打勾。</p>
              </div>
            </div>
          </section>

          <section class="card card-padded">
            <div class="card-heading">
              <div>
                <span class="mini-kicker">本周节奏</span>
                <h3>${getWeekCompletion().completedDays} / 7 天有学习记录</h3>
              </div>
            </div>
            <div class="focus-list">
              <div class="focus-row">
                <i class="focus-dot"></i>
                <div><strong>英语句子基础</strong><span>当前主线</span></div>
                <em>优先</em>
              </div>
              <div class="focus-row">
                <i class="focus-dot"></i>
                <div><strong>15篇背诵范围</strong><span>开始分组积累</span></div>
                <em>逐步</em>
              </div>
              <div class="focus-row">
                <i class="focus-dot"></i>
                <div><strong>错题回顾</strong><span>不连续留到下一天</span></div>
                <em>每日</em>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <h2>今天的学习顺序</h2>
            <p>先完成诊断，再按“认词 → 理解 → 练习 → 回看”推进。</p>
          </div>
          <button class="text-link" type="button" data-action="nav" data-page="practice">查看全部练习</button>
        </div>
        ${baselineNotice}
        <div class="task-list">${taskRows}</div>
        <div class="mode-bar">
          <span>今天可用学习时间（会影响任务组合）</span>
          <div class="mode-switch">${modeButtons}</div>
        </div>
      </section>

      <section class="insight-grid">
        <article class="card insight-card">
          <h3>为什么今天这样安排</h3>
          <ul>
            <li>她目前只能认部分字母和单词，先建立完整句子意识，比直接刷阅读更容易坚持。</li>
            <li>每道练习都要求说出“为什么”，防止靠印象猜对。</li>
            <li>今天的错题会进入错题本，下一次优先重现，而不是一次性看过。</li>
          </ul>
        </article>
        <article class="card insight-card">
          <h3>今天不要把时间花在</h3>
          <ul>
            <li>整篇背作文模板：基础句还不会时，模板只会增加记忆负担。</li>
            <li>连续做多套来源不明的真题：答案错一次，后面可能反复练错。</li>
            <li>只统计学习时长：能独立做对的题和能复述的规则才代表掌握。</li>
          </ul>
        </article>
      </section>
    `;
  }

  function renderLearn() {
    const groups = DATA.knowledge[learnSubject] || [];
    const subjectData = DATA.syllabus[learnSubject];
    const read = readLessonCount(learnSubject);
    const total = totalLessonCount(learnSubject);
    const availableNodes = groups
      .flatMap((group) => group.nodes)
      .filter((node) => node.lessonId).length;

    const tabs = [
      { key: "english", label: "英语" },
      { key: "chinese", label: "大学语文" },
    ]
      .map(
        (subject) => `
          <button type="button" class="${learnSubject === subject.key ? "is-active" : ""}" data-action="learn-subject" data-subject="${subject.key}">
            ${subject.label}
          </button>`
      )
      .join("");

    const groupsHTML = groups
      .map((group) => {
        const nodes = group.nodes
          .map((node) => {
            const lesson = node.lessonId ? DATA.lessons[node.lessonId] : null;
            const isRead = node.lessonId && state.lessonRead.includes(node.lessonId);
            const stateClass = isRead ? "read" : node.status;
            const stateLabel = isRead
              ? "已学过"
              : node.status === "now"
                ? "现在可学"
                : "后续接入";
            const element = lesson
              ? `<button class="node-card ${isRead ? "is-read" : ""}" type="button" data-action="open-lesson" data-lesson-id="${lesson.id}">`
              : `<div class="node-card is-roadmap">`;
            return `
              ${element}
                <div class="node-topline">
                  <span class="node-state ${stateClass}">${stateLabel}</span>
                  ${lesson ? sourceBadge(lesson.sourceType === "依据大纲" ? "outline" : "original") : ""}
                </div>
                <span class="node-title">${escapeHTML(node.title)}</span>
                ${lesson ? `<span class="node-arrow">→</span>` : ""}
              ${lesson ? "</button>" : "</div>"}`;
          })
          .join("");

        return `
          <section class="knowledge-group">
            <div class="knowledge-group-header">
              <h3>${escapeHTML(group.title)}</h3>
              <span>${escapeHTML(group.note)}</span>
            </div>
            <div class="node-grid">${nodes}</div>
          </section>`;
      })
      .join("");

    return `
      <section class="learn-hero">
        <div>
          <span class="mini-kicker">${learnSubject === "english" ? "英语能力链" : "语文复习链"}</span>
          <h2>${learnSubject === "english" ? "从认识单词，到看懂一句完整的话" : "从积累基础，到读懂文章、写出文章"}</h2>
          <p>${escapeHTML(subjectData.summary)} 当前样板版开放了可立即学习的基础单元；后续单元会按核验后的资料继续接入。</p>
        </div>
        <div class="learn-stat">
          <strong>${read}/${total}</strong>
          <span>已学单元 · 当前开放 ${availableNodes} 个节点</span>
        </div>
      </section>

      <div class="subject-tabs">${tabs}</div>
      ${groupsHTML}

      <div class="notice-box">
        <div class="notice-icon">!</div>
        <div>
          <strong>地图不是“全部都得马上学”</strong>
          “后续接入”表示路线位置已确定，但内容尚未做完整核验，因此暂时不提供练习。当前只学标记为“现在可学”的节点。
        </div>
      </div>
    `;
  }

  function renderPractice() {
    const sets = Object.values(DATA.practiceSets);
    const completedCount = Object.keys(state.practice.completedSets).length;
    const cards = sets
      .map((set) => {
        const last = state.practice.completedSets[set.id];
        return `
          <article class="card practice-card">
            <div class="practice-card-top">
              ${subjectTag(set.subject)}
              ${sourceBadge("original")}
            </div>
            <h3>${escapeHTML(set.title)}</h3>
            <p>${escapeHTML(set.description)}</p>
            <div class="practice-card-footer">
              <span>${set.questions.length}题 · 约${set.estimate}分钟${last ? ` · 上次${last.correct}/${last.total}` : ""}</span>
              <button class="soft-button button-small" type="button" data-action="start-quiz" data-quiz-id="${set.id}">开始练习</button>
            </div>
          </article>`;
      })
      .join("");

    return `
      <section class="practice-summary">
        <div>
          <span class="mini-kicker" style="color:#bcd7c8">阶段混合小测</span>
          <h2>用一次短测检查有没有真的会</h2>
          <p>混合检索比连续做同一种题更能暴露薄弱点。当前只考查已开放的基础内容，题目均为原创练习，并限时8分钟。</p>
        </div>
        <button class="primary-button" type="button" data-action="start-quiz" data-quiz-id="mixed">开始8分钟小测</button>
      </section>

      <div class="section-heading">
        <div>
          <h2>基础训练</h2>
          <p>每题都会显示答案依据；答错自动进入错题本。</p>
        </div>
        <span class="source-badge original">本页无历年真题</span>
      </div>
      <div class="practice-grid">${cards}</div>

      <div class="notice-box">
        <div class="notice-icon">i</div>
        <div>
          <strong>为什么现在不标记“高频考点”</strong>
          当前还没有完成历年原卷与答案的来源核验。只有拿到可追溯的试卷后，才会统计题型频率、分值和命题方式。现在不编造高频结论。
        </div>
      </div>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <h2>当前练习记录</h2>
            <p>已完成 ${completedCount} 组练习，首次作答正确率 ${firstAttemptAccuracy()}%。</p>
          </div>
          <button class="text-link" type="button" data-action="nav" data-page="mistakes">查看错题本</button>
        </div>
      </section>
    `;
  }

  function renderMistakes() {
    if (!state.mistakes.length) {
      return `
        <div class="empty-state">
          <div>
            <div class="empty-mark">净</div>
            <h3>错题本还是空的</h3>
            <p>完成一组练习后，答错的题会自动记录在这里。错题不是收藏品，后续会要求重新作答，直到能独立做对。</p>
            <button class="primary-button" type="button" data-action="nav" data-page="practice">去做基础练习</button>
          </div>
        </div>
      `;
    }

    const cards = state.mistakes
      .slice()
      .reverse()
      .map((mistake) => {
        const selectedText = mistake.options[mistake.selectedIndex] ?? "未记录";
        const correctText = mistake.options[mistake.correctIndex] ?? "未记录";
        return `
          <article class="card mistake-card">
            <div class="mistake-header">
              <div class="mistake-meta">
                ${subjectTag(mistake.subject)}
                <span class="source-badge original">${escapeHTML(mistake.skill || "基础练习")}</span>
                <span class="mistake-date">${formatShortDate(mistake.createdAt)}</span>
              </div>
            </div>
            <h3>${escapeHTML(mistake.stem)}</h3>
            ${mistake.passage ? `<div class="passage-box">${escapeHTML(mistake.passage)}</div>` : ""}
            <div class="answer-review">
              <div class="answer-box wrong"><span>当时选择</span><strong>${escapeHTML(selectedText)}</strong></div>
              <div class="answer-box right"><span>正确答案</span><strong>${escapeHTML(correctText)}</strong></div>
            </div>
            <p class="mistake-explanation">${escapeHTML(mistake.explanation)}</p>
            <div class="mistake-actions">
              <button class="soft-button button-small" type="button" data-action="retry-mistake" data-mistake-id="${mistake.id}">重新作答</button>
              <button class="secondary-button button-small" type="button" data-action="remove-mistake" data-mistake-id="${mistake.id}">已掌握，移出</button>
            </div>
          </article>`;
      })
      .join("");

    return `
      <div class="section-heading">
        <div>
          <h2>需要再次证明“我会了”的题</h2>
          <p>共 ${state.mistakes.length} 道。先自己重做，再看解析。</p>
        </div>
        <button class="text-link" type="button" data-action="nav" data-page="practice">继续练习</button>
      </div>
      <div class="mistake-list">${cards}</div>
    `;
  }

  function renderProgress() {
    const englishProgress = getSubjectProgress("english");
    const chineseProgress = getSubjectProgress("chinese");
    const week = getWeekDates();
    const today = new Date();
    const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];
    const weekCells = week
      .map((date, index) => {
        const key = dateKey(date);
        const sameDay = key === dateKey(today);
        const done = dayHasCompletion(key);
        return `
          <div class="day-cell ${done ? "is-done" : ""} ${sameDay ? "is-today" : ""}">
            <div>周${weekLabels[index]}<strong>${date.getDate()}</strong></div>
          </div>`;
      })
      .join("");

    const englishTargets = DATA.syllabus.english.structure
      .map(
        (item) => `
          <div class="answer-box">
            <span>${escapeHTML(item.name)} · ${item.score}分</span>
            <strong>目标 ${item.target}/${item.score}</strong>
          </div>`
      )
      .join("");

    return `
      <div class="metric-grid">
        <article class="card metric-card">
          <span>有效学习日</span>
          <strong>${completedDayCount()}</strong>
          <small>至少完成一个任务</small>
        </article>
        <article class="card metric-card">
          <span>连续记录</span>
          <strong>${calculateStreak()}</strong>
          <small>中断一天可以继续</small>
        </article>
        <article class="card metric-card">
          <span>首次作答正确率</span>
          <strong>${firstAttemptAccuracy()}%</strong>
          <small>重复作答不抬高数据</small>
        </article>
        <article class="card metric-card">
          <span>待复习错题</span>
          <strong>${state.mistakes.length}</strong>
          <small>需要重新证明掌握</small>
        </article>
      </div>

      <div class="progress-layout">
        <section class="goal-card">
          <span class="mini-kicker" style="color:#bcd7c8">240分目标蓝图</span>
          <h3>先把目标拆成可训练的数字</h3>
          <p>这是一份当前目标，不是分数预测。语文各题型真实权重还需要用可靠真题核对，因此语文暂不细拆到题号。</p>
          <div class="goal-score-row">
            <div class="goal-score"><span>两科总分</span><strong>240</strong><small>满分 300</small></div>
            <div class="goal-score"><span>语文目标</span><strong>120</strong><small>满分 150 · 待题型权重核验</small></div>
            <div class="goal-score"><span>英语目标</span><strong>120</strong><small>满分 150 · 按大纲分值拆分</small></div>
          </div>
          <p class="goal-footnote">英语分项目标：词汇与结构24/30，完形16/20，阅读32/40，翻译24/30，写作24/30。</p>
          <div class="answer-review" style="margin-top:16px">${englishTargets}</div>
        </section>

        <aside class="card mastery-card">
          <h3>当前学习证据</h3>
          <div class="mastery-list">
            <div class="mastery-row">
              <span><b>英语</b><em>${englishProgress.lessonsRead}/${englishProgress.lessons} 单元</em></span>
              <div class="linear-progress"><i style="width:${englishProgress.percentage}%"></i></div>
            </div>
            <div class="mastery-row">
              <span><b>大学语文</b><em>${chineseProgress.lessonsRead}/${chineseProgress.lessons} 单元</em></span>
              <div class="linear-progress"><i style="width:${chineseProgress.percentage}%"></i></div>
            </div>
          </div>
          <div class="week-grid">${weekCells}</div>
          <div class="settings-row">
            <p>进度只保存在这台设备，不会上传到服务器。</p>
            <button class="danger-button button-small" type="button" data-action="reset-data">清空记录</button>
          </div>
        </aside>
      </div>
    `;
  }

  function openModal(content, options = {}) {
    modalCard.innerHTML = content;
    modalLayer.hidden = false;
    document.body.style.overflow = "hidden";
    const title = modalCard.querySelector("#modal-title");
    if (title) title.setAttribute("tabindex", "-1");
    window.requestAnimationFrame(() => {
      const closeButton = modalCard.querySelector(".close-button");
      (closeButton || title || modalCard).focus?.();
    });
    if (options.type) {
      modalLayer.dataset.modalType = options.type;
    }
  }

  function closeModal() {
    modalLayer.hidden = true;
    modalLayer.removeAttribute("data-modal-type");
    modalCard.innerHTML = "";
    document.body.style.overflow = "";
    diagnosticRuntime = null;
    quizRuntime = null;
    clearQuizTimer();
  }

  function modalHeader(kicker, title, subtitle = "", extraBadge = "") {
    return `
      <header class="modal-header">
        <div>
          <span class="mini-kicker">${escapeHTML(kicker)}</span>
          <h2 id="modal-title">${escapeHTML(title)}</h2>
          ${subtitle ? `<p>${escapeHTML(subtitle)}</p>` : ""}
          ${extraBadge ? `<div style="margin-top:8px">${extraBadge}</div>` : ""}
        </div>
        <button class="close-button" type="button" data-action="close-modal" aria-label="关闭">×</button>
      </header>`;
  }

  function showToast(message) {
    window.clearTimeout(toastTimerId);
    toastElement.textContent = message;
    toastElement.hidden = false;
    toastTimerId = window.setTimeout(() => {
      toastElement.hidden = true;
    }, 2600);
  }

  function openTrustCenter() {
    const statuses = DATA.sourceStatus
      .map(
        (item) => `
          <div class="source-row">
            <strong>${escapeHTML(item.item)}</strong>
            <p>${escapeHTML(item.detail)}</p>
            <span class="status-badge ${item.status}">${escapeHTML(
              DATA.reliabilityLevels.find((level) => level.key === item.status)?.label ||
                item.status
            )}</span>
          </div>`
      )
      .join("");

    const legends = DATA.reliabilityLevels
      .map(
        (level) => `
          <div class="legend-row">
            ${sourceBadge(level.key)}
            <p>${escapeHTML(level.description)}</p>
          </div>`
      )
      .join("");

    openModal(
      `
        ${modalHeader(
          `版本 ${DATA.meta.version} · ${DATA.meta.versionLabel}`,
          "资料核验中心",
          "先保证没有错误，再追求内容数量。"
        )}
        <div class="modal-body">
          <div class="trust-intro">
            <strong>本版大纲依据：</strong>${escapeHTML(DATA.meta.outlineSource)}<br />
            ${escapeHTML(DATA.meta.sourceRule)}
          </div>
          <div class="source-table">${statuses}</div>
          <h3 style="margin:22px 0 8px;font-family:var(--serif);font-size:15px">内容标签说明</h3>
          <div class="legend-list">${legends}</div>
          <div class="notice-box">
            <div class="notice-icon">!</div>
            <div>
              <strong>关于考试日期</strong>
              ${escapeHTML(DATA.meta.estimateNote)}
            </div>
          </div>
        </div>
        <footer class="modal-footer">
          <span style="color:var(--ink-faint);font-size:9px">数据保存在本机浏览器 localStorage。</span>
          <button class="primary-button" type="button" data-action="close-modal">我知道了</button>
        </footer>
      `,
      { type: "trust" }
    );
  }

  function startTask(taskId) {
    const task = DATA.taskTemplates[taskId];
    if (!task) return;
    if (task.action.type === "diagnostic") {
      openDiagnostic();
      return;
    }
    if (task.action.type === "lesson") {
      openLesson(task.action.id);
      return;
    }
    if (task.action.type === "quiz") {
      openQuiz(task.action.id);
      return;
    }
    if (task.action.type === "mistakes") {
      closeModal();
      setPage("mistakes");
    }
  }

  function openLesson(lessonId) {
    const lesson = DATA.lessons[lessonId];
    if (!lesson) {
      showToast("这个学习单元还没有接入。");
      return;
    }

    const badgeType = lesson.sourceType === "依据大纲" ? "outline" : "original";
    let body = "";

    if (lesson.type === "alphabet") {
      const letters = Array.from({ length: 26 }, (_, index) =>
        String.fromCharCode(65 + index)
      )
        .map((letter) => {
          const lower = letter.toLowerCase();
          return `
            <button class="letter-card" type="button" data-action="speak-word" data-word="${letter}" aria-label="朗读字母 ${letter}">
              <strong>${letter}${lower}</strong>
              <span>点击听读</span>
            </button>`;
        })
        .join("");
      body = `
        <div class="letter-grid">${letters}</div>
        <div class="notice-box">
          <div class="notice-icon">i</div>
          <div><strong>先认形，再听声</strong>每次只关注一组容易混淆的字母。等能快速分辨大小写，再把它们放进单词里。</div>
        </div>`;
    } else if (lesson.type === "words") {
      const words = DATA.wordBank
        .map((word) => {
          const known = state.knownWords.includes(word.word);
          return `
            <article class="word-card ${known ? "is-known" : ""}">
              <div class="word-head">
                <div>
                  <strong>${escapeHTML(word.word)}</strong>
                  <span>${escapeHTML(word.phonetic)}</span>
                </div>
                <button class="speak-button" type="button" data-action="speak-word" data-word="${escapeHTML(word.word)}" aria-label="朗读 ${escapeHTML(word.word)}">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 3V7L8 10zM15 9a4 4 0 0 1 0 6M17.5 6.5a7 7 0 0 1 0 11"/></svg>
                </button>
              </div>
              <div class="word-meaning">${escapeHTML(word.meaning)}</div>
              <p class="word-example">${escapeHTML(word.sentence)}<br />${escapeHTML(word.sentenceMeaning)}</p>
              <button class="known-toggle" type="button" data-action="toggle-known" data-word="${escapeHTML(word.word)}">${known ? "已标记认识" : "还不确定，再练"}</button>
            </article>`;
        })
        .join("");
      body = `
        <div class="word-grid">${words}</div>
        <div class="notice-box">
          <div class="notice-icon">i</div>
          <div><strong>这里的“认识”不是一次背会</strong>能看英文说出中文，并且知道它在句子里的意思，才算完成第一层。后续还会再次出现。</div>
        </div>`;
    } else {
      const sections = lesson.sections
        .map((section) => {
          const examples = (section.examples || [])
            .map(
              (example) => `
                <div class="example-block">
                  <strong>${escapeHTML(example.source)}</strong>
                  <span>${escapeHTML(example.analysis)}</span>
                </div>`
            )
            .join("");
          return `
            <section class="lesson-section">
              <h3>${escapeHTML(section.heading)}</h3>
              <p>${escapeHTML(section.body)}</p>
              ${examples ? `<div class="example-stack">${examples}</div>` : ""}
            </section>`;
        })
        .join("");

      const steps = lesson.steps
        ? `<ol class="lesson-steps">${lesson.steps
            .map((step) => `<li>${escapeHTML(step)}</li>`)
            .join("")}</ol>`
        : "";

      const recitation =
        lesson.type === "recitation"
          ? `
            <div class="recite-groups">
              ${["古文与论说", "辞赋与散文", "诗歌", "词曲"]
                .map((group) => {
                  const items = DATA.syllabus.chinese.recitationWorks
                    .filter((work) => work.group === group)
                    .map(
                      (work) =>
                        `<li><strong>${escapeHTML(work.title)}</strong><span>${escapeHTML(work.author)}</span></li>`
                    )
                    .join("");
                  return `<section class="recite-group"><h3>${group}</h3><ul class="recite-list">${items}</ul></section>`;
                })
                .join("")}
            </div>
            <div class="quote-card">
              <strong>${escapeHTML(lesson.sampleQuote.text)}</strong>
              <span>${escapeHTML(lesson.sampleQuote.source)}</span>
              <p>${escapeHTML(lesson.sampleQuote.prompt)}</p>
            </div>`
          : "";

      body = `${steps}${sections}${recitation}`;
    }

    const isRead = state.lessonRead.includes(lesson.id);
    const practiceButton = lesson.practiceSetId
      ? `<button class="secondary-button" type="button" data-action="start-quiz" data-quiz-id="${lesson.practiceSetId}">做配套练习</button>`
      : "";

    openModal(
      `
        ${modalHeader(
          `${lesson.kicker} · 约${lesson.duration}分钟`,
          lesson.title,
          lesson.goal,
          `${sourceBadge(badgeType, lesson.sourceType)} <span class="source-badge outline">${escapeHTML(lesson.level)}</span>`
        )}
        <div class="modal-body">
          <div class="lesson-goal">
            <span>与考试的关系</span>
            <strong>${escapeHTML(lesson.examLink)}</strong>
          </div>
          ${body}
        </div>
        <footer class="modal-footer">
          <span style="color:var(--ink-faint);font-size:9px">${isRead ? "已记录为学过，仍可反复查看。" : "确认看懂后再标记学完。"}</span>
          <div class="modal-footer-group">
            ${practiceButton}
            <button class="primary-button" type="button" data-action="mark-lesson-read" data-lesson-id="${lesson.id}" ${isRead ? "disabled" : ""}>${isRead ? "已学完" : "我学完了"}</button>
          </div>
        </footer>
      `,
      { type: "lesson" }
    );
  }

  function markLessonRead(lessonId) {
    if (!state.lessonRead.includes(lessonId)) {
      state.lessonRead.push(lessonId);
    }
    const mapping = {
      "en-alphabet": "alphabet",
      "en-word-starter": "words",
      "en-sentence-basics": "sentence-lesson",
      "cn-recitation": "recitation",
    };
    if (mapping[lessonId]) completeTask(mapping[lessonId]);
    saveState();
    renderPage(currentPage);
    const button = modalCard.querySelector('[data-action="mark-lesson-read"]');
    if (button) {
      button.textContent = "已学完";
      button.disabled = true;
    }
    showToast("已记录本单元，后续会再次安排复习。");
  }

  function openDiagnostic() {
    if (state.diagnostic.completed && state.diagnostic.result) {
      showDiagnosticResult();
      return;
    }
    diagnosticRuntime = {
      index: 0,
      answers: {},
    };
    renderDiagnostic();
  }

  function renderDiagnostic() {
    if (!diagnosticRuntime) return;
    const questions = DATA.diagnostic.questions;
    const question = questions[diagnosticRuntime.index];
    const selected = diagnosticRuntime.answers[question.id];
    const progress = ((diagnosticRuntime.index + 1) / questions.length) * 100;
    const options = question.options
      .map(
        (option, index) => `
          <button class="option-button ${selected === index ? "is-selected" : ""}" type="button" data-action="diagnostic-select" data-choice="${index}">
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
          "零基础起步诊断",
          "做错不会扣任何东西，也不据此预测最终分数。",
          `${sourceBadge("original")} ${subjectTag(question.subject)}`
        )}
        <div class="modal-body">
          <div class="quiz-progress">
            <div class="quiz-progress-bar"><span style="width:${progress}%"></span></div>
            <em>${diagnosticRuntime.index + 1} / ${questions.length}</em>
          </div>
          <span class="source-badge outline">${escapeHTML(question.skill)}</span>
          ${question.passage ? `<div class="passage-box">${escapeHTML(question.passage)}</div>` : ""}
          <h3 class="question-stem">${escapeHTML(question.stem)}</h3>
          <div class="option-list">${options}</div>
        </div>
        <footer class="modal-footer">
          <button class="secondary-button" type="button" data-action="diagnostic-prev" ${diagnosticRuntime.index === 0 ? "disabled" : ""}>上一题</button>
          <button class="primary-button" type="button" data-action="${isLast ? "diagnostic-finish" : "diagnostic-next"}" ${selected === undefined ? "disabled" : ""}>
            ${isLast ? "完成并查看起点" : "下一题"}
          </button>
        </footer>
      `,
      { type: "diagnostic" }
    );
  }

  function calculateDiagnosticResult() {
    const questions = DATA.diagnostic.questions;
    const answers = diagnosticRuntime.answers;
    const english = questions.filter((question) => question.subject === "english");
    const chinese = questions.filter((question) => question.subject === "chinese");
    const englishCorrect = english.filter(
      (question) => answers[question.id] === question.answer
    ).length;
    const chineseCorrect = chinese.filter(
      (question) => answers[question.id] === question.answer
    ).length;
    const recommendations = [];

    if (englishCorrect <= 2) {
      recommendations.push("英语从字母辨认、10个起步词和“主语＋动作”开始，不先做整篇阅读。");
    } else if (englishCorrect <= 4) {
      recommendations.push("英语已经能认出少量单词，下一步重点是主谓结构和 am / is / are。");
    } else if (englishCorrect <= 6) {
      recommendations.push("英语有初步句型意识，可以加快基础词和短句训练，但仍然先补稳定度。");
    } else {
      recommendations.push("英语基础识别表现较好，可进入短句翻译和细节阅读，但不能据此预测考试分数。");
    }

    if (chineseCorrect <= 2) {
      recommendations.push("语文先从字形、名句和基础文言词开始，每天只做少量积累并及时复现。");
    } else if (chineseCorrect <= 3) {
      recommendations.push("语文已具备部分基础，可按“积累＋阅读方法＋少量默写”并行推进。");
    } else {
      recommendations.push("语文诊断表现较好，可以更快进入答题规范和篇章训练。");
    }
    recommendations.push("前两周不追求整套模考，先证明每天的任务能够独立完成并留下错题记录。");

    return {
      completedAt: new Date().toISOString(),
      englishCorrect,
      englishTotal: english.length,
      chineseCorrect,
      chineseTotal: chinese.length,
      recommendations,
    };
  }

  function finishDiagnostic() {
    if (!diagnosticRuntime) return;
    const unanswered = DATA.diagnostic.questions.some(
      (question) => diagnosticRuntime.answers[question.id] === undefined
    );
    if (unanswered) {
      showToast("还有题目没有选择。");
      return;
    }
    const result = calculateDiagnosticResult();
    state.diagnostic = {
      completed: true,
      result,
    };
    completeTask("diagnostic");
    saveState();
    renderDiagnosticResult();
    renderPage(currentPage);
    updateChrome();
  }

  function diagnosticResultContent() {
    const result = state.diagnostic.result;
    if (!result) return "";
    return `
      ${modalHeader(
        "起点诊断结果",
        "现在知道从哪里开始了",
        "结果只用于安排学习顺序，不用于预测最终分数。",
        `${sourceBadge("original")} <span class="source-badge outline">不预测分数</span>`
      )}
      <div class="modal-body">
        <div class="diagnostic-complete">
          <div class="result-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4.5 12.5 4.8 4.8L19.8 6.8"/></svg>
          </div>
          <h2>建议从基础链路开始</h2>
          <p>诊断总分低并不等于没有潜力。它能帮助我们看到：当前要先补“认词”，还是可以直接进入“句子”。</p>
          <div class="result-grid">
            <div class="result-card">
              <span>英语基础识别</span>
              <strong>${result.englishCorrect} / ${result.englishTotal}</strong>
              <p>字母、词义、句子主干、短语篇定位</p>
            </div>
            <div class="result-card">
              <span>语文基础识别</span>
              <strong>${result.chineseCorrect} / ${result.chineseTotal}</strong>
              <p>语法、文言实词、文学常识、字形与默写</p>
            </div>
          </div>
          <ol class="recommendation-list">
            ${result.recommendations.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
          </ol>
        </div>
      </div>
      <footer class="modal-footer">
        <button class="secondary-button" type="button" data-action="nav-from-modal" data-page="learn">查看学习地图</button>
        <button class="primary-button" type="button" data-action="start-first-lesson">开始第一课</button>
      </footer>`;
  }

  function renderDiagnosticResult() {
    openModal(diagnosticResultContent(), { type: "diagnostic-result" });
    diagnosticRuntime = null;
  }

  function showDiagnosticResult() {
    if (!state.diagnostic.result) {
      openDiagnostic();
      return;
    }
    openModal(diagnosticResultContent(), { type: "diagnostic-result" });
  }

  function allMixedQuestions() {
    const ids = ["en-sentence", "en-be", "en-reading", "cn-foundation"];
    return ids.flatMap((setId) => {
      const set = DATA.practiceSets[setId];
      return set.questions.map((question) => ({
        ...question,
        subject: set.subject,
        skill: set.skill,
        passage:
          set.id === "en-reading" ? set.passage : question.passage || "",
      }));
    });
  }

  function mixedQuestions() {
    const source = allMixedQuestions();
    const selected = [
      source.find((question) => question.id === "p-e01"),
      source.find((question) => question.id === "p-e02"),
      source.find((question) => question.id === "p-b01"),
      source.find((question) => question.id === "p-b04"),
      source.find((question) => question.id === "p-r01"),
      source.find((question) => question.id === "p-c01"),
      source.find((question) => question.id === "p-c04"),
      source.find((question) => question.id === "p-c05"),
    ].filter(Boolean);
    return selected;
  }

  function openQuiz(setId) {
    let questions;
    let title;
    let estimate;
    let sourceType = "原创练习";
    let taskId = "";
    let timedSeconds = null;

    if (setId === "mixed") {
      questions = mixedQuestions();
      title = "语文 · 英语基础混合小测";
      estimate = 8;
      taskId = "mini-check";
      timedSeconds = 8 * 60;
    } else {
      const set = DATA.practiceSets[setId];
      if (!set) {
        showToast("这组练习还没有接入。");
        return;
      }
      questions = set.questions.map((question) => ({
        ...question,
        subject: set.subject,
        skill: set.skill,
        passage: set.passage || question.passage || "",
      }));
      title = set.title;
      estimate = set.estimate;
      taskId = set.taskId;
    }

    clearQuizTimer();
    quizRuntime = {
      setId,
      title,
      estimate,
      sourceType,
      taskId,
      questions,
      index: 0,
      answers: {},
      finished: false,
      remaining: timedSeconds,
    };
    if (timedSeconds) startQuizTimer();
    renderQuiz();
  }

  function formatTimer(seconds) {
    const safeSeconds = Math.max(0, seconds || 0);
    return `${Math.floor(safeSeconds / 60)}:${pad(safeSeconds % 60)}`;
  }

  function startQuizTimer() {
    clearQuizTimer();
    quizTimerId = window.setInterval(() => {
      if (!quizRuntime || quizRuntime.finished || quizRuntime.remaining === null) {
        clearQuizTimer();
        return;
      }
      quizRuntime.remaining -= 1;
      const timer = modalCard.querySelector("[data-quiz-timer]");
      if (timer) {
        timer.textContent = quizRuntime.remaining > 0
          ? `剩余 ${formatTimer(quizRuntime.remaining)}`
          : "时间到，可以完成本组练习";
      }
      if (quizRuntime.remaining <= 0) {
        clearQuizTimer();
      }
    }, 1000);
  }

  function clearQuizTimer() {
    if (quizTimerId) {
      window.clearInterval(quizTimerId);
      quizTimerId = null;
    }
  }

  function renderQuiz() {
    if (!quizRuntime) return;
    if (quizRuntime.finished) {
      renderQuizResult();
      return;
    }

    const question = quizRuntime.questions[quizRuntime.index];
    const answer = quizRuntime.answers[question.id];
    const progress = ((quizRuntime.index + 1) / quizRuntime.questions.length) * 100;
    const isLast = quizRuntime.index === quizRuntime.questions.length - 1;
    const options = question.options
      .map((option, index) => {
        const isSelected = answer?.choice === index;
        const showCorrect = Boolean(answer) && question.answer === index;
        const showWrong = Boolean(answer) && isSelected && index !== question.answer;
        const classNames = [
          isSelected ? "is-selected" : "",
          showCorrect ? "is-correct" : "",
          showWrong ? "is-wrong" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const result = showCorrect ? "✓" : showWrong ? "×" : "";
        return `
          <button class="option-button ${classNames}" type="button" data-action="quiz-answer" data-choice="${index}" ${answer ? "disabled" : ""}>
            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
            <span class="option-text">${escapeHTML(option)}</span>
            <span class="option-result">${result}</span>
          </button>`;
      })
      .join("");

    const feedback = answer
      ? `
        <div class="feedback-box ${answer.correct ? "good" : "bad"}">
          <div class="feedback-title">${answer.correct ? "答对了 · 再看一次依据" : "这题需要回看"}</div>
          <p>${escapeHTML(question.explanation)}</p>
        </div>`
      : "";

    openModal(
      `
        ${modalHeader(
          `${quizRuntime.setId === "mixed" ? "限时小测" : "基础训练"} · 第${quizRuntime.index + 1}题`,
          quizRuntime.title,
          "先独立选择，再看解析。错题会自动进入错题本。",
          `${sourceBadge("original")} ${subjectTag(question.subject)}`
        )}
        <div class="modal-body">
          ${
            quizRuntime.remaining !== null
              ? `<div class="quiz-timer" data-quiz-timer>剩余 ${formatTimer(quizRuntime.remaining)}</div>`
              : ""
          }
          <div class="quiz-progress">
            <div class="quiz-progress-bar"><span style="width:${progress}%"></span></div>
            <em>${quizRuntime.index + 1} / ${quizRuntime.questions.length}</em>
          </div>
          <span class="source-badge outline">${escapeHTML(question.skill || "基础")}</span>
          ${question.passage ? `<div class="passage-box">${escapeHTML(question.passage)}</div>` : ""}
          <h3 class="question-stem">${escapeHTML(question.stem)}</h3>
          <div class="option-list">${options}</div>
          ${feedback}
        </div>
        <footer class="modal-footer">
          <span style="color:var(--ink-faint);font-size:9px">首次作答会计入正确率，重做不会虚假抬高数据。</span>
          <button class="primary-button" type="button" data-action="${isLast ? "quiz-finish" : "quiz-next"}" ${answer ? "" : "disabled"}>
            ${isLast ? "查看本组结果" : "下一题"}
          </button>
        </footer>
      `,
      { type: "quiz" }
    );
  }

  function handleQuizAnswer(choice) {
    if (!quizRuntime || quizRuntime.finished) return;
    const question = quizRuntime.questions[quizRuntime.index];
    if (quizRuntime.answers[question.id]) return;
    const correct = choice === question.answer;
    quizRuntime.answers[question.id] = { choice, correct };

    const practice = state.practice;
    const skill = question.skill || "未分类";
    if (!practice.bySkill[skill]) {
      practice.bySkill[skill] = { attempts: 0, correct: 0 };
    }
    practice.bySkill[skill].attempts += 1;
    if (correct) practice.bySkill[skill].correct += 1;

    if (!practice.firstAttemptIds.includes(question.id)) {
      practice.firstAttemptIds.push(question.id);
      practice.answeredFirst += 1;
      if (correct) practice.correctFirst += 1;
    }

    if (!correct) {
      const existing = state.mistakes.find(
        (mistake) => mistake.questionId === question.id
      );
      const mistake = {
        id: existing?.id || `m-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        questionId: question.id,
        subject: question.subject,
        skill,
        stem: question.stem,
        passage: question.passage || "",
        options: question.options,
        selectedIndex: choice,
        correctIndex: question.answer,
        explanation: question.explanation,
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
    if (!quizRuntime) return;
    quizRuntime.finished = true;
    clearQuizTimer();
    const correct = Object.values(quizRuntime.answers).filter(
      (answer) => answer.correct
    ).length;
    const total = quizRuntime.questions.length;
    state.practice.completedSets[quizRuntime.setId] = {
      date: new Date().toISOString(),
      correct,
      total,
    };
    if (quizRuntime.taskId) completeTask(quizRuntime.taskId);
    saveState();
    updateChrome();
    renderPage(currentPage);
    renderQuizResult();
  }

  function renderQuizResult() {
    if (!quizRuntime) return;
    const correct = Object.values(quizRuntime.answers).filter(
      (answer) => answer.correct
    ).length;
    const total = quizRuntime.questions.length;
    const percentage = total ? Math.round((correct / total) * 100) : 0;
    const reviewCount = total - correct;
    openModal(
      `
        ${modalHeader(
          "本组完成",
          "结果比“做了多少”更重要",
          "这次只代表当前基础训练，不是考试分数预测。",
          `${sourceBadge("original")} <span class="source-badge outline">原创练习</span>`
        )}
        <div class="modal-body">
          <div class="quiz-complete">
            <div class="result-mark">
              <strong style="font-family:var(--serif);font-size:23px">${percentage}%</strong>
            </div>
            <h2>${correct} / ${total} 题正确</h2>
            <p>${reviewCount ? `有 ${reviewCount} 题需要回看，已经自动加入错题本。先重做，再决定是否标记掌握。` : "这一组已经全部答对。下一次会在混合题或限时情境中再次检查，避免只记住原题。"}</p>
            <div class="result-grid">
              <div class="result-card">
                <span>本组正确</span>
                <strong>${correct} / ${total}</strong>
                <p>只反映当前学过的内容</p>
              </div>
              <div class="result-card">
                <span>首次作答正确率</span>
                <strong>${firstAttemptAccuracy()}%</strong>
                <p>累计有效作答</p>
              </div>
            </div>
          </div>
        </div>
        <footer class="modal-footer">
          <button class="secondary-button" type="button" data-action="reopen-quiz" data-quiz-id="${quizRuntime.setId}">再练一次</button>
          <div class="modal-footer-group">
            ${reviewCount ? `<button class="secondary-button" type="button" data-action="nav-from-modal" data-page="mistakes">查看错题</button>` : ""}
            <button class="primary-button" type="button" data-action="close-modal">回到任务</button>
          </div>
        </footer>
      `,
      { type: "quiz-result" }
    );
  }

  function retryMistake(mistakeId) {
    const mistake = state.mistakes.find((item) => item.id === mistakeId);
    if (!mistake) return;
    quizRuntime = {
      setId: `mistake-${mistake.id}`,
      title: "错题重做",
      estimate: 2,
      sourceType: "原创练习",
      taskId: "review",
      questions: [
        {
          id: mistake.questionId,
          subject: mistake.subject,
          skill: mistake.skill,
          stem: mistake.stem,
          passage: mistake.passage,
          options: mistake.options,
          answer: mistake.correctIndex,
          explanation: mistake.explanation,
        },
      ],
      index: 0,
      answers: {},
      finished: false,
      remaining: null,
    };
    renderQuiz();
  }

  function removeMistake(mistakeId) {
    state.mistakes = state.mistakes.filter((item) => item.id !== mistakeId);
    saveState();
    renderPage("mistakes");
    updateChrome();
    showToast("已移出错题本。建议之后在混合练习中再次检查。");
  }

  function toggleWordKnown(word) {
    if (state.knownWords.includes(word)) {
      state.knownWords = state.knownWords.filter((item) => item !== word);
      showToast("已标记为“再练一次”。");
    } else {
      state.knownWords.push(word);
      showToast("已记录为当前认识。");
    }
    saveState();
    const lessonModalOpen = modalLayer.dataset.modalType === "lesson";
    if (lessonModalOpen) openLesson("en-word-starter");
  }

  function speakWord(word) {
    if (!("speechSynthesis" in window)) {
      showToast("当前浏览器不支持朗读，可以直接跟读拼写。");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function resetData() {
    const confirmed = window.confirm(
      "确认清空全部诊断、学习、答题和错题记录吗？此操作无法撤销。"
    );
    if (!confirmed) return;
    state = createDefaultState();
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
        openTrustCenter();
        break;
      case "close-modal":
        closeModal();
        break;
      case "set-mode": {
        const minutes = Number(trigger.dataset.minutes);
        if (![45, 90, 180].includes(minutes)) return;
        ensureDayState().mode = minutes;
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
      case "show-diagnostic-result":
        showDiagnosticResult();
        break;
      case "learn-subject":
        learnSubject = trigger.dataset.subject;
        renderPage("learn");
        break;
      case "open-lesson":
        openLesson(trigger.dataset.lessonId);
        break;
      case "mark-lesson-read":
        markLessonRead(trigger.dataset.lessonId);
        break;
      case "start-quiz":
        openQuiz(trigger.dataset.quizId);
        break;
      case "diagnostic-select":
        if (!diagnosticRuntime) return;
        diagnosticRuntime.answers[
          DATA.diagnostic.questions[diagnosticRuntime.index].id
        ] = Number(trigger.dataset.choice);
        renderDiagnostic();
        break;
      case "diagnostic-prev":
        if (diagnosticRuntime && diagnosticRuntime.index > 0) {
          diagnosticRuntime.index -= 1;
          renderDiagnostic();
        }
        break;
      case "diagnostic-next":
        if (
          diagnosticRuntime &&
          diagnosticRuntime.index < DATA.diagnostic.questions.length - 1
        ) {
          diagnosticRuntime.index += 1;
          renderDiagnostic();
        }
        break;
      case "diagnostic-finish":
        finishDiagnostic();
        break;
      case "start-first-lesson":
        closeModal();
        setPage("learn");
        learnSubject = "english";
        openLesson("en-alphabet");
        break;
      case "nav-from-modal": {
        const page = trigger.dataset.page;
        closeModal();
        setPage(page);
        break;
      }
      case "quiz-answer":
        handleQuizAnswer(Number(trigger.dataset.choice));
        break;
      case "quiz-next":
        if (quizRuntime && quizRuntime.index < quizRuntime.questions.length - 1) {
          quizRuntime.index += 1;
          renderQuiz();
        }
        break;
      case "quiz-finish":
        finishQuiz();
        break;
      case "reopen-quiz":
        openQuiz(trigger.dataset.quizId);
        break;
      case "retry-mistake":
        retryMistake(trigger.dataset.mistakeId);
        break;
      case "remove-mistake":
        removeMistake(trigger.dataset.mistakeId);
        break;
      case "toggle-known":
        toggleWordKnown(trigger.dataset.word);
        break;
      case "speak-word":
        speakWord(trigger.dataset.word);
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
    if (event.key === "Escape" && !modalLayer.hidden) {
      closeModal();
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = loadState();
    renderPage(currentPage);
    updateChrome();
    showToast("已在另一页面更新学习记录。");
  });

  ensureDayState();
  updateChrome();
  setPage("today", { scroll: false });
})();
