var config = require('./config');
var http = require('https');
var jsdom = require('jsdom');


var data = '';

function parseData() {
    jsdom.env(
        data,
        ["http://code.jquery.com/jquery.js"],
        function (errors, window) {
            var wiki_text = window.$("#wiki__text").val();
            var re = /\s\* (\d{4})\-(\d{2})\-(\d{2}) (\d{2})\:(\d{2}) - (\d{2})\:(\d{2}) (.*)/g;
            var match = null;
            var events = [];
            while (match = re.exec(wiki_text)) {
                var event = {
                     startdate : new Date(match[1], match[2], match[3], match[4], match[5])
                    ,enddate : new Date(match[1], match[2], match[3], match[6], match[7])
                    ,text : match[8]
                };
                events.push(event);
            }
            console.log(events);
        }
    );
}

function processResponse(res) {
    if (res.statusCode == 200) {
        res.on('data', function(d) {
            data = data + d;
        });

        res.on('end',parseData);
    }
}

var req = http.request(config.url,processResponse);

req.end();

req.on('error', function(e) {
    console.error(e);
});
