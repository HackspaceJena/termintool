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
  ,nodemailer = require("nodemailer")
  ,log = require('sys').log
  ,mustache = require('mustache')
  ,strftime = require('strftime')
  ,fs = require('fs');

function nextDay(x){
    var now = new Date();    
    now.setDate(now.getDate() + (x+(7-now.getDay())) % 7);
    return now;
}

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

EventTool.prototype.publishMail = function() {
    var self = this;
    log('Verschicke eine E-Mail');

    var view = {
        events: []
    };
    // prepare the data
    self.events.forEach(function(el) {
        var item = {};
        item['startdate'] = strftime('%Y-%m-%d %H:%M',el.startdate);
        item['enddate'] = strftime('%Y-%m-%d %H:%M',el.enddate);
        item['heading'] = el.heading;
        item['text'] = el.text;
        view.events.push(item);
    });
    // load the template
    var template = fs.readFileSync('templates/email/template.mustache','utf-8');
    console.log(view);
    var output = mustache.render(template, view);
    var transport = null;
    if (self.config.mail.mda == 'smtp') {
        log('mda smtp not yet implemented');
    } else {
        transport = nodemailer.createTransport("sendmail");
    }
    var nextMonday = nextDay(1);
    transport.sendMail({
         from: self.config.mail.composing.from
        ,to: self.config.mail.composing.to
        ,subject: strftime('Terminankündigungen KW %U/%Y // ab dem %Y-%m-%d',nextMonday)
        ,text: output
    });
}

EventTool.prototype.publishIdentica = function() {
    log('Verschicke einen Dent');
}

EventTool.prototype.setupPublishers = function() {
    this.on('mail',this.publishMail);
    this.on('identica',this.publishIdentica);
}

EventTool.prototype.processEvents = function() {
    var self = this;
    this.config.publishers.forEach(function(el){
        self.emit(el);
    });
}

EventTool.prototype.parseData = function() {
    var self = this.req.EventTool;
    jsdom.env(
        self.RequestData,
        ["http://code.jquery.com/jquery.js"],
        function (errors, window) {
            var wiki_text = window.$("#wiki__text").val();
            var re = /\s\* (\d{4})\-(\d{2})\-(\d{2}) (\d{2})\:(\d{2}) - (\d{2})\:(\d{2}) (.*)/g;
            var match = null;
            self.events = [];
            while (match = re.exec(wiki_text)) {
                var event = {
                     startdate : new Date(match[1], match[2], match[3], match[4], match[5])
                    ,enddate : new Date(match[1], match[2], match[3], match[6], match[7])
                    ,heading : match[8].split("—")[0].trim()
                    ,text : match[8].split("—")[1].trim()
                };
                self.events.push(event);
            }
            if (self.events.length > 0) {
                log(self.events.length + ' Termine gefunden, starte Verarbeitung');
                self.emit('events');
            } else {
                log('Keine Termine gefunden');
            }
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
    log('Suche nach Terminen');
    var req = http.request(this.config.url,this.processResponse);
    req.EventTool = this;

    req.end();

    req.on('error', function(e) {
        console.error(e);
    });
}

exports.EventTool = EventTool;
