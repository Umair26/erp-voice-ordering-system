const { lookupCustomer, createOrder, lookupItem } = require('./erpService');

const STATES = {
  IDENTIFY: 'IDENTIFY',
  ORDER: 'ORDER',
  QUANTITY: 'QUANTITY',
  ADD_MORE: 'ADD_MORE',
  CONFIRM: 'CONFIRM',
  DONE: 'DONE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
};

function newCallState() {
  return {
    state: STATES.IDENTIFY,
    language: 'EN',
    customer: null,
    cart: [],
    currentItem: null,
    lastOrder: null,
  };
}

function wordsToDigits(text) {
  return text
    // German compounds first
    .replace(/\bneunundneunzig\b/gi, '99').replace(/\bachtundneunzig\b/gi, '98')
    .replace(/\bsiebenundneunzig\b/gi, '97').replace(/\bsechsundneunzig\b/gi, '96')
    .replace(/\bfünfundneunzig\b/gi, '95').replace(/\bvierundneunzig\b/gi, '94')
    .replace(/\bdreiundneunzig\b/gi, '93').replace(/\bzweiundneunzig\b/gi, '92')
    .replace(/\beinundneunzig\b/gi, '91')
    .replace(/\bneunundachtzig\b/gi, '89').replace(/\bachtundachtzig\b/gi, '88')
    .replace(/\bsiebenundachtzig\b/gi, '87').replace(/\bsechsundachtzig\b/gi, '86')
    .replace(/\bfünfundachtzig\b/gi, '85').replace(/\bvierundachtzig\b/gi, '84')
    .replace(/\bdreiundachtzig\b/gi, '83').replace(/\bzweiundachtzig\b/gi, '82')
    .replace(/\beinundachtzig\b/gi, '81')
    .replace(/\bneunundsiebzig\b/gi, '79').replace(/\bachtundsiebzig\b/gi, '78')
    .replace(/\bsiebenundsiebzig\b/gi, '77').replace(/\bsechsundsiebzig\b/gi, '76')
    .replace(/\bfünfundsiebzig\b/gi, '75').replace(/\bvierundsiebzig\b/gi, '74')
    .replace(/\bdreiundsiebzig\b/gi, '73').replace(/\bzweiundsiebzig\b/gi, '72')
    .replace(/\beinundsiebzig\b/gi, '71')
    .replace(/\bneunundsechzig\b/gi, '69').replace(/\bachtundsechzig\b/gi, '68')
    .replace(/\bsiebenundsechzig\b/gi, '67').replace(/\bsechsundsechzig\b/gi, '66')
    .replace(/\bfünfundsechzig\b/gi, '65').replace(/\bvierundsechzig\b/gi, '64')
    .replace(/\bdreiунdsechzig\b/gi, '63').replace(/\bzweiundsechzig\b/gi, '62')
    .replace(/\beinundsechzig\b/gi, '61')
    .replace(/\bneunundfünfzig\b/gi, '59').replace(/\bachtundfünfzig\b/gi, '58')
    .replace(/\bsiebenundfünfzig\b/gi, '57').replace(/\bsechsundfünfzig\b/gi, '56')
    .replace(/\bfünfundfünfzig\b/gi, '55').replace(/\bvierundfünfzig\b/gi, '54')
    .replace(/\bdreiунdfünfzig\b/gi, '53').replace(/\bzweiundfünfzig\b/gi, '52')
    .replace(/\beinundfünfzig\b/gi, '51')
    .replace(/\bneunundvierzig\b/gi, '49').replace(/\bachtundvierzig\b/gi, '48')
    .replace(/\bsiebenundvierzig\b/gi, '47').replace(/\bsechsundvierzig\b/gi, '46')
    .replace(/\bfünfundvierzig\b/gi, '45').replace(/\bvierundvierzig\b/gi, '44')
    .replace(/\bdreiundvierzig\b/gi, '43').replace(/\bzweiundvierzig\b/gi, '42')
    .replace(/\beinundvierzig\b/gi, '41')
    .replace(/\bneununddreißig\b/gi, '39').replace(/\bachtunddreißig\b/gi, '38')
    .replace(/\bsiebenunddreißig\b/gi, '37').replace(/\bsechsunddreißig\b/gi, '36')
    .replace(/\bfünfunddreißig\b/gi, '35').replace(/\bvierunddreißig\b/gi, '34')
    .replace(/\bdreiundrei\w*ig\b/gi, '33').replace(/\bzweiunddreißig\b/gi, '32')
    .replace(/\beinunddreißig\b/gi, '31')
    .replace(/\bneunundzwanzig\b/gi, '29').replace(/\bachtundzwanzig\b/gi, '28')
    .replace(/\bsiebenundzwanzig\b/gi, '27').replace(/\bsechsundzwanzig\b/gi, '26')
    .replace(/\bfünfundzwanzig\b/gi, '25').replace(/\bvierundzwanzig\b/gi, '24')
    .replace(/\bdreiundзwanzig\b/gi, '23').replace(/\bdreiundzwanzig\b/gi, '23')
    .replace(/\bzweiundzwanzig\b/gi, '22').replace(/\beinundzwanzig\b/gi, '21')
    // German tens
    .replace(/\bneunzig\b/gi, '90').replace(/\bachtzig\b/gi, '80')
    .replace(/\bsiebzig\b/gi, '70').replace(/\bsechzig\b/gi, '60')
    .replace(/\bfünfzig\b/gi, '50').replace(/\bvierzig\b/gi, '40')
    .replace(/\bdreißig\b/gi, '30').replace(/\bzwanzig\b/gi, '20')
    // German teens
    .replace(/\bneunzehn\b/gi, '19').replace(/\bachtzehn\b/gi, '18')
    .replace(/\bsiebzehn\b/gi, '17').replace(/\bsechzehn\b/gi, '16')
    .replace(/\bfünfzehn\b/gi, '15').replace(/\bvierzehn\b/gi, '14')
    .replace(/\bdreizehn\b/gi, '13').replace(/\bzwölf\b/gi, '12')
    .replace(/\belf\b/gi, '11').replace(/\bzehn\b/gi, '10')
    // German singles
    .replace(/\bnull\b/gi, '0').replace(/\beins\b/gi, '1').replace(/\beine\b/gi, '1').replace(/\bein\b/gi, '1')
    .replace(/\bzwei\b/gi, '2').replace(/\bdrei\b/gi, '3').replace(/\bvier\b/gi, '4')
    .replace(/\bfünf\b/gi, '5').replace(/\bsechs\b/gi, '6').replace(/\bsieben\b/gi, '7')
    .replace(/\bacht\b/gi, '8').replace(/\bneun\b/gi, '9')
    // English compounds first
    .replace(/\bninety\s*nine\b/gi, '99').replace(/\bninety\s*eight\b/gi, '98')
    .replace(/\bninety\s*seven\b/gi, '97').replace(/\bninety\s*six\b/gi, '96')
    .replace(/\bninety\s*five\b/gi, '95').replace(/\bninety\s*four\b/gi, '94')
    .replace(/\bninety\s*three\b/gi, '93').replace(/\bninety\s*two\b/gi, '92')
    .replace(/\bninety\s*one\b/gi, '91')
    .replace(/\beighty\s*nine\b/gi, '89').replace(/\beighty\s*eight\b/gi, '88')
    .replace(/\beighty\s*seven\b/gi, '87').replace(/\beighty\s*six\b/gi, '86')
    .replace(/\beighty\s*five\b/gi, '85').replace(/\beighty\s*four\b/gi, '84')
    .replace(/\beighty\s*three\b/gi, '83').replace(/\beighty\s*two\b/gi, '82')
    .replace(/\beighty\s*one\b/gi, '81')
    .replace(/\bseventy\s*nine\b/gi, '79').replace(/\bseventy\s*eight\b/gi, '78')
    .replace(/\bseventy\s*seven\b/gi, '77').replace(/\bseventy\s*six\b/gi, '76')
    .replace(/\bseventy\s*five\b/gi, '75').replace(/\bseventy\s*four\b/gi, '74')
    .replace(/\bseventy\s*three\b/gi, '73').replace(/\bseventy\s*two\b/gi, '72')
    .replace(/\bseventy\s*one\b/gi, '71')
    .replace(/\bsixty\s*nine\b/gi, '69').replace(/\bsixty\s*eight\b/gi, '68')
    .replace(/\bsixty\s*seven\b/gi, '67').replace(/\bsixty\s*six\b/gi, '66')
    .replace(/\bsixty\s*five\b/gi, '65').replace(/\bsixty\s*four\b/gi, '64')
    .replace(/\bsixty\s*three\b/gi, '63').replace(/\bsixty\s*two\b/gi, '62')
    .replace(/\bsixty\s*one\b/gi, '61')
    .replace(/\bfifty\s*nine\b/gi, '59').replace(/\bfifty\s*eight\b/gi, '58')
    .replace(/\bfifty\s*seven\b/gi, '57').replace(/\bfifty\s*six\b/gi, '56')
    .replace(/\bfifty\s*five\b/gi, '55').replace(/\bfifty\s*four\b/gi, '54')
    .replace(/\bfifty\s*three\b/gi, '53').replace(/\bfifty\s*two\b/gi, '52')
    .replace(/\bfifty\s*one\b/gi, '51')
    .replace(/\bforty\s*nine\b/gi, '49').replace(/\bforty\s*eight\b/gi, '48')
    .replace(/\bforty\s*seven\b/gi, '47').replace(/\bforty\s*six\b/gi, '46')
    .replace(/\bforty\s*five\b/gi, '45').replace(/\bforty\s*four\b/gi, '44')
    .replace(/\bforty\s*three\b/gi, '43').replace(/\bforty\s*two\b/gi, '42')
    .replace(/\bforty\s*one\b/gi, '41')
    .replace(/\bthirty\s*nine\b/gi, '39').replace(/\bthirty\s*eight\b/gi, '38')
    .replace(/\bthirty\s*seven\b/gi, '37').replace(/\bthirty\s*six\b/gi, '36')
    .replace(/\bthirty\s*five\b/gi, '35').replace(/\bthirty\s*four\b/gi, '34')
    .replace(/\bthirty\s*three\b/gi, '33').replace(/\bthirty\s*two\b/gi, '32')
    .replace(/\bthirty\s*one\b/gi, '31')
    .replace(/\btwenty\s*nine\b/gi, '29').replace(/\btwenty\s*eight\b/gi, '28')
    .replace(/\btwenty\s*seven\b/gi, '27').replace(/\btwenty\s*six\b/gi, '26')
    .replace(/\btwenty\s*five\b/gi, '25').replace(/\btwenty\s*four\b/gi, '24')
    .replace(/\btwenty\s*three\b/gi, '23').replace(/\btwenty\s*two\b/gi, '22')
    .replace(/\btwenty\s*one\b/gi, '21')
    // English tens
    .replace(/\bninety\b/gi, '90').replace(/\beighty\b/gi, '80')
    .replace(/\bseventy\b/gi, '70').replace(/\bsixty\b/gi, '60')
    .replace(/\bfifty\b/gi, '50').replace(/\bforty\b/gi, '40')
    .replace(/\bthirty\b/gi, '30').replace(/\btwenty\b/gi, '20')
    // English teens
    .replace(/\bnineteen\b/gi, '19').replace(/\beighteen\b/gi, '18')
    .replace(/\bseventeen\b/gi, '17').replace(/\bsixteen\b/gi, '16')
    .replace(/\bfifteen\b/gi, '15').replace(/\bfourteen\b/gi, '14')
    .replace(/\bthirteen\b/gi, '13').replace(/\btwelve\b/gi, '12')
    .replace(/\beleven\b/gi, '11').replace(/\bten\b/gi, '10')
    // English singles
    .replace(/\bzero\b/gi, '0').replace(/\bone\b/gi, '1')
    .replace(/\btwo\b/gi, '2').replace(/\bthree\b/gi, '3')
    .replace(/\bfour\b/gi, '4').replace(/\bfive\b/gi, '5')
    .replace(/\bsix\b/gi, '6').replace(/\bseven\b/gi, '7')
    .replace(/\beight\b/gi, '8').replace(/\bnine\b/gi, '9');
}

function wordsToNumber(text) {
  const lower = text.toLowerCase().trim().replace(/\.$/, '').trim();

  // ── Single compound word parser (no spaces) ──
  // Handles: eintausendsiebenhundertfünfundzwanzig → 1725
  let remaining = lower;
  let total = 0;

  const thousandPrefixes = {
    'zehntausend': 10000,
    'neuntausend': 9000, 'achttausend': 8000, 'siebentausend': 7000,
    'sechstausend': 6000, 'fünftausend': 5000, 'viertausend': 4000,
    'dreitausend': 3000, 'zweitausend': 2000, 'eintausend': 1000,
    'tausend': 1000,
  };
  for (const [word, val] of Object.entries(thousandPrefixes)) {
    if (remaining.startsWith(word)) {
      total += val;
      remaining = remaining.slice(word.length);
      break;
    }
  }

  const hundredPrefixes = {
    'neunhundert': 900, 'achthundert': 800, 'siebenhundert': 700,
    'sechshundert': 600, 'fünfhundert': 500, 'vierhundert': 400,
    'dreihundert': 300, 'zweihundert': 200, 'einhundert': 100,
    'hundert': 100,
  };
  for (const [word, val] of Object.entries(hundredPrefixes)) {
    if (remaining.startsWith(word)) {
      total += val;
      remaining = remaining.slice(word.length);
      break;
    }
  }

  // remove joining 'und' or 'und-'
  remaining = remaining.replace(/^und/, '').trim();

  const compounds = {
    'einundzwanzig':21,'zweiundzwanzig':22,'dreiundzwanzig':23,'vierundzwanzig':24,
    'fünfundzwanzig':25,'sechsundzwanzig':26,'siebenundzwanzig':27,'achtundzwanzig':28,'neunundzwanzig':29,
    'einunddreißig':31,'zweiunddreißig':32,'dreiundreißig':33,'dreiundreißig':33,'vierunddreißig':34,
    'fünfunddreißig':35,'sechsunddreißig':36,'siebenunddreißig':37,'achtunddreißig':38,'neununddreißig':39,
    'einundvierzig':41,'zweiundvierzig':42,'dreiundvierzig':43,'vierundvierzig':44,
    'fünfundvierzig':45,'sechsundvierzig':46,'siebenundvierzig':47,'achtundvierzig':48,'neunundvierzig':49,
    'einundfünfzig':51,'zweiundfünfzig':52,'dreiundfünfzig':53,'vierundfünfzig':54,
    'fünfundfünfzig':55,'sechsundfünfzig':56,'siebenundfünfzig':57,'achtundfünfzig':58,'neunundfünfzig':59,
    'einundsechzig':61,'zweiundsechzig':62,'dreiundsechzig':63,'vierundsechzig':64,
    'fünfundsechzig':65,'sechsundsechzig':66,'siebenundsechzig':67,'achtundsechzig':68,'neunundsechzig':69,
    'einundsiebzig':71,'zweiundsiebzig':72,'dreiundsiebzig':73,'vierundsiebzig':74,
    'fünfundsiebzig':75,'sechsundsiebzig':76,'siebenundsiebzig':77,'achtundsiebzig':78,'neunundsiebzig':79,
    'einundachtzig':81,'zweiundachtzig':82,'dreiundachtzig':83,'vierundachtzig':84,
    'fünfundachtzig':85,'sechsundachtzig':86,'siebenundachtzig':87,'achtundachtzig':88,'neunundachtzig':89,
    'einundneunzig':91,'zweiundneunzig':92,'dreiundneunzig':93,'vierundneunzig':94,
    'fünfundneunzig':95,'sechsundneunzig':96,'siebenundneunzig':97,'achtundneunzig':98,'neunundneunzig':99,
  };

  const tens = {
    'neunzig':90,'achtzig':80,'siebzig':70,'sechzig':60,
    'fünfzig':50,'vierzig':40,'dreißig':30,'zwanzig':20,
    'neunzehn':19,'achtzehn':18,'siebzehn':17,'sechzehn':16,
    'fünfzehn':15,'vierzehn':14,'dreizehn':13,'zwölf':12,'elf':11,'zehn':10,
  };

  const singles = {
    'neun':9,'acht':8,'sieben':7,'sechs':6,'fünf':5,
    'vier':4,'drei':3,'zwei':2,'eins':1,'ein':1,'null':0,
  };

  if (remaining) {
    let matched = false;
    for (const [word, val] of Object.entries(compounds)) {
      if (remaining.startsWith(word)) { total += val; matched = true; break; }
    }
    if (!matched) {
      for (const [word, val] of Object.entries(tens)) {
        if (remaining.startsWith(word)) { total += val; matched = true; break; }
      }
    }
    if (!matched) {
      for (const [word, val] of Object.entries(singles)) {
        if (remaining.startsWith(word)) { total += val; matched = true; break; }
      }
    }
  }

  if (total > 0) return total;

  // ── Fallback: spaced words with tausend/hundert ──
  const spacedThou = lower.match(/\b(ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)?\s*tausend\b/i);
  if (spacedThou) {
    const deOnes = {'ein':1,'zwei':2,'drei':3,'vier':4,'fünf':5,'sechs':6,'sieben':7,'acht':8,'neun':9,'zehn':10};
    const thousands = deOnes[spacedThou[1]] || 1;
    const afterThou = lower.slice(lower.indexOf('tausend') + 7).trim();
    const remainder = afterThou ? wordsToNumber(afterThou) : 0;
    return thousands * 1000 + (remainder || 0);
  }

  const spacedHund = lower.match(/\b(ein|zwei|drei|vier|fünf|sechs|sieben|acht|neun)?\s*hundert\b/i);
  if (spacedHund) {
    const deOnes = {'ein':1,'zwei':2,'drei':3,'vier':4,'fünf':5,'sechs':6,'sieben':7,'acht':8,'neun':9};
    const hundreds = deOnes[spacedHund[1]] || 1;
    const afterHund = lower.slice(lower.indexOf('hundert') + 7).trim();
    const remainder = afterHund ? wordsToNumber(afterHund) : 0;
    return hundreds * 100 + (remainder || 0);
  }

  // ── Fallback: single words ──
  for (const [word, val] of Object.entries(compounds)) {
    if (lower.includes(word)) return val;
  }
  for (const [word, val] of Object.entries(tens)) {
    if (lower.includes(word)) return val;
  }
  for (const [word, val] of Object.entries(singles)) {
    if (lower.includes(word)) return val;
  }

  // ── Digit fallback ──
  const numMatch = lower.match(/\d+/);
  if (numMatch) return parseInt(numMatch[0], 10);

  return null;
}

function extractCustomerId(transcript) {
  let converted = wordsToDigits(transcript);

  // Fix German Deepgram mishearing "C" as "ZEE", "ZE", "SEE", "SE", "TSEE"
  converted = converted
    .replace(/\b(zee|zeh|ze|see|se|tsee)\s*/gi, 'C ');

  console.log(`🔄 Converted: "${converted}"`);

  const allMatches = [...converted.matchAll(/\bc\s*(\d[\s\d]*)/gi)];
  if (allMatches.length > 0) {
    const lastMatch = allMatches[allMatches.length - 1];
    const digits = lastMatch[1].replace(/\s+/g, '').slice(0, 3).padStart(3, '0');
    const id = `C${digits}`;
    if (id !== 'C000') return id;
  }

  const numMatch = converted.match(/(?<![a-zA-Z])(\d\s*\d\s*\d|\d\s*\d|\d)(?!\s*\d)/);
  if (numMatch) {
    const digits = numMatch[1].replace(/\s+/g, '').padStart(3, '0').slice(0, 3);
    const id = `C${digits}`;
    if (id !== 'C000') return id;
  }

  return null;
}

function extractQuantity(transcript) {
  // Strip trailing period Deepgram sometimes adds
  const lower = transcript.toLowerCase().trim().replace(/\.$/, '').trim();

  const wordQty = wordsToNumber(lower);
  if (wordQty && wordQty > 0) return wordQty;

  const converted = wordsToDigits(transcript);
  const match = converted.match(/\b(\d{1,6})\b/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num > 0) return num;
  }

  return 1;
}

function formatPrice(price, language = 'EN') {
  const dollars = Math.floor(price);
  const cents = Math.round((price - dollars) * 100);
  if (language === 'DE') {
    if (cents === 0) return `${dollars} Euro`;
    return `${dollars} Euro und ${cents} Cent`;
  }
  if (cents === 0) return `${dollars} dollars`;
  return `${dollars} dollars and ${cents} cents`;
}

function speakOrderNumber(orderId) {
  const digits = orderId.replace('ORD-', '');
  const digitWords = {
    '0':'zero','1':'one','2':'two','3':'three','4':'four',
    '5':'five','6':'six','7':'seven','8':'eight','9':'nine'
  };
  return digits.split('').map(d => digitWords[d] || d).join(' ');
}

function speakOrderNumberDE(orderId) {
  const digits = orderId.replace('ORD-', '');
  const digitWords = {
    '0':'null','1':'eins','2':'zwei','3':'drei','4':'vier',
    '5':'fünf','6':'sechs','7':'sieben','8':'acht','9':'neun'
  };
  return digits.split('').map(d => digitWords[d] || d).join(' ');
}

function extractProductFromMixed(transcript) {
  return transcript
    .replace(/\b(yes|ja|sure|ok|okay|please|add|also|und|und auch|ich möchte|ich brauche|bitte|gerne|get me)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function updateState(state, transcript) {
  const text = transcript.toLowerCase().trim();
  const de = state.language === 'DE' || state.customer?.language === 'DE';
  console.log(`📊 State: ${state.state} | Lang: ${state.language} | Input: "${transcript}"`);

  // ── IDENTIFY ──
  if (state.state === STATES.IDENTIFY) {
    const customerId = extractCustomerId(transcript);
    console.log(`🔍 Extracted customer ID: ${customerId}`);

    if (!customerId) {
      return de
        ? 'Ich konnte Ihre Kundennummer nicht verstehen. Bitte nennen Sie Ihre Kundennummer.'
        : 'I could not understand your customer ID. Please say your customer ID starting with C.';
    }

    try {
      const customer = await lookupCustomer(customerId);
      if (customer && customer.found) {
        state.customer = customer;
        state.state = STATES.ORDER;
        const isDE = state.language === 'DE';
        return isDE
          ? `Hallo ${customer.customer_name}. Was möchten Sie bestellen?`
          : `Hello ${customer.customer_name}, welcome. What would you like to order today?`;
      }
    } catch (e) {
      console.error('Customer lookup error:', e.message);
    }

    return de
      ? 'Kunde nicht gefunden. Bitte versuchen Sie es erneut mit Ihrer Kundennummer.'
      : 'Customer not found. Please try again with your customer ID starting with C.';
  }

  // ── ORDER ──
  if (state.state === STATES.ORDER) {
    const nothingIntent = /\b(nothing|no more|that'?s all|done|finished|nichts|das war alles|fertig|nein danke)\b/i.test(text);
    if (nothingIntent) {
      if (state.cart.length > 0) {
        state.state = STATES.CONFIRM;
        const totalAmount = state.cart.reduce((sum, i) => sum + i.total_price, 0);
        const summary = state.cart.map(i => `${i.quantity} ${de ? i.item.item_title_DE || i.item.item_title : i.item.item_title}`).join(', ');
        return de
          ? `Sie haben folgendes im Warenkorb: ${summary}. Gesamt: ${formatPrice(totalAmount, 'DE')}. Soll ich bestellen?`
          : `You have ${summary} in your cart. Total is ${formatPrice(totalAmount)}. Shall I place the order?`;
      } else {
        return de
          ? 'Was möchten Sie bestellen? Bitte nennen Sie die Artikelnummer oder den Produktnamen.'
          : 'What would you like to order? Please provide the article number or product name.';
      }
    }

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
      const { searchProduct } = require('./semanticSearch');
      item = await searchProduct(transcript, de ? 'DE' : 'EN');
    }

    if (item && item.found) {
      if (item.availability_status === 'Out of stock') {
        const title = de ? (item.item_title_DE || item.item_title) : item.item_title;
        state.state = STATES.OUT_OF_STOCK;
        return de
          ? `${title} ist leider nicht auf Lager. Möchten Sie etwas anderes?`
          : `${title} is out of stock. Would you like something else?`;
      }
      state.currentItem = item;
      state.state = STATES.QUANTITY;
      const title = de ? (item.item_title_DE || item.item_title) : item.item_title;
      return de
        ? `Ich habe ${title} gefunden. Wie viele möchten Sie?`
        : `I found ${item.item_title}. How many would you like?`;
    }

    return de
      ? 'Produkt nicht gefunden. Bitte nennen Sie die Artikelnummer oder den Produktnamen.'
      : 'I could not find that product. Please provide the article number or product name.';
  }

  // ── QUANTITY ──
  if (state.state === STATES.QUANTITY) {
    const qty = extractQuantity(transcript);

    if (qty > 0 && state.currentItem) {
      const totalPrice = qty * parseFloat(state.currentItem.item_price || 0);
      state.cart.push({
        article_number: state.currentItem.article_number,
        quantity: qty,
        item: state.currentItem,
        item_title_DE: state.currentItem.item_title_DE,
        total_price: totalPrice,
      });
      state.currentItem = null;
      state.state = STATES.ADD_MORE;
      const lastItem = state.cart[state.cart.length - 1];
      const title = de ? (lastItem.item_title_DE || lastItem.item.item_title) : lastItem.item.item_title;
      return de
        ? `${qty} ${title} wurde hinzugefügt. Möchten Sie noch etwas bestellen?`
        : `Got it, ${qty} ${lastItem.item.item_title} added. Would you like to add another item?`;
    }

    return de
      ? 'Menge nicht verstanden. Bitte sagen Sie eine Zahl.'
      : 'I did not understand the quantity. Please say a number.';
  }

  // ── ADD MORE ──
  if (state.state === STATES.ADD_MORE) {
    const yes = /\b(yes|ja|more|add|another|other|want|sure|also|noch|weitere|mehr)\b/i.test(text);
    const no  = /\b(no|nein|done|finished|that'?s|nothing|complete|confirm|place|order|fertig|nein danke|das war alles)\b/i.test(text);

    if (no) {
      state.state = STATES.CONFIRM;
      const totalAmount = state.cart.reduce((sum, i) => sum + i.total_price, 0);
      const summary = state.cart.map(i => {
        const title = de ? (i.item_title_DE || i.item.item_title) : i.item.item_title;
        return `${i.quantity} ${title}`;
      }).join(', ');
      return de
        ? `Zusammenfassung: ${summary}. Gesamt: ${formatPrice(totalAmount, 'DE')}. Soll ich die Bestellung aufgeben?`
        : `Your order has ${summary}. Total is ${formatPrice(totalAmount)}. Shall I place the order?`;
    }

    if (yes) {
      const productHint = extractProductFromMixed(transcript);
      const hasProduct = productHint.length > 3 &&
        !/^(yes|ja|sure|ok|okay|please|add|more|another|noch|mehr)$/i.test(productHint.trim());

      state.state = STATES.ORDER;

      if (hasProduct) {
        return await updateState(state, productHint);
      }

      return de ? 'Was möchten Sie noch bestellen?' : 'What else would you like to order?';
    }

    return de ? 'Bitte sagen Sie Ja oder Nein.' : 'Please say yes or no.';
  }

  // ── CONFIRM ──
  if (state.state === STATES.CONFIRM) {
    const yes = /\b(yes|ja|correct|confirm|proceed|go|ok|okay|place|sure|bestellen|ja bitte|jawohl)\b/i.test(text);
    const no  = /\b(no|nein|cancel|back|change|modify|abbrechen|ändern)\b/i.test(text);

    if (yes) {
      try {
        const order = await createOrder(
          state.customer.customer_id,
          state.cart.map(i => ({ article_number: i.article_number, quantity: i.quantity }))
        );
        state.state = STATES.DONE;
        if (order.order_created) {
          state.lastOrder = order;
          const totalAmount = state.cart.reduce((sum, i) => sum + i.total_price, 0);
          const spokenId = de ? speakOrderNumberDE(order.order_id) : speakOrderNumber(order.order_id);
          return de
            ? 'Auf Wiedersehen!'
            : 'Thank you for calling. Goodbye!';
        }
      } catch (e) {
        console.error('Order error:', e.message);
      }
      return de
        ? 'Es tut uns leid, es gab einen Fehler. Auf Wiedersehen!'
        : 'Sorry, there was an error placing your order. Thank you, goodbye!';
    }

    if (no) {
      state.state = STATES.ORDER;
      state.cart = [];
      return de
        ? 'Kein Problem. Was möchten Sie bestellen?'
        : 'No problem. What would you like to order?';
    }

    return de ? 'Bitte sagen Sie Ja oder Nein.' : 'Please say yes oder no.';
  }

  // ── OUT OF STOCK ──
  if (state.state === STATES.OUT_OF_STOCK) {
    const yes = /\b(yes|ja|sure|ok|okay|bitte|gerne|natürlich|klar)\b/i.test(text);
    const no  = /\b(no|nein|danke|nein danke|fertig|das war alles)\b/i.test(text);

    if (yes) {
      state.state = STATES.ORDER;
      return de
        ? 'Was möchten Sie bestellen? Bitte nennen Sie die Artikelnummer oder den Produktnamen.'
        : 'What would you like to order? Please provide the article number or product name.';
    }

    if (no) {
      if (state.cart.length > 0) {
        state.state = STATES.CONFIRM;
        const totalAmount = state.cart.reduce((sum, i) => sum + i.total_price, 0);
        const summary = state.cart.map(i => {
          const title = de ? (i.item_title_DE || i.item.item_title) : i.item.item_title;
          return `${i.quantity} ${title}`;
        }).join(', ');
        return de
          ? `Zusammenfassung: ${summary}. Gesamt: ${formatPrice(totalAmount, 'DE')}. Soll ich die Bestellung aufgeben?`
          : `Your order has ${summary}. Total is ${formatPrice(totalAmount)}. Shall I place the order?`;
      } else {
        state.state = STATES.DONE;
        return de ? 'Auf Wiedersehen!' : 'Thank you. Goodbye!';
      }
    }

    return de
      ? 'Möchten Sie etwas anderes bestellen? Bitte sagen Sie Ja oder Nein.'
      : 'Would you like to order something else? Please say yes or no.';
  }

  // ── DONE ──
  if (state.state === STATES.DONE) {
    return de ? 'Ihre Sitzung ist beendet. Auf Wiedersehen.' : 'Your session has ended. Goodbye.';
  }

  return null;
}

module.exports = { newCallState, updateState };