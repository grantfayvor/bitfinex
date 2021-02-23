var db = {};

const { PeerRPCServer, PeerRPCClient } = require('grenache-nodejs-http');
const Link = require('grenache-nodejs-link');
const matcher = require('./order/matcher');
const processor = require('./order/processor');
const { Order, orderTypes } = require('./order/schema');

const { asyncHandlers } = processor(db);

const serverLink = new Link({
  grape: 'http://127.0.0.1:30001'
});
serverLink.start();

const peerServer = new PeerRPCServer(serverLink, {
  timeout: 300000
});
peerServer.init();

const port = 1024 + Math.floor(Math.random() * 1000);
const service = peerServer.transport('server');
service.listen(port);

setInterval(function () {
  serverLink.announce(`exchange_server`, service.port, {});
}, 1000);

const clientLink = new Link({
  grape: 'http://127.0.0.1:30001'
});
clientLink.start();

const peerClient = new PeerRPCClient(clientLink, {});
peerClient.init();

service.on('request', (rid, key, payload, handler) => {
  if (payload.from === port) return;

  asyncHandlers(payload, handler.reply);
});

const matchOrder = matcher(db, port);

// Get current order state
peerClient.map('exchange_server', {
  type: 'GET_ORDER_STATE',
  from: port
}, { timeout: 10000 }, (err, data) => {

  if (data && data.length && data[0]) {
    db = Object.assign(db, { ...data[0].db });
  }
  
  try {
    // TODO process the order
  
    // matchOrder(new Order({ type: orderTypes.sell, amount: 200, from: port, }), peerClient);
    // matchOrder(new Order({ type: orderTypes.sell, amount: 150, from: port, }), peerClient);

    matchOrder(new Order({ type: orderTypes.buy, amount: 300, from: port, }), peerClient);
  } catch (err) {
    console.error(err);
  }

});
