require('./crawl-jira.js').version(function(versions) {
    console.log('===');
    console.log(JSON.stringify(versions, null, 4));
});