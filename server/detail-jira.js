var system = require('system');

function formatCellJira(person, type, row, detail) {
    var jira = person[type];
    if (!jira) {
        row.push(undefined, undefined, undefined);
    } else {
        row.push(' ' + jira.total, ' ' + jira.score);
        detail[type] = jira;
        if (type === require('./type-jira').KEE_HELP) {
            row.push(jira.jira.toString());
        } else {
            var info = [],
                idx = 0;
            for (var name in jira) {
                if (['total', 'score'].indexOf(name) !== -1) continue;
                var jiraInfo = jira[name];
                info.push((++idx) + '. ' + name + ' （数量：' + jiraInfo.total + ', 得分：' + jiraInfo.score + '）');
            }
            row.push(info.join('\\r\\n'));
        }
    }
}

function formatPrint(jiras) {
    var format = [],
        typeNames = require('./type-jira').JIRA_ORIGIN.map(function(item) { return item.name });
    typeNames.push(require('./type-jira').KEE_HELP);
    var table = [
            ['序号', '姓名', '总BUG数', '总得分'],
            [undefined, undefined, undefined, undefined]
        ],
        idx = 1;
    typeNames.every(function(item) {
        table[0].push(item, undefined, undefined);
        table[1].push('BUG数', '分数', '详情');
        return true;
    });
    for (var name in jiras) {
        var person = jiras[name],
            detail = {},
            row = [idx++, name, person.total, person.score];
        for (var i = 0, len = typeNames.length; i < len; i++) {
            formatCellJira(person, typeNames[i], row, detail);
        }
        table.push(row);
        format.push({
            name: name,
            '总BUG数': person.total,
            '总得分': person.score,
            '详细': detail
        });
    }
    var count = table.length;
    table.push(['合计', undefined, '=SUM(C2:C' + count + ')', '=SUM(D2:D' + count + ')']);
    typeNames.every(function(item, idx) {
        var charBug = String.fromCharCode(69 + idx * 3)
        var charScore = String.fromCharCode(69 + idx * 3 + 1)
        table[count].push('=SUM(' + charBug + '2:' + charBug + count + ')', '=SUM(' + charScore + '2:' + charScore + count + ')', undefined);
        return true;
    });
    for (var r = 0, rlen = table.length; r < rlen; r++) {
        console.log(table[r].join(' \t'));
    }
}

var idx = 1,
    format = system.args[1] === '-f';
if (format) idx++;

require('./crawl-jira.js').detail(function(jiras) {
    if (format) {
        console.log('\r\n########################\r\nJIRA统计结果：\r\n');
        formatPrint(jiras);
    } else {
        console.log('===');
        console.log(JSON.stringify(jiras, null, 4));
    }
}, {
    version: system.args[idx++],
    query: system.args[idx++]
});