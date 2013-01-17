exports.url = {
  hostname: 'www.krautspace.de',
  port: 443,
  path: '/user:0xaffe?do=edit',
  method: 'GET'
};

exports.publishers = ['mail','latex'];

exports.mail = {
   mda: 'sendmail' // smtp is also possible
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
   output: ''
  ,templates: ['kulturprogramm-ks']
}