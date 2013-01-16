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
  ,log = require('sys').log;

/**
 * Returns the week number for this date.  dowOffset is the day of week the week
 * "starts" on for your locale - it can be from 0 to 6. If dowOffset is 1 (Monday),
 * the week returned is the ISO 8601 week number.
 * @param int dowOffset
 * @return int
 */
Date.prototype.getWeek = function (dowOffset) {
/*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.epoch-calendar.com */

	dowOffset = typeof(dowOffset) == 'int' ? dowOffset : 0; //default dowOffset to zero
	var newYear = new Date(this.getFullYear(),0,1);
	var day = newYear.getDay() - dowOffset; //the day of week the year begins on
	day = (day >= 0 ? day : day + 7);
	var daynum = Math.floor((this.getTime() - newYear.getTime() - 
	(this.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
	var weeknum;
	//if the year starts before the middle of a week
	if(day < 4) {
		weeknum = Math.floor((daynum+day-1)/7) + 1;
		if(weeknum > 52) {
			nYear = new Date(this.getFullYear() + 1,0,1);
			nday = nYear.getDay() - dowOffset;
			nday = nday >= 0 ? nday : nday + 7;
			/*if the next year starts before the middle of
 			  the week, it is week #1 of that year*/
			weeknum = nday < 4 ? 1 : 53;
		}
	}
	else {
		weeknum = Math.floor((daynum+day-1)/7);
	}
	return weeknum;
};



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
    var transport = null;
    if (self.config.mail.mda == 'smtp') {
        log('mda smtp not yet implemented');
    } else {
        transport = nodemailer.createTransport("sendmail");
    }
    transport.sendMail({
         from: self.config.mail.composing.from
        ,to: self.config.mail.composing.to
        ,subject: 'Terminankündigungen KW ' + (new Date()).getWeek()
        ,text: 'moep moep'
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
                    ,text : match[8]
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
