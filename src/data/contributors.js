const CONTRIBUTORS_BY_YEAR = {
  2026: [
    '123123213weqw',
    '3296442201',
    'Adria0615',
    'anapplebeee',
    'cedric-villemain',
    'db-nikhil',
    'elodiefb',
    'enkilee',
    'gaoxueyu',
    'grant-zhou',
    'hanjianqiao',
    'jerome-peng',
    'jiaoshuntian',
    'leiyanliang',
    'liangxiangyu',
    'liketoochao',
    'liuxiaohui',
    'liyuan',
    'messere1',
    'movead123',
    'oreo-yang',
    'panzhenhao',
    'pierre-forstmann',
    'rophy',
    'Shawn-Yan',
    'shizhuoyan',
    'Sixian-Gao',
    'steven-niu',
    'suige',
    'taozheng',
    'tian1220A',
    'xiaoyu509',
    'xinjie-lyu',
    'yasir-hussain-shah',
    'yes7rose',
    'z20081120087',
    'zhangzhe',
    'zhaofawei',
  ],
  2025: [
    'Alex-Guo',
    'Amberwww1',
    'Bei-Fu',
    'Carlos-Chong',
    'Cary-Huang',
    'Cedric-Villemain',
    'Dapeng-Wang',
    'Denis-Lussier',
    'Fawei-Zhao',
    'Gavin-LYU',
    'Ge-Sui',
    'Grant-Zhou',
    'Hulin-Ji',
    'Imran-Zaheer',
    'JiaoShuntian',
    'Kang-Wang',
    'Lily-Wang',
    'Martin-Gerhardy',
    'Mingran-Feng',
    'Oreo-Yang',
    'Pedro-Lopez',
    'RRRRhl',
    'Renli-Zou',
    'Rophy-Tsai',
    'Ruike-Sun',
    'Ruohang-Feng',
    'Shaolin-Chu',
    'Shawn-Yan',
    'Shoubo-Wang',
    'Shuisen-Tong',
    'Steven-Niu',
    'Xiangyu-Liang',
    'Xiaohui-Liu',
    'Xueyu-Gao',
    'Yanliang-Lei',
    'Yasir-Hussain-Shah',
    'Yuan-Li',
    'Zhe-Zhang',
    'Zheng-Tao',
    'Zhenhao-Pan',
    'Zhibin-Wang',
    'Zhuoyan-Shi',
    'caffiendo',
    'ccwxl',
    'flyingbeecd',
    'huchangqiqi',
    'jerome-peng',
    'luss',
    'omstack',
    'otegami',
    'shangwei007',
    'shlei6067',
    'sjw1933',
    'tiankongbuqi',
    'xuexiaoganghs',
    'yangchunwanwusheng',
  ],
};

const CONTRIBUTOR_ALIASES = {
  gaoxueyu: 'xueyugao',
  leiyanliang: 'yanlianglei',
  liangxiangyu: 'xiangyuliang',
  liuxiaohui: 'xiaohuiliu',
  liyuan: 'yuanli',
  panzhenhao: 'zhenhaopan',
  rophy: 'rophytsai',
  shizhuoyan: 'zhuoyanshi',
  suige: 'gesui',
  taozheng: 'zhengtao',
  zhaofawei: 'faweizhao',
  zhangzhe: 'zhezhang',
  denislussier: 'luss',
  beifu: 'elodiefb',
  xinjielyu: 'gavinlyu',
  sixiangao: 'zuinuan123',
};

const CONTRIBUTOR_OVERRIDES = {
  adria0615: { name: '@Adria0615', github: 'Adria0615' },
  alexguo: { name: 'Alex Guo', github: 'Chrosea' },
  carloschong: { github: 'Carlos-Chong200' },
  caryhuang: { github: 'caryhuang' },
  cedricvillemain: { name: 'Cedric Villemain', github: 'c2main' },
  dapengwang: { name: 'Dapeng Wang', github: 'w345731923' },
  faweizhao: {
    name: 'Fawei Zhao',
    github: 'faweizhao26',
    avatarSrc: '/img/contributors/fawei-zhao.jpeg',
  },
  gavinlyu: { name: 'Gavin LYU', github: 'GavinLYU-HighGo' },
  gesui: { name: 'Ge Sui', github: 'suige' },
  grantzhou: { github: 'grantzhou' },
  hulinji: { github: null },
  imranzaheer: { github: 'imranzaheer612' },
  jiaoshuntian: { name: 'Jiao Shuntian', github: 'jiaoshuntian' },
  kangwang: { name: 'Kang Wang', github: 'wangkangbe' },
  lilywang: { github: null },
  martingerhardy: { github: 'mgerhardy' },
  mingranfeng: { name: 'Mingran Feng', github: 'elipse-fmr' },
  oreoyang: { name: 'Oreo Yang', github: 'OreoYang' },
  pedrolopez: { name: 'Pedro Lopez', github: 'plopezsoftech' },
  pierreforstmann: { name: 'Pierre Forstmann', github: 'pierreforstmann' },
  renlizou: { github: 'zourenli' },
  rophytsai: { name: 'Rophy Tsai', github: 'rophy' },
  rrrrhl: { github: 'RRRRhl' },
  ruikesun: { name: 'Ruike Sun', github: 'highgo-sunrk' },
  ruohangfeng: { github: 'Vonng' },
  shaolinchu: { github: 'shaolinchu' },
  shawnyan: { github: 'shawn0915' },
  shoubowang: { github: null },
  shuisentong: { github: null },
  sixiangao: { name: 'Sixian Gao', github: 'zuinuan123' },
  stevenniu: { name: 'Steven Niu', github: 'bigplaice' },
  tian1220a: { name: '@tian1220A', github: 'tian1220A' },
  xiaohuiliu: { name: 'Xiaohui Liu', github: 'hs-liuxh' },
  xiangyuliang: { name: 'Xiangyu Liang', github: 'balinorLiang' },
  xinjielyu: { name: 'Xinjie Lyu', github: null },
  xueyugao: { name: 'Xueyu Gao', github: 'gaoxueyu' },
  yanlianglei: { name: 'Yanliang Lei', github: 'msdnchina' },
  yasirhussainshah: { name: 'Yasir Hussain Shah', github: 'yasir-hussain-shah' },
  yuanli: { name: 'Yuan Li', github: 'yuanyl630' },
  zhezhang: { name: 'Zhe Zhang', github: 'zhangzhe' },
  zhengtao: { name: 'Zheng Tao', github: 'NotHimmel' },
  zhenhaopan: { name: 'Zhenhao Pan', github: 'panzhenhao' },
  zhibinwang: { github: 'killerwzb' },
  zhuoyanshi: { name: 'Zhuoyan Shi', github: 'shizhuoyan' },
};

function normalizeContributorId(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function looksLikeGithubHandle(value) {
  return /^[a-z0-9-]+$/.test(value);
}

function slugBeautyScore(value) {
  let score = 0;
  if (/[-_]/.test(value)) {
    score += 2;
  }
  if (/[A-Z]/.test(value.slice(1))) {
    score += 2;
  }
  if (!looksLikeGithubHandle(value)) {
    score += 1;
  }
  return score;
}

function humanizeContributorName(value) {
  if (/^[a-z0-9]+$/.test(value)) {
    return `@${value}`;
  }

  const words = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/);

  return words
    .map((word) => {
      if (!word) {
        return word;
      }
      if (word === word.toUpperCase()) {
        return word;
      }
      if (/^[a-z0-9]+$/.test(word)) {
        return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
      }
      return word;
    })
    .join(' ');
}

const contributorMap = new Map();

Object.entries(CONTRIBUTORS_BY_YEAR).forEach(([year, slugs]) => {
  slugs.forEach((slug) => {
    const normalizedId = normalizeContributorId(slug);
    const canonicalId = CONTRIBUTOR_ALIASES[normalizedId] || normalizedId;
    const existing = contributorMap.get(canonicalId) || {
      id: canonicalId,
      displaySlug: slug,
      github: null,
      years: new Set(),
      slugScore: slugBeautyScore(slug),
    };

    const nextScore = slugBeautyScore(slug);
    if (nextScore > existing.slugScore) {
      existing.displaySlug = slug;
      existing.slugScore = nextScore;
    }

    if (looksLikeGithubHandle(slug) && !existing.github) {
      existing.github = slug;
    }

    existing.years.add(Number(year));
    contributorMap.set(canonicalId, existing);
  });
});

export const contributors = Array.from(contributorMap.values())
  .map((item) => {
    const override = CONTRIBUTOR_OVERRIDES[item.id] || {};
    const years = Array.from(item.years).sort((a, b) => b - a);
    const github = Object.prototype.hasOwnProperty.call(override, 'github')
      ? override.github
      : (item.github || null);

    return {
      id: item.id,
      name: override.name || humanizeContributorName(item.displaySlug),
      github,
      avatarSrc: override.avatarSrc || null,
      avatarMode: override.avatarMode || null,
      years,
      latestYear: years[0],
    };
  })
  .sort((left, right) => {
    if (right.latestYear !== left.latestYear) {
      return right.latestYear - left.latestYear;
    }

    const leftName = left.name.replace(/^@/, '').toLowerCase();
    const rightName = right.name.replace(/^@/, '').toLowerCase();
    return leftName.localeCompare(rightName);
  });

export const contributorYears = Object.keys(CONTRIBUTORS_BY_YEAR)
  .map(Number)
  .sort((a, b) => b - a);
