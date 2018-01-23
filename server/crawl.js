var jiraConfig = require('./config-jira.json');

function resolveJiraPage(datas, finish, jiras) {
    var data = datas.pop(),
        assignee = data.assignee;
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
            jiras.push([assignee, jira, text]);
            jiraPage.close();
            if (datas.length) {
                resolveJiraPage(datas, finish, jiras);
            } else {
                finish(jiras);
            }
        } else {
            console.log('Error in resolve JIRA【' + jira + '】');
        }
    });
}

function resolveJiraListInPage(url, datas, callback) {
    var listPage = require('webpage').create();
    listPage.onConsoleMessage = function(msg) {
        console.log('列表页 => ' + msg);
    }
    listPage.open(url, function(status) {
        if (status === 'success') {
            try {
                console.log('进入JIRA列表页...\r\n ### ' + url);
                var info = listPage.evaluate(function() {
                    console.log('开始查询统计');
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
                    console.log('统计该页结束，共计: ' + datas.length);
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
                    if (datas.length > 0) {
                        resolveJiraPage(datas, callback, []);
                    } else {
                        callback([]);
                    }
                }
            } catch (e) {
                callback('Error:' + e);
            }
        } else {
            callback('Error in load JIRA list. [' + status + ']');
        }
    })
}

function mergeParam(param) {
    var url = [];
    for (var name in param) {
        url.push(name + '=' + param[name]);
    }
    return url.join('&');
}

function resolveJiraList(callback, condition) {
    console.log('开始抓取JIRA列表...');
    condition = condition || {};
    var url = condition.url || (jiraConfig.url + jiraConfig.detailUrl),
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

module.exports = {
    version: function(callback, condition) {
        console.log('爬取版本号...');
        condition = condition || {};
        var url = condition.url || (jiraConfig.url + jiraConfig.versionUrl);
        var param = mergeParam({
            os_username: condition.username || jiraConfig.username,
            os_password: condition.password || jiraConfig.password
        });
        url = url.replace("${verify}", param);
        var versionPage = require('webpage').create();
        versionPage.onConsoleMessage = function(msg) {
            console.log('版本页 => ' + msg);
        }
        versionPage.open(url, function(status) {
            if (status === 'success') {
                try {
                    console.log('进入版本号页面...\r\n ### ' + url);
                    var datas = versionPage.evaluate(function() {
                        console.log('进入页面')
                        var datas = [],
                            anchors = document.querySelectorAll('#versions_panel a.summary');
                        console.log(anchors.length);
                        for (var i = 0, len = anchors.length; i < len; i++) {
                            datas.push(anchors[i].innerText);
                        }
                        console.log(JSON.stringify(datas, null, 4));
                        return datas;
                    });
                    versionPage.close();
                    var startVersion = jiraConfig.startVersion;
                    if (startVersion) {
                        var idx = datas.indexOf(startVersion);
                        if (idx !== -1) datas = datas.slice(idx);
                    }
                    if (callback) callback(datas);
                } catch (e) {
                    if (callback) callback('Error:' + e);
                }
            } else {
                if (callback) callback('Error in load JIRA version.');
            }
            phantom.exit();
        });
    },
    list: function(callback, condition) {
        resolveJiraList(function(jiras) {
            try {
                if (callback) callback(jiras);
            } catch (e) {
                console.log(e);
            }
            phantom.exit();
        }, condition)
    }
}