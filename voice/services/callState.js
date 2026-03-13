const { lookupCustomer, createOrder, lookupItem } = require('./erpService');

const STATES = {
  IDENTIFY: 'IDENTIFY',
  ORDER: 'ORDER',
  QUANTITY: 'QUANTITY',
  ADD_MORE: 'ADD_MORE',
  CONFIRM: 'CONFIRM',
  DONE: 'DONE',
};

function newCallState() {
  return {
    state: STATES.IDENTIFY,
    customer: null,
    cart: [],
    currentItem: null,
    lastPrompt: null, // track last question asked
  };
}

function wordsToDigits(text) {
  return text
    .replace(/\bzero\b/gi, '0').replace(/\bone\b/gi, '1')
    .replace(/\btwo\b/gi, '2').replace(/\bthree\b/gi, '3')
    .replace(/\bfour\b/gi, '4').replace(/\bfive\b/gi, '5')
    .replace(/\bsix\b/gi, '6').replace(/\bseven\b/gi, '7')
    .replace(/\beight\b/gi, '8').replace(/\bnine\b/gi, '9');
}

function wordsToNumber(text) {
  const map = {
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100,
  };
  const lower = text.toLowerCase();
  for (const [word, val] of Object.entries(map)) {
    if (lower.includes(word)) return val;
  }
  return null;
}

function extractCustomerId(transcript) {
  const converted = wordsToDigits(transcript);
  console.log(`🔄 Converted: "${converted}"`);

  const match = converted.match(/c\s*(\d[\s\d]*\d|\d)/i);
  if (match) {
    const digits = match[1].replace(/\s+/g, '').padStart(3, '0').slice(0, 3);
    return `C${digits}`;
  }

  const numMatch = converted.match(/(?<![a-z\d])(\d[\s]*\d[\s]*\d|\d[\s]*\d|\d)(?![a-z\d])/i);
  if (numMatch) {
    const digits = numMatch[1].replace(/\s+/g, '').padStart(3, '0').slice(0, 3);
    return `C${digits}`;
  }

  return null;
}

function extractQuantity(transcript) {
  // Try word numbers first (thirty, twenty, etc.)
  const wordQty = wordsToNumber(transcript);
  if (wordQty) return wordQty;

  // Then digit conversion
  const converted = wordsToDigits(transcript);
  const match = converted.match(/(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

function cleanProductQuery(transcript) {
  return transcript
    .replace(/\b(i want|i need|get me|order|item|number|article|please|yeah|it's|its)\b/gi, ' ')
    .replace(/\b(pcs?|pieces?|boxes?|units?)\b/gi, ' ')
    .replace(/\d+/g, ' ')
    .trim();
}

// Returns a re-prompt if the state needs one after reconnection
function getRePrompt(state) {
  const de = state.customer?.language === 'DE';
  switch (state.state) {
    case STATES.ORDER:
      return de ? 'Was möchten Sie bestellen?' : 'What would you like to order?';
    case STATES.QUANTITY:
      return de
        ? `Wie viele ${state.currentItem?.item_title} möchten Sie?`
        : `How many ${state.currentItem?.item_title} would you like?`;
    case STATES.ADD_MORE:
      return de ? 'Möchten Sie noch etwas bestellen?' : 'Would you like to add another item?';
    case STATES.CONFIRM:
      return de ? 'Soll ich die Bestellung aufgeben?' : 'Shall I place the order?';
    default:
      return null;
  }
}

async function updateState(state, transcript) {
  const text = transcript.toLowerCase().trim();
  console.log(`📊 State: ${state.state} | Input: "${transcript}"`);

  // ── IDENTIFY ──
  if (state.state === STATES.IDENTIFY) {
    const customerId = extractCustomerId(transcript);
    console.log(`🔍 Extracted customer ID: ${customerId}`);

    if (customerId) {
      try {
        const customer = await lookupCustomer(customerId);
        if (customer && customer.found) {
          state.customer = customer;
          state.state = STATES.ORDER;
          const de = customer.language === 'DE';
          return de
            ? `Guten Tag ${customer.customer_name}. Was möchten Sie bestellen?`
            : `Hello ${customer.customer_name}. What would you like to order?`;
        }
      } catch (e) {
        console.error('Customer lookup error:', e.message);
      }
    }
    return 'I could not find that customer ID. Please say your customer ID.';
  }

  // ── ORDER ──
  if (state.state === STATES.ORDER) {
    const de = state.customer?.language === 'DE';

    // Try article number via ERP first
    const articleMatch = transcript.toUpperCase().match(/A\s*(\d{3})/);
    let item = null;

    if (articleMatch) {
      try {
        const result = await lookupItem(`A${articleMatch[1]}`);
        if (result && result.found) item = result;
      } catch (e) {
        console.error('Item lookup error:', e.message);
      }
    }

    if (!item) {
      const cleanQuery = cleanProductQuery(transcript);
      if (cleanQuery.trim()) {
        const { searchProduct } = require('./semanticSearch');
        item = await searchProduct(transcript); // pass full transcript for A/eight fix
      }
    }

    if (item && item.found) {
      if (item.availability_status === 'Out of stock') {
        return de
          ? `${item.item_title} ist leider nicht auf Lager. Möchten Sie etwas anderes?`
          : `${item.item_title} is out of stock. Would you like something else?`;
      }
      state.currentItem = item;
      state.state = STATES.QUANTITY;
      return de
        ? `Ich habe ${item.item_title} gefunden, Preis ${item.item_price} Euro. Wie viele möchten Sie?`
        : `I found ${item.item_title}, price $${item.item_price}. How many would you like?`;
    }

    return de
      ? 'Produkt nicht gefunden. Bitte nennen Sie die Artikelnummer oder den Produktnamen.'
      : 'I could not find that product. Please provide the article number or product name.';
  }

  // ── QUANTITY ──
  if (state.state === STATES.QUANTITY) {
    const de = state.customer?.language === 'DE';
    const qty = extractQuantity(transcript);

    if (qty > 0 && state.currentItem) {
      const totalPrice = qty * parseFloat(state.currentItem.item_price || 0);
      state.cart.push({
        article_number: state.currentItem.article_number,
        quantity: qty,
        item: state.currentItem,
        total_price: totalPrice,
      });
      state.currentItem = null;
      state.state = STATES.ADD_MORE;

      const lastItem = state.cart[state.cart.length - 1];
      return de
        ? `${qty}x ${lastItem.item.item_title} = ${totalPrice.toFixed(2)} Euro. Möchten Sie noch etwas bestellen?`
        : `${qty}x ${lastItem.item.item_title} = $${totalPrice.toFixed(2)}. Would you like to add another item?`;
    }

    return de
      ? 'Menge nicht verstanden. Bitte sagen Sie eine Zahl.'
      : 'I did not understand the quantity. Please say a number.';
  }

  // ── ADD MORE ──
  if (state.state === STATES.ADD_MORE) {
    const de = state.customer?.language === 'DE';
    const yes = /yes|ja|more|add|another|other|want|sure/i.test(text);
    const no  = /no|nein|done|finished|that'?s|nothing|complete|confirm|place|order/i.test(text);

    if (yes) {
      state.state = STATES.ORDER;
      return de ? 'Was möchten Sie noch bestellen?' : 'What else would you like to order?';
    }
    if (no) {
      state.state = STATES.CONFIRM;
      const totalAmount = state.cart.reduce((sum, i) => sum + i.total_price, 0);
      const summary = state.cart.map(i => `${i.quantity}x ${i.item.item_title}`).join(', ');
      return de
        ? `Zusammenfassung: ${summary}. Gesamt: ${totalAmount.toFixed(2)} Euro. Soll ich bestellen?`
        : `Order summary: ${summary}. Total: $${totalAmount.toFixed(2)}. Shall I place the order?`;
    }
    return de ? 'Bitte sagen Sie Ja oder Nein.' : 'Please say yes or no.';
  }

  // ── CONFIRM ──
  if (state.state === STATES.CONFIRM) {
    const de = state.customer?.language === 'DE';
    const yes = /yes|ja|correct|confirm|proceed|go|ok|okay|place|sure/i.test(text);
    const no  = /no|nein|cancel|back|change|modify/i.test(text);

    if (yes) {
      try {
        const order = await createOrder(
          state.customer.customer_id,
          state.cart.map(i => ({ article_number: i.article_number, quantity: i.quantity }))
        );
        state.state = STATES.DONE;
        if (order.order_created) {
          return de
            ? `Bestellung ${order.order_id} aufgegeben. Gesamt: ${order.total_price} Euro. Auf Wiedersehen!`
            : `Order ${order.order_id} placed. Total: $${order.total_price}. Thank you, goodbye!`;
        }
      } catch (e) {
        console.error('Order error:', e.message);
      }
      return 'Sorry, there was an error placing your order. Goodbye.';
    }
    if (no) {
      state.state = STATES.ORDER;
      state.cart = [];
      return de ? 'Kein Problem. Was möchten Sie bestellen?' : 'No problem. What would you like to order?';
    }
    return de ? 'Bitte sagen Sie Ja oder Nein.' : 'Please say yes or no.';
  }

  if (state.state === STATES.DONE) {
    return 'Your session has ended. Goodbye.';
  }

  return null;
}

module.exports = { newCallState, updateState, getRePrompt };