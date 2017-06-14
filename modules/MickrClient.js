const TelepathyClient = require('./node-telepathy-client/client.js')

class MickrClient extends TelepathyClient{
  constructor(option){
    super(option);
    this.on('ack', (req,res)=>{console.log('ACK',req, res);})
  }
}

module.exports = MickrClient
