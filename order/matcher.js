const { orderTypes } = require('./schema');
const { sendMessageWithClient } = require('../utils');

/**
 * This is a basic best match iterating all available orders to find the closest match.
 * The best way to represent this however might be representing the orders as graphs
 * and using the dijkstra's algorithm to find the nearest path in the amounts.
 */
const findBestMatch = (order, db) => {
  const matchType = orderTypes.reverse(order.type);

  let match = {
    amount: Number.POSITIVE_INFINITY
  };

  for (let key in db) {
    if (db[key].type !== matchType || db[key].lock) {
      continue;
    }

    /**
     * Since this is a simple order matching, I'm going to rely on their absolute differences to determine the match.
     * This ignores the case where an order in db is significantly larger than the requesting order and the difference is 
     * greater than the current matched difference even though the current match does not completely fulfill the order.
     */
    if (Math.abs(db[key].amount - order.amount) < Math.abs(match.amount - order.amount)) {
      match = { ...db[key] };
    }
  }

  return match.amount !== Number.POSITIVE_INFINITY && match;
};


module.exports = (db = {}, from = 0) => {
  const processor = require('./processor')(db);

  return async (order, peerClient) => {
    db[order.id] = order;

    const sendMessage = sendMessageWithClient(peerClient);

    // Send initial message informing all clients to update their order books with the order info.

    // maybe retry on error.
    await sendMessage({ type: 'INITIAL_ORDER', data: order, from });

    const match = findBestMatch(order, db);

    if (!match) {
      console.log('No match found.', db);
      processor.unlockOrder(order);
      return;
    }

    // if the locked order here has already been locked by another client. Release this match and retry the matcher.
    const { data } = await sendMessage({ type: 'LOCK_ORDER', data: { ...match, lockedBy: order.from }, from });

    // check that the number of successes returned is equal to the number of clients - 1
    // This means check that data array has data.length - 1 successes before proceeding, else rollback.
    await sendMessage({ type: 'VERIFY_TRANSACTION', data: { orderId: order.id, matchedId: match.id }, from });

    const { updatedMatch, updatedOrder } = processor.updateOrder(match, order);

    await sendMessage({
      type: 'UPDATE_ORDER',
      data: {
        match,
        order,
        updatedMatch,
        updatedOrder
      },
      from
    });

    console.log(db);
  };
};
