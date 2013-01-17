exports.url = {
  hostname: 'www.krautspace.de',
  port: 443,
  path: '/user:0xaffe?do=edit',
  method: 'GET'
};

exports.publishers = ['latex'];

exports.mail = {
   mda: 'sendmail' // smtp is also possible, but not implemented yet, so are the settings bellow a bit useless
  ,host: ''
  ,port: ''
  ,secureConnection: true
  ,auth: {
     user: ''
    ,pass: ''
  }
  ,composing: {
     from: ''
    ,to: ''
  }
}

exports.latex = {
   output: 'output'
  ,tempDir: '/tmp/termintool'
  ,templates: ['kulturprogramm-ks']
}