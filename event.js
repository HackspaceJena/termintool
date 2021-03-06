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
  ,request = require('request')
  ,jsdom = require('jsdom')
  ,nodemailer = require("nodemailer")
  ,log = require('sys').log
  ,mustache = require('mustache')
  ,strftime = require('strftime')
  ,fs = require('fs')
  ,glob = require('glob')
  ,jq = require('jquery')
  ,wrap = require('wordwrap')(72);

function nextDay(x){
    var now = new Date();    
    now.setDate(now.getDate() + (x+(7-now.getDay())) % 7);
    return now;
}

function EventTool() {
    events.EventEmitter.call(this);
};

String.prototype.EscapeLatex = function() {
  return this.toString()
    .replace(/\\/g,'\\textbackslash{}')
    .replace(/&/g,'\\&')
    .replace(/\|/g,'\\|')
    .replace(/\[/g,'\\[')
    .replace(/\]/g,'\\]')
    .replace(/\%/g,'\\%')
    .replace(/\$/g,'\\$');
}

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

EventTool.prototype.processEventData = function() {
    var self = this;
    var view = {
      events: [],
      day: strftime('%d',new Date()),
      month: strftime('%m',new Date()),
      year: strftime('%Y',new Date()),
      week: strftime('%U',new Date())
    };
    // prepare the data
    self.events.forEach(function(el) {
        var item = {};
        item['startdate'] = strftime('%Y-%m-%d',el.startdate);
        item['starttime'] = strftime('%H:%M',el.startdate);
        item['enddate'] = strftime('%Y-%m-%d %H:%M',el.enddate);
        item['endtime'] = strftime('%H:%M',el.enddate);
        item['heading'] = el.heading;
        item['text'] = el.text;
        view.events.push(item);
    });
    return view;
}

EventTool.prototype.publishMail = function() {
    var self = this;
    log('Verschicke eine E-Mail');
    var view = self.processEventData();
    view.events.forEach(function(el){
        el.text = wrap(el.text);
    });
    // load the template
    var template = fs.readFileSync('templates/email/template.mustache','utf-8');
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

EventTool.prototype.publishLatex = function() {
    var self = this;
    log('Erzeuge PDFs mit LaTeX');
    var view = self.processEventData();
    view.events.forEach(function(el){
      el.heading = el.heading.EscapeLatex();
      el.text = el.text.EscapeLatex();
    });
    // generate the pdfs
    self.config.latex.templates.forEach(function(template){
        var templateData = fs.readFileSync('templates/latex/'+template+'.tex','utf-8');        
        var output = mustache.render(templateData, view);
        try {
        fs.mkdirSync(self.config.latex.tempDir);
        } catch(e) {
            // POKEMON! GOTTA CATCH THEM ALL!
        }
        var tempfilePrefix = self.config.latex.tempDir + '/' + template;
        fs.writeFileSync(tempfilePrefix+'.tex',output);
        var spawn = require('child_process').spawn,
            pdflatex    = spawn('pdflatex', ['-interaction','nonstopmode','-output-directory', self.config.latex.tempDir,tempfilePrefix+'.tex']);

        pdflatex.on('exit', function (code) {
            log('child process exited with code ' + code);
            if (code === 0) {
                log('Copy the PDF to the output dir');
                fs.createReadStream(tempfilePrefix+'.pdf').pipe(fs.createWriteStream(self.config.latex.output+'/'+template+'.pdf'));

                // now clean up the tempdir
                glob('**/*',{cwd:self.config.latex.tempDir},function(err,files){
                    files.forEach(function(file){
                        fs.unlinkSync(self.config.latex.tempDir+'/'+file);
                    });
                });
            } else {
                log('Failed to generate the pdf. Please chek the logs under '+ tempfilePrefix+'.log');
            }
            
        });
    });
}

EventTool.prototype.publishIdentica = function() {
    log('Verschicke einen Dent');
}

EventTool.prototype.publishConsole = function() {
    var self = this;
    var view = self.processEventData();
    log(util.inspect(view));
}

EventTool.prototype.setupPublishers = function() {
    this.on('mail',this.publishMail);
    this.on('identica',this.publishIdentica);
    this.on('latex',this.publishLatex);
    this.on('console',this.publishConsole);
}

EventTool.prototype.processEvents = function() {
    var self = this;
    this.config.publishers.forEach(function(el){
        self.emit(el);
    });
}

EventTool.prototype.parseData = function(et) {
    var self = et;
    jsdom.env(
        self.RequestData,
        function (errors, window) {
            var $ = jq.create(window);
            var wiki_text = $("#wiki__text").val();
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

EventTool.prototype.processResponse = function(error, response, body) {
    var self = this.EventTool;
    if (response.statusCode == 200) {
      self.RequestData = body;
      self.parseData(self);
    }
}

EventTool.prototype.run = function() {
    log('Suche nach Terminen');
    var req = request({'url':this.config.url,'strictSSL': false},this.processResponse);
    req.EventTool = this;

    req.end();

    req.on('error', function(e) {
        console.error(e);
    });
}

exports.EventTool = EventTool;
