var g_detail,
    g_versions,
    g_timer,
    TYPES,
    REGIONS;

function showError(msg, selector) {
    clearTimeout(g_timer);
    $('.error').remove();
    $(selector + ' label').after('<p class="error">' + msg + '</p>');
    g_timer = setTimeout(function() {
        $('.error').remove();
    }, 3000);
}

function queryVersion() {
    $.ajax({
        url: '/version',
        success: function(datas) {
            datas = JSON.parse(datas);
            var html = ['<label>已爬取版本<span class="more">More</span></label><ul class="resolved">']
            for (var i = 0, len = datas.length; i < len; i++) {
                html.push('<li>', datas[i], '</li>');
            }
            html.push('</ul>');
            $('.version').html(html.join(''));
            $('.ctrl').show();
        }
    });
}

function queryUnresolvedVersion() {
    $(this).text('loading...');
    $.ajax({
        url: '/version?resolved=true',
        success: function(datas) {
            datas = JSON.parse(datas);
            var html = ['<label>待爬取版本</label><ul>']
            for (var i = datas.length - 1; i >= 0; i--) {
                html.push('<li>', datas[i], '</li>');
            }
            html.push('</ul><label>未罗列版本：</label><input>');
            $('.version').append(html.join('')).find('.more').remove();
        }
    });
}

function indexOf(datas, value, name) {
    for (var i = 0, len = datas.length; i < len; i++) {
        if (datas[i][name] === value) return i;
    }
    return -1;
}

var reg = /@@([A-Z]):([A-Z])(:H)?@@/gm;

function parseBasic(basic) {
    var str = basic.split(';'),
        json = {};
    for (var i = 0, len = str.length; i < len; i++) {
        if (str[i]) {
            var person = str[i].split(':');
            json[person[0]] = parseInt(person[1]) || 0;
        }
    }
    return json;
}

function storeJira(data, region, type, jira) {
    var regionData = data[region] = data[region] || {};
    (regionData[type] = regionData[type] || []).push(jira);
}

function formatDatas(jiras) {
    var datas = {};
    for (var version in jiras) {
        var jiraList = jiras[version];
        for (var i = 0, len = jiraList.length; i < len; i++) {
            var jira = jiraList[i],
                name = jira[0],
                text = jira[2],
                match = reg.exec(text);
            var jiraData = datas[name] = datas[name] || {};
            if (!match) {
                storeJira(jiraData, REGIONS[0].kee, '?', jira[1]);
            } else {
                var nextMatch;
                while ((nextMatch = reg.exec(text))) { //防止备注有多个，取最后一个
                    match = nextMatch;
                }
                var region = match[2],
                    type = match[1];
                if (indexOf(REGIONS, region, 'kee') === -1 || indexOf(TYPES, type, 'kee') === -1) {
                    storeJira(jiraData, REGIONS[0].kee, '?', jira[1]);
                } else {
                    storeJira(jiraData, region, type, jira[1]);
                }
            }
        }
    }
    console.log(datas);
    return datas;
}

function getRate(datas, basic) {
    if (basic) {
        var data = ((parseInt(datas[3]) || 0) + (parseInt(datas[5]) || 0));
        return data ? (data / basic).toFixed(2) : '0.00';
    }
    return '-';
}

function sumColumn(datas, col) {
    var sum = 0;
    for (var r = 0, rlen = datas.length; r < rlen; r++) {
        sum += (parseInt(datas[r][col]) || 0)
    }
    return sum;
}

function formatPrint(jiraDatas, basic) {
    var headerRow = [{
            value: '序号',
            rs: 2
        }, {
            value: '姓名',
            rs: 2
        }, {
            value: '总BUG数',
            rs: 2
        }],
        headerDetail = [undefined, undefined, undefined];
    for (var i = 0, len = REGIONS.length; i < len; i++) {
        headerRow.push({
            value: REGIONS[i].name,
            cs: 2
        });
        headerDetail.push('BUG数', 'BUG分类情况');
    }
    headerRow.push({
        value: '功能点数',
        rs: 2
    }, {
        value: 'BUG率',
        rs: 2
    });
    headerDetail.push(undefined, undefined);

    var detailData = [];
    for (var name in jiraDatas) {
        var data = jiraDatas[name],
            total = 0,
            rowData = [undefined, name, undefined];
        for (var i = 0, len = REGIONS.length; i < len; i++) {
            var regionData = data[REGIONS[i].kee];
            if (!regionData) {
                rowData.push('', '');
            } else {
                var regionCount = 0,
                    index = 1,
                    html = [];
                for (var type in regionData) {
                    var idx = indexOf(TYPES, type, 'kee'),
                        count = regionData[type].length;
                    regionCount += count;
                    html.push((index) + '. ' + (idx === -1 ? '未知类型' : TYPES[idx].name) + '【' + count + '】');
                    index++;
                }
                total += regionCount;
                rowData.push(regionCount, html.join('<br/>'));
            }
        }
        rowData[2] = total;
        var countBasic = basic[name] || 0;
        delete basic[name];
        rowData.push(countBasic, getRate(rowData, countBasic));
        detailData.push(rowData);
    }
    for (var name in basic) {
        var rowData = [undefined, name, 0];
        for (var i = 0, len = REGIONS.length; i < len; i++) {
            rowData.push('', '');
        }
        rowData.push(basic[name], '0.00');
        detailData.push(rowData);
    }
    detailData.sort(function(a, b) {
        if (a[2] > b[2]) {
            return -1;
        } else if (a[2] < b[2]) {
            return 1;
        } else {
            var len = a.length - 1,
                rateA = a[len],
                rateB = b[len];
            if (a === '-') {
                return -1;
            } else if (b === '-') {
                return 1;
            } else {
                return rateA > rateB ? -1 : rateA < rateB ? 1 : 0;
            }
        }
    });
    for (var i = 0, len = detailData.length; i < len; i++) {
        detailData[i][0] = i + 1;
    }

    footerRow = [{ value: '合计', cs: 2 }, undefined];
    footerRow.push(sumColumn(detailData, footerRow.length));
    for (var i = 0, len = REGIONS.length; i < len; i++) {
        footerRow.push(sumColumn(detailData, footerRow.length), '');
    }
    var sumBasic = sumColumn(detailData, footerRow.length);
    footerRow.push(sumBasic, getRate(footerRow, sumBasic));

    detailData.unshift(headerDetail);
    detailData.unshift(headerRow);
    detailData.push(footerRow);
    return detailData;
}

function printResultTable(jiras, basic, versions) {
    var fmDatas = formatPrint(formatDatas(jiras), parseBasic(basic));
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

function queryDetail(work, versions) {
    $.ajax({
        url: '/detail',
        data: { version: versions },
        success: function(datas) {
            g_detail = JSON.parse(datas);
            console.log(g_detail);
            printResultTable(g_detail, work, versions);
        }
    });
}

function init() {
    queryVersion();
    $('.version').on('click', 'li', function() {
        $(this).toggleClass('selected');
    }).on('click', '.more', queryUnresolvedVersion);
    $('.ctrl').on('click', '.query', function(evt) {
        var elems = $('.version .resolved li.selected');
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
    }).on('click', '.resolve', function() {
        var version = $('.version input').val();
        var elems = $('.version li.selected');
        if (!elems.length && !version) {
            showError('请至少选择一个版本.', '.version');
            return;
        }
        var versions = [];
        for (var i = 0, len = elems.length; i < len; i++) {
            versions[i] = encodeURIComponent(elems[i].innerText);
        }
        if (version) versions.push(encodeURIComponent(version));
        var $this = $(this).text('Loading...');
        $.ajax({
            url: '/resolve',
            data: { version: versions.join(';') },
            success: function() {
                $this.text('爬取');
                var $pelem = $('.version').find('ul.resolved').append(elems);
                if (version) {
                    $pelem.append('<li>' + version + '</li>');
                }
            }
        })
    });
}

$.ajax({
    url: '/config',
    success: function(data) {
        data = JSON.parse(data);
        TYPES = data.TYPES;
        REGIONS = data.REGIONS;
        init();
    }
});