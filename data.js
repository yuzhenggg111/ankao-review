window.APP_DATA = {
  meta: {
    appName: "皖本复习台",
    version: "0.1",
    versionLabel: "内容样板版",
    targetScore: 240,
    estimatedExamDate: "2027-04-17",
    estimateNote: "按你提供的“4月中旬”暂估，正式时间以官方公告为准。",
    outlineSource: "你提供的《安徽省普通高校专升本公共课考试说明（修订）》PDF，共16页。",
    sourceRule:
      "本版只写入可依据大纲或可由基础常识核对的学习内容。所有练习均标明为原创练习，不冒充历年真题。",
  },

  reliabilityLevels: [
    {
      key: "verified",
      label: "已核对",
      description: "原文、答案和解释均经过来源核对。",
    },
    {
      key: "outline",
      label: "依据大纲",
      description: "内容来自本轮已读取的考试说明，没有超出大纲作能力判断。",
    },
    {
      key: "original",
      label: "原创练习",
      description: "为诊断或巩固基础编写，不是历年真题，也不用于推测命题频率。",
    },
    {
      key: "pending",
      label: "待核验",
      description: "尚未获得可靠原卷或答案，不会进入正式训练。",
    },
  ],

  sourceStatus: [
    {
      item: "大学语文考试说明",
      detail: "已读取本地16页考试说明，确认满分150分、120分钟、题型及15篇背诵篇目。",
      status: "outline",
    },
    {
      item: "英语考试说明",
      detail: "已确认满分150分、90分钟及五类题型的分值结构。",
      status: "outline",
    },
    {
      item: "2027年正式考试通知",
      detail: "尚未取得正式公告。当前考试日期仅用于倒计时估算。",
      status: "pending",
    },
    {
      item: "统一考试历年真题",
      detail: "尚未导入可靠原卷。后续将逐年登记来源、题号、答案出处和核验状态。",
      status: "pending",
    },
    {
      item: "历年真题答案与解析",
      detail: "需与原卷交叉核对；冲突内容会进入待核验区，不用于正式训练。",
      status: "pending",
    },
    {
      item: "本版诊断与练习",
      detail: "全部为原创基础题，用于判断学习起点，不对外宣称是真题。",
      status: "original",
    },
  ],

  syllabus: {
    chinese: {
      name: "大学语文",
      score: 150,
      minutes: 120,
      questionTypes: ["选择题", "填空题", "阅读分析题", "写作题"],
      summary:
        "考查语言文字、文学文化、文言阅读、现代文阅读、实用文写作和文学写作。",
      recitationWorks: [
        { title: "季氏将伐颛臾", author: "《论语》", group: "古文与论说" },
        { title: "上善若水", author: "《老子》", group: "古文与论说" },
        { title: "郑伯克段于鄢", author: "《左传》", group: "古文与论说" },
        { title: "种树郭橐驼传", author: "柳宗元", group: "古文与论说" },
        { title: "前赤壁赋", author: "苏轼", group: "辞赋与散文" },
        { title: "氓", author: "《诗经》", group: "诗歌" },
        { title: "短歌行（对酒当歌）", author: "曹操", group: "诗歌" },
        { title: "饮酒（结庐在人境）", author: "陶渊明", group: "诗歌" },
        { title: "山居秋暝", author: "王维", group: "诗歌" },
        { title: "行路难（金樽清酒斗十千）", author: "李白", group: "诗歌" },
        { title: "蜀相", author: "杜甫", group: "诗歌" },
        { title: "虞美人（春花秋月何时了）", author: "李煜", group: "词曲" },
        { title: "水调歌头（明月几时有）", author: "苏轼", group: "词曲" },
        { title: "水龙吟（登建康赏心亭）", author: "辛弃疾", group: "词曲" },
        { title: "天净沙·秋思", author: "马致远", group: "词曲" },
      ],
    },
    english: {
      name: "英语",
      score: 150,
      minutes: 90,
      structure: [
        { name: "词汇与结构", count: "15题", score: 30, target: 24 },
        { name: "完形填空", count: "10题", score: 20, target: 16 },
        { name: "阅读理解", count: "20题", score: 40, target: 32 },
        { name: "句子翻译", count: "6题", score: 30, target: 24 },
        { name: "短文写作", count: "1题", score: 30, target: 24 },
      ],
      summary:
        "词汇和语法是共同基础，最终落到阅读、翻译和写作。零基础阶段先建立句子意识，再进入整篇训练。",
    },
  },

  diagnostic: {
    id: "baseline-v01",
    title: "零基础起步诊断",
    subtitle: "不用追求做对，做错恰好能告诉我们从哪里开始。",
    estimate: "约15分钟",
    sourceType: "原创诊断",
    questions: [
      {
        id: "d-e01",
        subject: "english",
        skill: "英文字母",
        difficulty: 1,
        stem: "下列哪一项是小写字母 b？",
        options: ["d", "b", "p", "q"],
        answer: 1,
        explanation: "b 与 d、p、q 的字形方向不同，先辨认清楚能减少后面记词时的混淆。",
      },
      {
        id: "d-e02",
        subject: "english",
        skill: "基础词义",
        difficulty: 1,
        stem: "book 的意思最接近：",
        options: ["书", "门", "水", "朋友"],
        answer: 0,
        explanation: "book 表示“书”。这类高频具体名词会作为第一批起步词。",
      },
      {
        id: "d-e03",
        subject: "english",
        skill: "主语识别",
        difficulty: 1,
        stem: "在句子 Tom reads. 中，做动作的人是谁？",
        options: ["Tom", "reads", "两个词都是动作"],
        answer: 0,
        explanation: "Tom 是动作的执行者，也就是主语；reads 表示“读”。",
      },
      {
        id: "d-e05",
        subject: "english",
        skill: "be动词",
        difficulty: 1,
        stem: "选择最合适的词：I ___ a student.",
        options: ["am", "is", "are", "be"],
        answer: 0,
        explanation: "一般现在时中，I 与 am 搭配：I am a student.",
      },
      {
        id: "d-e06",
        subject: "english",
        skill: "名词复数",
        difficulty: 2,
        stem: "选择正确形式：two ___",
        options: ["book", "books", "a book"],
        answer: 1,
        explanation: "数量 two 后面通常用复数形式 books。",
      },
      {
        id: "d-e07",
        subject: "english",
        skill: "短文找信息",
        difficulty: 2,
        stem: "阅读：Amy has a blue bag. What color is the bag?",
        passage: "Amy has a blue bag.",
        options: ["Red", "Blue", "Green"],
        answer: 1,
        explanation: "题干问颜色，原文直接给出 blue，所以选 Blue。",
      },
      {
        id: "d-e08",
        subject: "english",
        skill: "基础翻译",
        difficulty: 2,
        stem: "“我喜欢音乐。”最合适的英文表达是：",
        options: ["I like music.", "I music like.", "Music likes I."],
        answer: 0,
        explanation: "英语通常先说动作发出者，再说动作和对象：I + like + music.",
      },
      {
        id: "d-c01",
        subject: "chinese",
        skill: "汉语语法",
        difficulty: 1,
        stem: "下列句子表达规范的是：",
        options: [
          "通过这次活动，使我收获很多。",
          "通过这次活动，我收获很多。",
          "通过这次活动，收获很多我。",
        ],
        answer: 1,
        explanation: "“通过……使……”会造成主语缺失。删去“使”后，句子有明确主语“我”。",
      },
      {
        id: "d-c02",
        subject: "chinese",
        skill: "文言实词",
        difficulty: 2,
        stem: "“老翁逾墙走”中的“走”最接近哪一项？",
        options: ["走路", "跑", "离开"],
        answer: 1,
        explanation: "文言中“走”常表示“跑”。学习文言词时不能只按现代汉语的常用义理解。",
      },
      {
        id: "d-c03",
        subject: "chinese",
        skill: "文学常识",
        difficulty: 1,
        stem: "《背影》的作者是：",
        options: ["朱自清", "鲁迅", "老舍"],
        answer: 0,
        explanation: "《背影》作者是朱自清，属于大纲要求掌握的主要作家作品常识。",
      },
      {
        id: "d-c04",
        subject: "chinese",
        skill: "名句默写",
        difficulty: 1,
        stem: "补全名句：但愿人长久，____。",
        options: ["千里共婵娟", "天涯共此时", "明月何时照我还"],
        answer: 0,
        explanation: "出自苏轼《水调歌头》，也是大纲列出的背诵篇目之一。",
      },
      {
        id: "d-c05",
        subject: "chinese",
        skill: "字形辨析",
        difficulty: 2,
        stem: "下列词语字形全部正确的是：",
        options: ["再接再励、迫不急待", "再接再厉、迫不及待", "再接再厉、迫不急待"],
        answer: 1,
        explanation: "正确写法是“再接再厉”和“迫不及待”。这两个词适合作为第一批字形易错积累。",
      },
    ],
  },

  wordBank: [
    {
      word: "book",
      phonetic: "/bʊk/",
      meaning: "书",
      sentence: "This is a book.",
      sentenceMeaning: "这是一本书。",
    },
    {
      word: "student",
      phonetic: "/ˈstjuːdnt/",
      meaning: "学生",
      sentence: "I am a student.",
      sentenceMeaning: "我是一名学生。",
    },
    {
      word: "teacher",
      phonetic: "/ˈtiːtʃə/",
      meaning: "教师",
      sentence: "She is a teacher.",
      sentenceMeaning: "她是一名教师。",
    },
    {
      word: "school",
      phonetic: "/skuːl/",
      meaning: "学校",
      sentence: "We go to school.",
      sentenceMeaning: "我们去学校。",
    },
    {
      word: "like",
      phonetic: "/laɪk/",
      meaning: "喜欢",
      sentence: "I like music.",
      sentenceMeaning: "我喜欢音乐。",
    },
    {
      word: "read",
      phonetic: "/riːd/",
      meaning: "读；阅读",
      sentence: "Tom reads every day.",
      sentenceMeaning: "汤姆每天阅读。",
    },
    {
      word: "music",
      phonetic: "/ˈmjuːzɪk/",
      meaning: "音乐",
      sentence: "She likes music.",
      sentenceMeaning: "她喜欢音乐。",
    },
    {
      word: "friend",
      phonetic: "/frend/",
      meaning: "朋友",
      sentence: "Lily is my friend.",
      sentenceMeaning: "莉莉是我的朋友。",
    },
    {
      word: "happy",
      phonetic: "/ˈhæpi/",
      meaning: "高兴的",
      sentence: "I am happy today.",
      sentenceMeaning: "我今天很高兴。",
    },
    {
      word: "color",
      phonetic: "/ˈkʌlə/",
      meaning: "颜色",
      sentence: "What color is your bag?",
      sentenceMeaning: "你的包是什么颜色？",
    },
  ],

  lessons: {
    "en-alphabet": {
      id: "en-alphabet",
      subject: "english",
      title: "26个字母：先分清形状，再听准名称",
      kicker: "字母起步",
      duration: 15,
      sourceType: "原创学习卡",
      level: "零基础",
      goal: "把容易混淆的字母形状分开，为后面认词、拼写和朗读打基础。",
      examLink: "英语试题的基础单位是单词，而单词首先需要准确辨认字母。",
      type: "alphabet",
      sections: [
        {
          heading: "最容易混淆的四组",
          body:
            "先盯住方向：b 的肚子在右边，d 的肚子在左边；p 的腹部在下，q 的腹部也在下但尾巴方向不同。不要只凭整体感觉猜。",
        },
        {
          heading: "五个元音字母",
          body:
            "A、E、I、O、U 是五个元音字母，其余字母是辅音字母。现在只需认识分类，不需要马上掌握所有读音规则。",
        },
        {
          heading: "学习标准",
          body:
            "看到大写能想到对应小写，看到小写能读出来，并能在单词里指出正确字母。这个阶段不要求一次记住所有音标。",
        },
      ],
    },
    "en-word-starter": {
      id: "en-word-starter",
      subject: "english",
      title: "第一批10个基础词",
      kicker: "词汇起步",
      duration: 15,
      sourceType: "原创学习卡",
      level: "零基础",
      goal: "先把具体、常用、能立刻组成短句的词认熟。",
      examLink: "词汇是词汇与结构、完形、阅读、翻译和写作的共同起点。",
      type: "words",
      steps: [
        "先看英文和中文，不求一次背会。",
        "点“朗读”跟读，再把单词放进完整句子。",
        "最后只看英文，尝试说出中文；不确定就标记“再练一次”。",
      ],
    },
    "en-sentence-basics": {
      id: "en-sentence-basics",
      subject: "english",
      title: "一句话看懂：谁 + 做什么 / 是什么",
      kicker: "句子主干",
      duration: 20,
      sourceType: "原创讲解",
      level: "零基础",
      goal: "能在一句简单英文里找到动作发出者、动作和对象。",
      examLink: "词汇与结构、阅读理解、句子翻译，都要求先看清句子主干。",
      type: "lesson",
      sections: [
        {
          heading: "先记住一个最小框架",
          body:
            "英语简单句通常先交代“谁”，再交代“做什么”或“是什么”。不要一开始逐词硬翻译，要先找到动作。",
        },
        {
          heading: "两类最常用句子",
          body:
            "第一类表示动作：Tom reads. Lily likes music. 第二类表示身份或状态：I am a student. She is happy.",
          examples: [
            {
              source: "Tom reads.",
              analysis: "Tom 是动作发出者，reads 是动作。",
            },
            {
              source: "Lily likes music.",
              analysis: "Lily → likes → music，分别是“谁 → 做什么 → 对什么”。",
            },
            {
              source: "She is happy.",
              analysis: "She 是说明对象，is happy 说明她的状态。",
            },
          ],
        },
        {
          heading: "做题时先问三个问题",
          body:
            "这句话在说谁？它在做什么？动作落在谁或什么上？如果找不到动作，再判断它是不是在说明“是什么、怎么样”。",
        },
        {
          heading: "最常见的中式英语错误",
          body:
            "不能说 I very happy。表示状态时需要 be 动词：I am happy. 中文可以省略“是”，英语一般不能省。",
        },
      ],
      practiceSetId: "en-sentence",
    },
    "en-be-verb": {
      id: "en-be-verb",
      subject: "english",
      title: "am / is / are：先搭好最简单的状态句",
      kicker: "be 动词",
      duration: 15,
      sourceType: "原创讲解",
      level: "零基础",
      goal: "记住 am、is、are 与主语的基本搭配，并能说清身份和状态。",
      examLink: "be 动词是词汇与结构、翻译、写作中的高频基础结构。",
      type: "lesson",
      sections: [
        {
          heading: "一张最小表",
          body:
            "I → am；he / she / it / 单数名词 → is；you / we / they / 复数名词 → are。先掌握这条搭配，再扩展时态。",
          examples: [
            {
              source: "I am a student.",
              analysis: "I 与 am 搭配。",
            },
            {
              source: "He is my friend.",
              analysis: "he 是单数，用 is。",
            },
            {
              source: "They are students.",
              analysis: "they 表示复数，用 are；后面的 student 也用复数。",
            },
          ],
        },
        {
          heading: "先别背整张be动词表",
          body:
            "这一阶段只做一般现在时的肯定句。等能把 I am、she is、they are 说顺，再进入否定句和疑问句。",
        },
      ],
      practiceSetId: "en-be",
    },
    "en-reading-evidence": {
      id: "en-reading-evidence",
      subject: "english",
      title: "阅读第一步：先找题目要的那一句",
      kicker: "阅读找证据",
      duration: 20,
      sourceType: "原创方法课",
      level: "零基础",
      goal: "遇到细节题时，先回原文定位，不凭印象整段猜。",
      examLink: "阅读理解20题共40分，要求辨别事实细节、主旨、词义、推断和态度。",
      type: "lesson",
      sections: [
        {
          heading: "零基础做阅读的固定动作",
          body:
            "先看题干里的关键词，再回短文找相同或相近的词。找到那一句后，答案通常就在附近，不要把整段只凭印象翻译一遍。",
          examples: [
            {
              source: "Lily has a red bag. She likes music.",
              analysis: "题目问 What color is the bag? 关键词是 bag 和 color，回到原文能找到 red。",
            },
            {
              source: "Tom is a student. He reads every day.",
              analysis: "题目问 Who reads every day? 关键词 reads，原文对应 He，而 He 指代 Tom。",
            },
          ],
        },
        {
          heading: "题目和原文不一定用同一个词",
          body:
            "有时题目会把 red bag 改成 the color of the bag。先把人物、物品、动作和时间找出来，再看表达是否换了一种说法。",
        },
        {
          heading: "不要用常识代替原文",
          body:
            "即使你觉得某件事在生活中更常见，也要以短文明确写出的信息为准。",
        },
      ],
      practiceSetId: "en-reading",
    },
    "cn-recitation": {
      id: "cn-recitation",
      subject: "chinese",
      title: "15篇背诵：先按文体分组",
      kicker: "背诵起步",
      duration: 15,
      sourceType: "依据大纲",
      level: "起步",
      goal: "知道背诵范围，并建立第一轮“先理解、后默写”的复习方法。",
      examLink: "大纲明确要求默写常见的名篇名句，并附有15篇背诵篇目。",
      type: "recitation",
      sections: [
        {
          heading: "为什么先分组",
          body:
            "15篇一次性混在一起会很难形成记忆结构。先按古文、辞赋、诗歌、词曲分组，每次只处理一个小范围。",
        },
        {
          heading: "默写不要只看不写",
          body:
            "每句至少经历三轮：看着理解一遍，遮住关键词说一遍，最后完整写一遍。写错的字单独进入易错字记录。",
        },
      ],
      sampleQuote: {
        text: "空山新雨后，天气晚来秋。",
        source: "王维《山居秋暝》",
        prompt: "先轻声读两遍，再遮住“新雨后”和“晚来秋”复述。",
      },
    },
    "cn-classical-zou": {
      id: "cn-classical-zou",
      subject: "chinese",
      title: "文言实词：一个“走”字为什么不是走路",
      kicker: "文言实词",
      duration: 15,
      sourceType: "原创讲解",
      level: "起步",
      goal: "建立古今词义不同的意识，不再直接把现代意思套进文言句子。",
      examLink: "大纲要求识记理解常用文言实词、虚词，并完成简单文言语句翻译。",
      type: "lesson",
      sections: [
        {
          heading: "先说结论",
          body:
            "“走”在文言中常表示“跑”，而现代汉语中的“走”通常表示步行。阅读文言文时，一旦发现直译不通，就要考虑古今异义。",
        },
        {
          heading: "放进语境判断",
          body:
            "“老翁逾墙走”中，老人翻墙之后最合理的动作是“跑”。“逾”是越过，“走”是跑，整句意思是老人翻墙逃走。",
        },
        {
          heading: "学习方法",
          body:
            "不要孤立抄“走＝跑”。把词放回原句，先直译，再根据动作是否合理调整。高频实词后续会做成可复习词卡。",
        },
      ],
      practiceSetId: "cn-foundation",
    },
    "cn-modern-reading": {
      id: "cn-modern-reading",
      subject: "chinese",
      title: "现代文阅读：先分级，再概括",
      kicker: "阅读方法",
      duration: 20,
      sourceType: "原创方法课",
      level: "起步",
      goal: "学会先看段落关系，再用一句包含对象和重点的话概括。",
      examLink: "大纲要求正确分析文章逻辑层次，理解并概括段落大意和作品主旨。",
      type: "lesson",
      sections: [
        {
          heading: "先读结构，不急着找修辞",
          body:
            "拿到文章先给段落编号，判断每段是在提出问题、举例子、解释原因，还是总结。结构没看清之前，直接套“用了什么手法”容易答偏。",
        },
        {
          heading: "概括句模板",
          body:
            "一个稳妥的概括通常要包含“谁/什么对象 + 发生了什么/说明了什么 + 结果或态度”。先保证信息完整，再追求语言漂亮。",
          examples: [
            {
              source: "作者写童年时借书、抄书、读书的三段经历。",
              analysis: "对象是作者，内容是三段读书经历，核心落在“读书”。概括时不能只写“小时候”。",
            },
          ],
        },
      ],
    },
  },

  practiceSets: {
    "en-sentence": {
      id: "en-sentence",
      subject: "english",
      title: "句子主干练习",
      description: "识别谁在做、做什么，并完成最简单的英文表达。",
      estimate: 10,
      sourceType: "原创练习",
      skill: "英语句子主干",
      taskId: "sentence-practice",
      questions: [
        {
          id: "p-e01",
          stem: "在句子 Amy likes apples. 中，动作发出者是谁？",
          options: ["Amy", "likes", "apples"],
          answer: 0,
          explanation: "Amy 发出“喜欢”的动作，是主语。",
        },
        {
          id: "p-e02",
          stem: "选择正确形式：He ___ my friend.",
          options: ["am", "is", "are"],
          answer: 1,
          explanation: "he 是单数主语，be 动词用 is。",
        },
        {
          id: "p-e03",
          stem: "选择正确形式：They ___ students.",
          options: ["am", "is", "are"],
          answer: 2,
          explanation: "they 是复数主语，be 动词用 are，student 也变成复数 students。",
        },
        {
          id: "p-e04",
          stem: "哪一句英文结构完整、表达正确？",
          options: ["She happy.", "She is happy.", "She very happy."],
          answer: 1,
          explanation: "说明状态时需要 be 动词。正确表达是 She is happy.",
        },
        {
          id: "p-e05",
          stem: "选择正确形式：We ___ music.",
          options: ["like", "likes", "is like"],
          answer: 0,
          explanation: "we 是复数主语，一般现在时用动词原形 like。",
        },
        {
          id: "p-e06",
          stem: "“她是一名教师。”最合适的英文表达是：",
          options: ["She is a teacher.", "She a teacher.", "She teacher is."],
          answer: 0,
          explanation: "先放主语 She，再接 be 动词 is 和表语 a teacher。",
        },
      ],
    },
    "en-be": {
      id: "en-be",
      subject: "english",
      title: "am / is / are 定向练习",
      description: "只练一条规则：主语和 be 动词的搭配。",
      estimate: 8,
      sourceType: "原创练习",
      skill: "英语 be 动词",
      taskId: "sentence-practice",
      questions: [
        {
          id: "p-b01",
          stem: "I ___ ready.",
          options: ["am", "is", "are"],
          answer: 0,
          explanation: "I 与 am 搭配。",
        },
        {
          id: "p-b02",
          stem: "The book ___ new.",
          options: ["am", "is", "are"],
          answer: 1,
          explanation: "The book 是单数，be 动词用 is。",
        },
        {
          id: "p-b03",
          stem: "You ___ my friend.",
          options: ["am", "is", "are"],
          answer: 2,
          explanation: "you 与 are 搭配。",
        },
        {
          id: "p-b04",
          stem: "The students ___ in the classroom.",
          options: ["am", "is", "are"],
          answer: 2,
          explanation: "The students 是复数，be 动词用 are。",
        },
        {
          id: "p-b05",
          stem: "She ___ a teacher.",
          options: ["am", "is", "are"],
          answer: 1,
          explanation: "she 是单数，be 动词用 is。",
        },
      ],
    },
    "en-reading": {
      id: "en-reading",
      subject: "english",
      title: "阅读找证据练习",
      description: "不用猜整段意思，先抓人物、物品、颜色和动作。",
      estimate: 8,
      sourceType: "原创练习",
      skill: "英语细节定位",
      taskId: "reading-practice",
      passage:
        "Lily is a student. She has a red bag. Tom is her friend. He has two books.",
      questions: [
        {
          id: "p-r01",
          stem: "What color is Lily's bag?",
          options: ["Red", "Blue", "Black"],
          answer: 0,
          explanation: "定位到 She has a red bag，颜色是 red。",
        },
        {
          id: "p-r02",
          stem: "Who is Lily's friend?",
          options: ["Amy", "Tom", "Lily"],
          answer: 1,
          explanation: "原文说 Tom is her friend，her 指代 Lily。",
        },
        {
          id: "p-r03",
          stem: "How many books does Tom have?",
          options: ["One", "Two", "Three"],
          answer: 1,
          explanation: "原文最后一句是 He has two books.",
        },
      ],
    },
    "cn-foundation": {
      id: "cn-foundation",
      subject: "chinese",
      title: "语文基础起步练习",
      description: "字形、句式、文言常识和背诵各取一个最小点。",
      estimate: 10,
      sourceType: "原创练习",
      skill: "语文基础积累",
      taskId: "recitation-practice",
      questions: [
        {
          id: "p-c01",
          stem: "下列词语字形全部正确的是：",
          options: ["再接再厉、迫不及待", "再接再励、迫不及待", "再接再厉、迫不急待"],
          answer: 0,
          explanation: "“厉”不能写成“励”，“及”不能写成“急”。",
        },
        {
          id: "p-c02",
          stem: "下列句子表达规范、成分完整的是：",
          options: [
            "通过这次活动，我明白了合作的重要性。",
            "通过这次活动，使我明白了合作的重要性。",
            "通过这次活动，明白了合作的重要性我。",
          ],
          answer: 0,
          explanation:
            "第一句有明确主语“我”和谓语“明白了”；第二句同时使用“通过”和“使”，会造成主语缺失。",
        },
        {
          id: "p-c03",
          stem: "“老翁逾墙走”中，“逾”的意思是：",
          options: ["越过", "等待", "寻找"],
          answer: 0,
          explanation: "“逾”在这里是越过。整句可理解为老人翻墙逃走。",
        },
        {
          id: "p-c04",
          stem: "补全名句：采菊东篱下，____。",
          options: ["悠然见南山", "千里共婵娟", "江春入旧年"],
          answer: 0,
          explanation: "出自陶渊明《饮酒（结庐在人境）》，属于大纲背诵篇目。",
        },
        {
          id: "p-c05",
          stem: "“月亮像一条银色的小河。”使用的修辞手法是：",
          options: ["比喻", "借代", "夸张"],
          answer: 0,
          explanation: "把月亮比作银色的小河，具有明确的本体和喻体，属于比喻。",
        },
        {
          id: "p-c06",
          stem: "《水调歌头（明月几时有）》的作者是：",
          options: ["苏轼", "辛弃疾", "李煜"],
          answer: 0,
          explanation: "《水调歌头（明月几时有）》是苏轼的作品。",
        },
      ],
    },
  },

  knowledge: {
    english: [
      {
        title: "起步层：先把英文看成完整句子",
        note: "当前最优先",
        nodes: [
          { id: "alphabet", title: "26个字母与易混字形", lessonId: "en-alphabet", status: "now" },
          { id: "letters", title: "字母与基础词", lessonId: "en-word-starter", status: "now" },
          { id: "sentence", title: "主语、动作和对象", lessonId: "en-sentence-basics", status: "now" },
          { id: "be", title: "am / is / are", lessonId: "en-be-verb", status: "now" },
        ],
      },
      {
        title: "基础层：零散词汇变成可用的句子",
        note: "下一步接入",
        nodes: [
          { id: "noun", title: "名词与单复数", status: "route" },
          { id: "tense", title: "一般现在时", status: "route" },
          { id: "translate", title: "短句翻译", status: "route" },
          { id: "evidence", title: "阅读定位与细节题", lessonId: "en-reading-evidence", status: "now" },
        ],
      },
      {
        title: "考试层：五类题型形成闭环",
        note: "题库核验后扩展",
        nodes: [
          { id: "vocab", title: "词汇与结构", status: "route" },
          { id: "cloze", title: "完形填空", status: "route" },
          { id: "reading", title: "阅读理解", status: "route" },
          { id: "translation", title: "句子翻译", status: "route" },
          { id: "writing", title: "短文写作", status: "route" },
        ],
      },
    ],
    chinese: [
      {
        title: "起步层：先建积累和文言意识",
        note: "当前最优先",
        nodes: [
          { id: "characters", title: "字形与易错词", status: "now" },
          { id: "classical-word", title: "文言实词入门", lessonId: "cn-classical-zou", status: "now" },
          { id: "recite", title: "15篇背诵总览", lessonId: "cn-recitation", status: "now" },
        ],
      },
      {
        title: "阅读层：从读清楚到答准确",
        note: "下一步接入",
        nodes: [
          { id: "logic", title: "段落层次与概括", lessonId: "cn-modern-reading", status: "now" },
          { id: "rhetoric", title: "修辞与作用", status: "route" },
          { id: "language", title: "语言赏析", status: "route" },
          { id: "classical-sentence", title: "特殊句式与翻译", status: "route" },
        ],
      },
      {
        title: "输出层：从规范句到完整文章",
        note: "题库核验后扩展",
        nodes: [
          { id: "literature", title: "文学文化常识", status: "route" },
          { id: "practical-writing", title: "实用文写作", status: "route" },
          { id: "essay", title: "800字文学写作", status: "route" },
        ],
      },
    ],
  },

  taskTemplates: {
    diagnostic: {
      id: "diagnostic",
      subject: "both",
      title: "完成零基础起点诊断",
      detail: "12道短题，只判断从哪里开始，不计算预测分数。",
      duration: 15,
      action: { type: "diagnostic" },
    },
    alphabet: {
      id: "alphabet",
      subject: "english",
      title: "认清字母与易混字形",
      detail: "听字母名称，分清 b/d/p/q，再认识五个元音字母。",
      duration: 15,
      action: { type: "lesson", id: "en-alphabet" },
    },
    words: {
      id: "words",
      subject: "english",
      title: "认识第一批基础词",
      detail: "看词义、听朗读，把词放进完整句子。",
      duration: 10,
      action: { type: "lesson", id: "en-word-starter" },
    },
    sentenceLesson: {
      id: "sentence-lesson",
      subject: "english",
      title: "看懂“谁 + 做什么 / 是什么”",
      detail: "先找动作发出者，再判断动作或状态。",
      duration: 20,
      action: { type: "lesson", id: "en-sentence-basics" },
    },
    sentencePractice: {
      id: "sentence-practice",
      subject: "english",
      title: "做6道句子主干练习",
      detail: "每题都会给出错误原因，不只显示对错。",
      duration: 20,
      action: { type: "quiz", id: "en-sentence" },
    },
    recitation: {
      id: "recitation",
      subject: "chinese",
      title: "认识15篇背诵范围",
      detail: "只处理一个小范围，建立“理解后默写”的方法。",
      duration: 15,
      action: { type: "lesson", id: "cn-recitation" },
    },
    reading: {
      id: "reading-practice",
      subject: "english",
      title: "练一次阅读定位",
      detail: "关键词回到原文，找到证据后再选答案。",
      duration: 15,
      action: { type: "quiz", id: "en-reading" },
    },
    review: {
      id: "review",
      subject: "both",
      title: "复习旧错与昨日内容",
      detail: "先做错题，再总结今天最小的一条收获。",
      duration: 10,
      action: { type: "mistakes" },
    },
    miniCheck: {
      id: "mini-check",
      subject: "both",
      title: "完成一次阶段小测",
      detail: "语文与英语基础混合检测，限时完成。",
      duration: 30,
      action: { type: "quiz", id: "mixed" },
    },
  },

  planModes: {
    45: ["alphabet", "sentenceLesson", "review"],
    90: ["alphabet", "sentenceLesson", "sentencePractice", "review"],
    180: [
      "alphabet",
      "words",
      "sentenceLesson",
      "sentencePractice",
      "recitation",
      "reading",
      "review",
    ],
  },
};
