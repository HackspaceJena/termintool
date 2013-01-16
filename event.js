/*
* ----------------------------------------------------------------------------
* "THE VODKA-WARE LICENSE" (Revision 42):
* <tim@bandenkrieg.hacked.jp> wrote this file. As long as you retain this notice you
* can do whatever you want with this stuff. If we meet some day, and you think
* this stuff is worth it, you can buy me a vodka in return. Tim Schumacher
* ----------------------------------------------------------------------------
*/

var
   events = require('events')
  ,util = require('util')
  ,dgram = require('dgram')
  ,config = require('./config')
  ,http = require('https')
  ,jsdom = require('jsdom')
  ,log = require('sys').log;


function EventTool() {
    events.EventEmitter.call(this);
};

EventTool.super_ = events.EventEmitter;
EventTool.prototype = Object.create(events.EventEmitter.prototype, {
                                  constructor: {
                                    value: EventTool,
                                    enumerable: false
                                  }
                                });


EventTool.prototype.config = require('./config');
EventTool.prototype.RequestData = '';
EventTool.prototype.events = [];

EventTool.prototype.parseData = function() {
    var self = this.req.EventTool;
    jsdom.env(
        self.RequestData,
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

EventTool.prototype.processResponse = function(res) {
    var self = this.EventTool;
    if (res.statusCode == 200) {
        res.on('data', function(d) {
            self.RequestData = self.RequestData + d;
        });

        res.on('end',self.parseData);
    }
}

EventTool.prototype.run = function() {
    var req = http.request(this.config.url,this.processResponse);
    req.EventTool = this;

    req.end();

    req.on('error', function(e) {
        console.error(e);
    });
}

exports.EventTool = EventTool;
