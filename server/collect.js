var system = require('system');
var crawl = require('./crawl.js');

if (system.args[1] === 'v' || system.args[1] === 'version') {
    crawl.version(function(versions) {
        console.log('===');
        console.log(JSON.stringify(versions, null, 4));
    });
} else {
    crawl.list(function(jiras) {
        console.log('===');
        console.log(JSON.stringify(jiras, null, 4));
    }, {
        version: system.args[1],
        query: system.args[2]
    });
}