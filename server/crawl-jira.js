var jiraConfig = require('./config-jira.json');
var jiraType = require('./type-jira');

var JIRA_TYPES = jiraType.JIRA_TYPES,
    TYPE_UNKNOWN = jiraType.TYPE_UNKNOWN,
    KEE_HELP = jiraType.KEE_HELP,
    JIRA_ORIGIN = jiraType.JIRA_ORIGIN;

function resolveJiraPage(datas, finish, jiras) {
    var data = datas.pop(),
        assignee = data.assignee,
        person = jiras[assignee];
    if (!person) {
        person = jiras[assignee] = { total: 0 };
    }
    person.total++;
    var jiraPage = require('webpage').create(),
        url = data.url;
    jiraPage.onConsoleMessage = function(msg) {
        console.log(msg);
    }
    jiraPage.open(jiraConfig.url + url, function(status) {
        if (status === 'success') {
            var jira = url.substr(url.lastIndexOf('/') + 1);
            console.log('序号：' + datas.length + '  ' + jira);
            var text = jiraPage.evaluate(function(jira) {
                var elems = document.querySelectorAll('#issue_actions_container .action-details > a, #issue_actions_container .action-body'),
                    texts = [];
                for (var i = 0, len = elems.length; i < len; i++) {
                    texts.push(elems[i].innerText);
                }
                return texts.join('***');
            }, jira);
            (person.text = person.text || []).push(text);
            (person.jira = person.jira || []).push(jira);
            jiraPage.close();
            if (datas.length) {
                resolveJiraPage(datas, finish, jiras);
            } else {
                finish(jiras);
            }
        } else {
            finish('Error in resolve JIRA【' + jira + '】');
        }
    });
}

function mergeParam(param) {
    var url = [];
    for (var name in param) {
        url.push(name + '=' + param[name]);
    }
    return url.join('&');
}

function resolveJiraListInPage(url, datas, callback) {
    var listPage = require('webpage').create();
    listPage.open(url, function(status) {
        if (status === 'success') {
            try {
                console.log('抓取列表...\r\n ### ' + url);
                var info = listPage.evaluate(function() {
                    var datas = [];
                    var rows = document.querySelectorAll('#issuetable tbody tr');
                    for (var i = 0, len = rows.length; i < len; i++) {
                        var row = rows[i];
                        datas.push({
                            assignee: row.querySelector('td.assignee').innerText,
                            url: row.querySelector('td.issuekey > a').getAttribute('href')
                        });
                    }
                    var next = document.querySelector('.pagination .icon-next');
                    return {
                        datas: datas,
                        next: next && next.getAttribute('href')
                    };
                });
                listPage.close();
                datas = datas.concat(info.datas);
                if (info.next) {
                    resolveJiraListInPage(jiraConfig.url + info.next, datas, callback);
                } else {
                    console.log('开始抓取详细信息...');
                    console.log('总共JIRA数：' + datas.length);
                    resolveJiraPage(datas, callback, {});
                }
            } catch (e) {
                callback('Error:' + e);
            }
        } else {
            callback('Error in load JIRA list.');
        }
    })
}

function resolveJiraList(callback, condition) {
    console.log('开始抓取...');
    condition = condition || {};
    var url = condition.url || (jiraConfig.url + '/jira/secure/IssueNavigator!executeAdvanced.jspa'),
        version = (condition.version || 'Site V1.9.0').split(';');
    var param = mergeParam({
        os_username: condition.username || jiraConfig.username,
        os_password: condition.password || jiraConfig.password,
        jqlQuery: condition.query || jiraConfig.query.replace(/\${version}/g, version.join('", "')),
        runQuery: true,
        clear: true
    });
    url = url + (url.indexOf('?') === -1 ? '?' : url.charAt(url.length - 1) === '?' ? '' : '&') + param;
    resolveJiraListInPage(url, [], callback);
}

function matchObject(arr, value, name) {
    for (var i = 0, len = arr.length; i < len; i++) {
        var obj = arr[i];
        if (obj[name] === value) return obj;
    }
}

function handleScore(person, jira, type, origin) {
    var originInfo = person[origin.name];
    if (!originInfo) originInfo = person[origin.name] = { total: 0, score: 0 };
    var typeInfo = originInfo[type.name] = (originInfo[type.name] || { total: 0, score: 0, jira: [] }),
        score = origin.score * type.score;
    person.score = (person.score || 0) + score;
    originInfo.total++;
    originInfo.score += score;
    typeInfo.total++;
    typeInfo.score += score;
    typeInfo.jira.push(jira);
    return score;
}

function hanlePerson(name, person, jiras) {
    var texts = person.text,
        list = person.jira;
    for (var i = 0, len = texts.length; i < len; i++) {
        var reg = /@@([A-Z]):([A-Z])(:H)?@@/gm,
            match = reg.exec(texts[i]),
            jira = list[i];
        if (!match) { //未按标准备注的，直接扣当前版本JIRA分数
            handleScore(person, jira, TYPE_UNKNOWN, JIRA_ORIGIN[0]);
        } else {
            var nextMatch;
            while ((nextMatch = reg.exec(texts[i]))) { //防止备注有多个，取最后一个
                match = nextMatch;
            }
            var type = matchObject(JIRA_TYPES, match[1], 'kee');
            var origin = matchObject(JIRA_ORIGIN, match[2], 'kee');
            if (!type || !origin) { //备注错误的，按未备注处理
                handleScore(person, jira, TYPE_UNKNOWN, JIRA_ORIGIN[0]);
            } else {
                var score = handleScore(person, jira, type, origin);
                if (match[3]) { //协助他人进行解决的，可以加分（分数一半）
                    var helper = texts[i].substr(0, match.index).match(/([^\*]+)\*{3}[^\*]*$/);
                    if (helper) {
                        var helpPerson = jiras[helper[1]];
                        if (helpPerson) {
                            helpPerson.score = (helpPerson.score || 0) + score / 2;
                            var helpInfo = helpPerson[KEE_HELP];
                            if (!helpInfo) helpInfo = helpPerson[KEE_HELP] = { score: 0, total: 0, jira: [], names: [] }
                            helpInfo.score += Math.abs(score / 2);
                            helpInfo.total++;
                            helpInfo.jira.push(jira);
                            helpInfo.names.push(name);
                        }
                    }
                }
            }
        }
    }
}

module.exports = function(callback, condition) {
    resolveJiraList(function(jiras) {
        if (Object.prototype.toString.call(jiras) === '[object String]') {
            console.log(jiras);
        } else {
            try {
                for (var name in jiras) {
                    hanlePerson(name, jiras[name], jiras);
                }
                if (callback) callback(jiras);
            } catch (e) {
                console.log(e);
            }
        }
        phantom.exit();
    }, condition)
}