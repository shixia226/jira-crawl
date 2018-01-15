var fs = require('fs');

var DIRECTORY = process.cwd() + '/jiras/';

function getSavedVersion(callback) {
    fs.exists(DIRECTORY, function(exists) {
        if (exists) {
            fs.readdir(DIRECTORY, function(err, files) {
                if (err) {
                    callback([], '读取保存目录异常.\r\n' + err);
                } else {
                    var versions = [];
                    for (var i = 0, len = files.length; i < len; i++) {
                        versions.push(files[i]);
                    }
                    callback(versions);
                }
            });
        } else {
            console.log('JIRA信息存储目录不存在.');
            callback([]);
        }
    })

}

function readJira(versions, datas, callback) {
    var version = decodeURIComponent(versions.pop());
    fs.readFile(DIRECTORY + version, function(err, data) {
        if (err) {
            console.log('读取JIRA【' + version + '】信息失败.\r\n' + err);
            callback([], 'Error: ' + version);
        } else {
            datas[version] = JSON.parse(data.toString());
            if (versions.length > 0) {
                readJira(versions, datas, callback);
            } else {
                callback(datas);
            }
        }
    });
}

function writeJira(version, data, callback) {
    version = decodeURIComponent(version);
    fs.writeFile(DIRECTORY + version, data, function(err) {
        if (err) {
            console.log('写入失败\r\n' + err)
            callback(err);
        } else {
            console.log('写入JIRA【' + version + '】完成');
            callback();
        }
    });
}

function saveJira(versions, query, callback, datas) {
    var version = versions.pop();
    var phantom = require('child_process').spawn('phantomjs', [process.cwd() + '/server/collect.js', version, query]);

    var output = [];
    phantom.stdout.on('data', (data) => {
        console.log('' + data)
        output.push(data);
    });

    phantom.stderr.on('data', (data) => {
        console.log('Error: ' + data);
        output.push(data);
    });

    phantom.on('close', (code) => {
        var data = output.join(''),
            idx = data.indexOf('===');
        if (idx !== -1) data = data.substr(idx + 3);
        datas[version] = JSON.parse(data);
        writeJira(version, data, function(err) {
            if (err) {
                callback(datas, err);
            } else {
                if (versions.length > 0) {
                    saveJira(versions, query, callback, datas);
                } else {
                    callback(datas);
                }
            }
        })
    });
}

module.exports = {
    /**
     * 获取已经处理并保存的
     */
    version: function(callback, unsaved) {
        if (unsaved) {
            var phantom = require('child_process').spawn('phantomjs', ['./server/collect.js', 'version']);

            var output = [];
            phantom.stdout.on('data', (data) => {
                console.log('' + data)
                output.push(data);
            });

            phantom.stderr.on('data', (data) => {
                console.log('Error: ' + data);
                output.push(data);
            });

            phantom.on('close', (code) => {
                var data = output.join(''),
                    idx = data.indexOf('===');

                if (idx !== -1) data = data.substr(idx + 3);
                try {
                    var datas = JSON.parse(data);
                    getSavedVersion(function(versions, err) {
                        if (err) {
                            callback([], err);
                        } else {
                            var unsavedVersions = [];
                            for (var i = 0, len = datas.length; i < len; i++) {
                                if (versions.indexOf(datas[i]) === -1) {
                                    unsavedVersions.push(datas[i]);
                                }
                            }
                            callback(unsavedVersions);
                        }
                    });
                } catch (e) {
                    callback([], '读取未处理版本号异常.\r\n' + e);
                }
            });
        } else {
            getSavedVersion(callback);
        }
    },

    /**
     * 读取已经处理并保存过的数据
     */
    read: function(version, callback) {
        readJira(version.split(';'), {}, callback);
    },

    /**
     * (重新)解析指定版本号的JIRA信息
     */
    resolve: function(version, query, callback) {
        version = version || '';
        query = query || '';
        fs.exists(DIRECTORY, function(exists) {
            if (exists) {
                saveJira(version.split(';'), query, callback, {});
            } else {
                fs.mkdir(DIRECTORY, function(err) {
                    if (err) {
                        console.log('创建JIRA信息存储目录失败.\r\n' + err);
                        callback();
                    } else {
                        saveJira(version.split(';'), query, callback, {});
                    }
                })
            }
        });
    }
}