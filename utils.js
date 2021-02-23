const sendMessageWithClient = (peerClient) => (message) => {
  return promisify(peerClient.map.bind(peerClient), 'exchange_server', message, { timeout: 10000 });
};

const promisify = (fn, ...args) => {
  return new Promise(resolve => {
    fn(...args, (error, data) => {
      resolve({ error, data });
    });
  });
};

module.exports = {
  promisify,
  sendMessageWithClient,
};
