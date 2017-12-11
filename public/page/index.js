var g_history = [],
    g_detail,
    g_versions,
    g_timer;

function showError(msg, selector) {
    clearTimeout(g_timer);
    $('.error').remove();
    $(selector + ' label').after('<p class="error">' + msg + '</p>');
    g_timer = setTimeout(function () {
        $('.error').remove();
    }, 3000);
}

function queryHistory() {
    $.ajax({
        url: '/history',
        success: function (datas) {
            g_history = JSON.parse(datas);
            var html = ['<label>历史结果：</label><ul>'];
            for (var i = g_history.length - 1; i >= 0; i--) {
                html.push('<li data-id="', i, '">', g_history[i].name, '</li>');
            }
            html.push('</ul>');
            $('.history').html(html.join(''));
        }
    });
}

function saveHistory() {
    $.ajax({
        url: '/save',
        success: function () {

        }
    });
}

function clearHistory() {
    $.ajax('/clear', function () {

    });
}

function formatCellJira(person, type, row, detail) {
    var jira = person[type];
    if (!jira) {
        row.push('', '');
    } else {
        row.push(' ' + jira.total);
        detail[type] = jira;
        if (jira.names) {
            row.push(jira.jira.toString());
        } else {
            var info = [],
                idx = 0;
            for (var name in jira) {
                if (['total', 'score'].indexOf(name) !== -1) continue;
                var jiraInfo = jira[name];
                info.push((++idx) + '. ' + name + ' （数量：' + jiraInfo.total /* + ', 得分：' + jiraInfo.score*/ + '）');
            }
            row.push(info.join('<br>'));
        }
    }
}

function getTypeNames(jiras) {
    return ['当前版本开发新增', '之前版本开发新增', '维护模块历史遗留'];
    // var typeNames = [];
    // for (var person in jiras) {
    //     var jira = jiras[person];
    //     for (var name in jira) {
    //         if (!/[a-z]+/.test(name) && typeNames.indexOf(name) === -1) {
    //             typeNames.push(name);
    //         }
    //     }
    // }
    // return typeNames;
}

function orderPush(list, cmp, idx, from) {
    var total = cmp[idx];
    for (var i = from, len = list.length; i < len; i++) {
        if (list[i][idx] <= total) {
            list.splice(i, 0, cmp);
            return;
        }
    }
    list.push(cmp);
}

function sumColumn(datas, col, fr) {
    var sum = 0;
    for (var r = fr, rlen = datas.length - 1; r < rlen; r++) {
        sum += (parseInt(datas[r][col]) || 0)
    }
    return sum;
}

function parseBasic(basic) {
    var str = basic.split(';'),
        json = {};
    for (var i = 0, len = str.length; i < len; i++) {
        var person = str[i].split(':');
        json[person[0]] = parseInt(person[1]) || 0;
    }
    return json;
}

function getRate(datas, basic) {
    if (basic) {
        var data = ((parseInt(datas[3]) || 0) + (parseInt(datas[5]) || 0));
        return data ? (data / basic).toFixed(2) : '0';
    }
    return '-';
}

function formatPrint(jiras, basic) {
    var typeNames = getTypeNames(jiras);
    var table = [
            [{
                value: '序号',
                rs: 2
            }, {
                value: '姓名',
                rs: 2
            }, {
                value: '总BUG数',
                rs: 2
            }],
            [undefined, undefined, undefined]
        ],
        idx = 1;
    typeNames.every(function (item) {
        table[0].push({
            value: item,
            cs: 2
        }, undefined);
        table[1].push('BUG数', '详情');
        return true;
    });
    table[0].push({
        value: '功能点数',
        rs: 2
    }, {
        value: 'BUG率',
        rs: 2
    });
    var sumBasic = 0;
    for (var name in jiras) {
        var person = jiras[name],
            detail = {},
            row = [undefined, name, person.total];
        for (var i = 0, len = typeNames.length; i < len; i++) {
            formatCellJira(person, typeNames[i], row, detail);
        }
        var countBasic = basic[name] || 0;
        delete basic[name];
        sumBasic += countBasic;
        row.push(countBasic, getRate(row, countBasic));
        orderPush(table, row, 2, 2);
    }
    for (var person in basic) {
        var row = [undefined, person, 0];
        typeNames.every(function (item) {
            row.push(0, '');
            return true;
        });
        row.push(basic[person], 0);
        sumBasic += basic[person];
        table.push(row);
    }
    for (var i = 2, len = table.length; i < len; i++) {
        table[i][0] = idx++;
    }
    var count = table.length,
        lastRow = [{
            value: '合计',
            cs: 2
        }, undefined, sumColumn(table, 2, 2)];
    typeNames.every(function (item, idx) {
        lastRow.push(sumColumn(table, 3 + idx * 2, 2), '');
        return true;
    });
    lastRow.push(sumBasic, getRate(lastRow, sumBasic));
    table.push(lastRow);
    return table;
}

function printResultTable(detail, work, versions) {
    var fmDatas = formatPrint(detail, parseBasic(work));
    var htmls = ['<h3 style="text-align: center;">版本【', versions.split(';').join(' - '), '】BUG情况汇总</h3>', '<table class="jira-table">'];
    for (var r = 0, rlen = fmDatas.length; r < rlen; r++) {
        htmls.push('<tr class="', r < 2 ? 'header' : r === rlen - 1 ? 'footer' : 'data', '">');
        var rowData = fmDatas[r];
        for (var c = 0, clen = rowData.length; c < clen; c++) {
            var data = rowData[c];
            if (data === undefined) continue;
            htmls.push('<td');
            if (data && data.rs) {
                htmls.push(' rowSpan="', data.rs, '"');
            }
            if (data && data.cs) {
                htmls.push(' colSpan="', data.cs, '"');
            }
            if (/^1\..+[\u4e00-\u9fa5]+/.test(data)) {
                htmls.push(' class="detail"');
            } else if (c === 2 || c === clen - 1) {
                htmls.push(' class="highlight"');
            } else if (c === clen - 2) {
                htmls.push(' class="blue"');
            }
            htmls.push('>', data.value || data, '</td>');
        }
        htmls.push('</tr>');
    }
    htmls.push('</table>');
    $('.result').html(htmls.join(''));
}

function successOnQueryVersion(datas) {
    datas = JSON.parse(datas);
    var html = ['<label>可选版本</label><ul>']
    for (var i = datas.length - 1; i >= 0; i--) {
        html.push('<li>', datas[i], '</li>');
    }
    html.push('</ul>');
    $('.version').html(html.join(''));
    $('.ctrl').show();
}

function queryVersion() {
    successOnQueryVersion(JSON.stringify(["Site V1.9.0", "Site V1.9.2", "CMS2.0.4", "Site V1.9.1", "CMS2.0.3.1"]));
    return;
    $.ajax({
        url: '/version',
        success: successOnQueryVersion
    });
}

function queryDetail(work, versions) {
    $.ajax({
        url: '/detail',
        data: { version: versions },
        success: function (datas) {
            g_detail = JSON.parse(datas);
            console.log(g_detail);
            printResultTable(g_detail, work, versions);
        }
    });
}

function init() {
    queryVersion();
    // queryHistory();
    $('.version').on('click', 'li', function () {
        $(this).toggleClass('selected');
    });
    $('.ctrl').on('click', '.query', function (evt) {
        var elems = $('.version li.selected');
        if (!elems.length) {
            showError('请至少选择一个版本.', '.version');
            return;
        }
        var work = $('.work textarea').val().trim();
        if (!work) {
            showError('请输入工作量.', '.work');
            return;
        }
        var versions = [];
        for (var i = 0, len = elems.length; i < len; i++) {
            versions[i] = elems[i].innerText;
        }
        versions = versions.join(';');
        if (g_versions === versions) {
            if (g_detail) {
                printResultTable(g_detail, work, g_versions);
            }
        } else {
            queryDetail(work, g_versions = versions);
        }
    }).on('click', '.save', saveHistory)
}

init();