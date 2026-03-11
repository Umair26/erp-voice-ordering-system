let STATES = {
  IDENTIFY: 'IDENTIFY',
  ORDER: 'ORDER',
  CONFIRM: 'CONFIRM',
  PLACE: 'PLACE',
  DONE: 'DONE',
};

function newCallState() {
  return { state: STATES.IDENTIFY, customer: null, cart: [] };
}

// transcript is text from Deepgram
async function updateState(call, transcript) {
  switch (call.state) {
    case STATES.IDENTIFY:
      // Lookup customer from ERP
      const customer = await lookupCustomer(transcript.trim());
      if (customer) {
        call.customer = customer;
        call.state = STATES.ORDER;
        return `Hello ${customer.customer_name}, what would you like to order?`;
      }
      return 'Customer ID not found. Please try again.';

    case STATES.ORDER:
      // Search product
      const item = searchProduct(transcript);
      if (!item || item.availability_status !== 'Available') {
        return `Sorry, that item is not available. Please choose another.`;
      }
      call.cart.push(item);
      call.state = STATES.CONFIRM;
      return `You selected ${item.item_title} for ${item.item_price}€. Shall I place the order?`;

    case STATES.CONFIRM:
      if (/yes|ja/i.test(transcript)) {
        call.state = STATES.PLACE;
        return 'Placing your order...';
      } else {
        call.state = STATES.ORDER;
        return 'Okay, please tell me another item you want to order.';
      }

    case STATES.PLACE:
      const order = await createOrder(call.customer.customer_id, call.cart);
      call.state = STATES.DONE;
      return `Order placed! Your order ID is ${order.order_id}, total ${order.total_price}€. Goodbye!`;

    case STATES.DONE:
      return 'Thank you for calling. Goodbye!';

    default:
      return 'Sorry, something went wrong.';
  }
}

module.exports = { STATES, newCallState, updateState };