const { lookupCustomer, createOrder, lookupItem } = require('./erpService');

const STATES = {
  IDENTIFY: 'IDENTIFY',
  ORDER: 'ORDER',
  QUANTITY: 'QUANTITY',
  ADD_MORE: 'ADD_MORE',
  CONFIRM: 'CONFIRM',
  PLACE: 'PLACE',
  DONE: 'DONE',
};

function newCallState() {
  return {
    state: STATES.IDENTIFY,
    customer: null,
    cart: [],
    currentItem: null,  // Item being discussed
    currentQty: null,   // Quantity for current item
  };
}

// Convert spoken numbers to digits: "zero zero one" → "001"
function wordsToDigits(text) {
  return text
    .toLowerCase()
    .replace(/\bzero\b/g, '0')
    .replace(/\bone\b/g, '1')
    .replace(/\btwo\b/g, '2')
    .replace(/\bthree\b/g, '3')
    .replace(/\bfour\b/g, '4')
    .replace(/\bfive\b/g, '5')
    .replace(/\bsix\b/g, '6')
    .replace(/\bseven\b/g, '7')
    .replace(/\beight\b/g, '8')
    .replace(/\bnine\b/g, '9')
    .replace(/\s+/g, '');
}

// Enhanced customer ID extraction with flexible intent handling
function extractCustomerId(transcript) {
  // Remove common conversational filler
  let cleaned = transcript
    .toLowerCase()
    .replace(/\b(my|the|yeah|okay|ok|let me check|it'?s|is)\b/gi, ' ')
    .trim();

  // Convert spoken digits to numbers
  cleaned = wordsToDigits(cleaned);

  // Extract customer ID (optional 'c' prefix + 1-3 digits)
  const match = cleaned.match(/c?(\d{1,3})/);
  return match ? match[0] : null;
}

// Extract quantity from product requests
function extractQuantity(transcript) {
  const qtyMatch = transcript.match(/(\d+)\s*(pcs?|pieces?|boxes?|units?)?/i);
  return qtyMatch ? parseInt(qtyMatch[1]) : 1;
}

// Clean product search query (remove intent words)
function cleanProductQuery(transcript) {
  return transcript
    .replace(/\b(i want|i need|get me|show me|send|give me|bring me|can you|could you|would you|i'd like|i'll have)\b/gi, ' ')
    .replace(/\b(pcs?|pieces?|boxes?|units?)\b/gi, ' ')
    .trim();
}

async function updateState(state, transcript) {
  const text = transcript.toLowerCase().trim();
  console.log(`📊 State: ${state.state} | Input: "${transcript}"`);

  if (state.state === STATES.IDENTIFY) {
    // Use enhanced extraction for flexible customer ID input
    const customerId = extractCustomerId(transcript);

    if (customerId) {
      console.log(`🔍 Looking up customer: ${customerId}`);
      try {
        const customer = await lookupCustomer(customerId);
        if (customer && customer.found) {
          state.customer = customer;
          state.state = STATES.ORDER;
          const de = customer.language === 'DE';
          return de
            ? `Guten Tag ${customer.customer_name}. Was möchten Sie bestellen?`
            : `Thank you. Which item would you like to order? Please provide the item name or article number.`;
        } else {
          const de = customer?.language === 'DE';
          return de
            ? 'Kunde nicht gefunden. Bitte versuchen Sie es erneut.'
            : 'Customer not found. Please try again.';
        }
      } catch (e) {
        console.error('Customer lookup error:', e.message);
        const de = state.customer?.language === 'DE';
        return de
          ? 'Es gab einen Fehler. Bitte versuchen Sie es erneut.'
          : 'There was an error. Please try again.';
      }
    }

    return 'I could not understand that. Please say your customer ID.';
  }

  if (state.state === STATES.ORDER) {
    const de = state.customer?.language === 'DE';

    // Try to extract article number first (e.g., "A001" or "item number A001")
    const articleMatch = transcript.toUpperCase().match(/([A-Z]\d{3,})/);
    let item = null;

    if (articleMatch) {
      // Look up by article number
      try {
        const result = await lookupItem(articleMatch[0]);
        if (result && result.found) {
          item = result;
        }
      } catch (e) {
        console.error('Item lookup error:', e.message);
      }
    }

    // If not found by article number, try semantic search
    if (!item) {
      const cleanQuery = cleanProductQuery(transcript);
      const { searchProduct } = require('./semanticSearch');
      item = await searchProduct(cleanQuery);
    }

    // Handle product found or not found
    if (item && item.found) {
      // Check stock status
      const inStock = item.stock_quantity && item.stock_quantity > 0;

      if (!inStock) {
        // Out of stock - ask to try another item
        return de
          ? `${item.item_title} ist leider nicht verfügbar. Möchten Sie einen anderen Artikel bestellen?`
          : `${item.item_title} is out of stock. Would you like to search for another item?`;
      }

      // In stock - ask for quantity
      state.currentItem = item;
      state.state = STATES.QUANTITY;
      return de
        ? `Ich habe ${item.item_title} gefunden. Wie viele möchten Sie?`
        : `${item.item_title} is in stock. Tell me about the quantity you want to add.`;
    }

    // Product not found
    return de
      ? 'Ich habe das Produkt nicht gefunden. Bitte nennen Sie die Artikelnummer oder den Produktnamen.'
      : 'I could not find that product. Please provide the article number or product name.';
  }

  if (state.state === STATES.QUANTITY) {
    const de = state.customer?.language === 'DE';
    const qty = extractQuantity(transcript);

    if (qty > 0 && state.currentItem) {
      // Calculate total price
      const totalPrice = qty * parseFloat(state.currentItem.item_price || 0);

      // Add item to cart
      state.cart.push({
        article_number: state.currentItem.article_number,
        quantity: qty,
        item: state.currentItem,
        total_price: totalPrice,
      });

      state.currentItem = null; // Clear current item

      // Move to ADD_MORE state
      state.state = STATES.ADD_MORE;
      return de
        ? `Alles klar: ${qty}x ${state.cart[state.cart.length - 1].item.item_title} = ${totalPrice.toFixed(2)} Euro. Möchten Sie ein weiteres Artikel bestellen?`
        : `Got it: ${qty}x ${state.cart[state.cart.length - 1].item.item_title} = $${totalPrice.toFixed(2)}. Do you want to add another item?`;
    }

    return de
      ? 'Ich habe die Menge nicht verstanden. Bitte sagen Sie eine Zahl.'
      : 'I did not understand the quantity. Please say a number.';
  }

  if (state.state === STATES.ADD_MORE) {
    const de = state.customer?.language === 'DE';
    const yes = /yes|ja|correct|richtig|order|bestell|confirm|add|more|add more|another|other|want/i.test(text);
    const no  = /no|nein|cancel|abbruch|done|finished|that's|thats|it|nothing|nothing more/i.test(text);

    if (yes) {
      state.state = STATES.ORDER;
      return de
        ? 'Was möchten Sie noch bestellen?'
        : 'What else would you like to order?';
    }

    if (no) {
      state.state = STATES.CONFIRM;
      // Calculate total amount
      const totalAmount = state.cart.reduce((sum, item) => sum + item.total_price, 0);
      const itemSummary = state.cart
        .map(item => `${item.quantity}x ${item.item.item_title} = $${item.total_price.toFixed(2)}`)
        .join(', ');
      return de
        ? `Zusammenfassung: ${itemSummary}. Gesamtbetrag: ${totalAmount.toFixed(2)} Euro. Soll ich die Bestellung aufgeben?`
        : `Order summary: ${itemSummary}. Your total is $${totalAmount.toFixed(2)}. Can I proceed with the order?`;
    }

    return de
      ? 'Bitte sagen Sie Ja oder Nein.'
      : 'Please say yes or no.';
  }

  if (state.state === STATES.CONFIRM) {
    const yes = /yes|ja|correct|richtig|order|bestell|confirm|proceed|go|ok|okay|done/i.test(text);
    const no  = /no|nein|cancel|abbruch|back|different|change|modify/i.test(text);

    if (yes) {
      try {
        const order = await createOrder(
          state.customer.customer_id,
          state.cart.map(i => ({ article_number: i.article_number, quantity: i.quantity }))
        );
        state.state = STATES.DONE;
        const totalAmount = state.cart.reduce((sum, item) => sum + item.total_price, 0);
        if (order.order_created) {
          return state.customer?.language === 'DE'
            ? `Ihre Bestellung ${order.order_id} wurde aufgegeben. Gesamtpreis: ${order.total_price} Euro. Auf Wiedersehen!`
            : `Your order ${order.order_id} has been placed. Total: $${totalAmount.toFixed(2)}. Thank you, goodbye!`;
        }
      } catch (e) {
        console.error('Order error:', e.message);
      }
      return 'Sorry, there was an error placing your order. Goodbye.';
    }

    if (no) {
      state.state = STATES.ORDER;
      state.cart = []; // Clear cart to start fresh
      return state.customer?.language === 'DE'
        ? 'Kein Problem. Was möchten Sie stattdessen bestellen?'
        : 'No problem. What would you like to order instead?';
    }

    return state.customer?.language === 'DE'
      ? 'Bitte sagen Sie Ja oder Nein.'
      : 'Please say yes or no.';
  }

  if (state.state === STATES.DONE) {
    return 'Your session has ended. Goodbye.';
  }

  return null;
}

module.exports = { newCallState, updateState };
