const uuid = require('uuid').v4;

const orderTypes = {
  buy: 'buy',
  sell: 'sell',
  reverse: function (type) {
    return type === this.buy ? this.sell : this.buy;
  }
};

class Order {
  constructor({ type, amount, from, }) {
    this.id = uuid();
    this.type = type;
    this.amount = amount;
    this.from = from;
    this.lock = true;
    this.lockedBy = from;
  }
}

module.exports = {
  orderTypes,
  Order
};
