module.exports = {
    JIRA_TYPES: [{
        name: '文案错误',
        desc: '包括单词拼写，大小写，标点符号后缺少空格，常见的文案格式（如钱币"$"，电话"-"，数值千分符","）遗漏等错误',
        kee: 'W',
        score: 10
    }, {
        name: 'UI低级错误',
        desc: '包括明显界面混乱，明显间距不一致，明显与UI效果不符， 字体不统一，一套、二套字体都是统一的，颜色和主题色',
        kee: 'U',
        score: 10
    }, {
        name: 'UI错误',
        desc: '内容过多 内容换行问题，内容为空 对齐空白问题，适配问题（PC+手机）',
        kee: 'V',
        score: 5
    }, {
        name: '逻辑错误',
        desc: '包括代码书写不规范，代码错误，代码临界条件考虑不周到，代码兼容问题（PC+手机），代码逻辑混乱等错误',
        kee: 'C',
        score: 8
    }, {
        name: '接口错误',
        desc: '包括后端缺少字段，更改字段，更改数据格式，之前设计未考虑后端重新更改或增加接口让前端再调的错误',
        kee: 'I',
        score: 1
    }, {
        name: '产品设计',
        desc: '包括UI不好看，操作不合理但不影响整体使用，方案或参数错误',
        kee: 'P',
        score: 1
    }, {
        name: '环境状况',
        desc: '包括网络不畅，服务器崩溃，代码部署冲突',
        kee: 'E',
        score: 1
    }],
    TYPE_UNKNOWN: {
        name: '未知类型',
        desc: '未按标准进行备注',
        kee: '?',
        score: 10
    },
    KEE_HELP: '协助解决',
    JIRA_ORIGIN: [{
        name: '当前版本开发新增',
        kee: 'C',
        score: -1
    }, {
        name: '之前版本开发新增',
        kee: 'P',
        score: -1
    }, {
        name: '维护模块历史遗留',
        kee: 'H',
        score: 1
    }]
};