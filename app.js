var express = require("express");
var app = express();
var fs = require("fs");

var Url = require("url");
var mgr = require("./server/manager");

app.get('/config', function(req, res) {
    res.end(JSON.stringify(require('./server/type-jira')));
});

app.get('/version', function(req, res) {
    var query = Url.parse(req.url, true).query;
    mgr.version(function(versions) {
        res.end(JSON.stringify(versions));
    }, query.resolved === 'true');
    /*
    var phantom = require('child_process').spawn('phantomjs', ['./server/version-jira.js']);

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
        res.end((idx === -1 ? data : data.substr(idx + 3)) || 'Error');
    });*/
});

app.get('/resolve', function(req, res) {
    var query = Url.parse(req.url, true).query;
    mgr.resolve(query.version, query.query, function(data) {
        res.end(JSON.stringify(data));
    });
})

app.get('/detail', function(req, res) {
    var query = Url.parse(req.url, true).query;
    mgr.read(query.version, function(data) {
        res.end(JSON.stringify(data));
    });

    /*
    var phantom = require('child_process').spawn('phantomjs', ['./server/detail-jira.js', query.version || '', query.query || '']);

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
        res.end((idx === -1 ? data : data.substr(idx + 3)) || 'Error');
    });
    */
})

app.use(express.static("public"));

var port = process.env.VCAP_APP_PORT || '6226',
    host = process.env.VCAP_APP_HOST || 'localhost';
app.listen(port, host);
console.log("应用启动成功\r\n地址为：%s:%s", host, port);