exports.url = "https://www.krautspace.de/user:0xaffe?do=edit";

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
