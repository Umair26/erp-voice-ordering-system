require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');

const ERP_URL = process.env.ERP_URL || 'http://localhost:3000';
const API_TOKEN = process.env.API_TOKEN;
const headers = { Authorization: `Bearer ${API_TOKEN}` };

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

function extractArticleNumber(text) {
  let converted = wordsToDigits(text);

  // Fix "eight" / "acht" misheard as letter A (already converted to 8 by wordsToDigits)
  // e.g. "8 0 1 0" → "A010"
  converted = converted
    .replace(/s\s*8\s*(\d)\s*(\d)\s*(\d)\b/gi, (_, a, b, c) => `A${a}${b}${c}`)
    .replace(/\b8\s*(\d)\s*(\d)\s*(\d)\b/gi,   (_, a, b, c) => `A${a}${b}${c}`);

  console.log(`🔄 Article search in: "${converted}"`);

  // KEY FIX: match letter + up to 4 spaced single digits OR multi-digit groups
  // Handles: A010, A 010, A 0 10, A 0 1 0, A010, a010 etc.
 const match = converted.match(
  /\b([A-Za-z])\s*((?:\d+\s*){1,4})\b/
);
if (match) {
  const digits = match[2].replace(/\s+/g, '');
  if (digits.length > 4) return null;  // allow up to 4 chars before padding
    const num = parseInt(digits, 10);
    if (!isNaN(num) && num >= 1 && num <= 999) {
      return `${match[1].toUpperCase()}${String(num).padStart(3, '0')}`;
    }
  }

  return null;
}

async function searchProduct(query, language = 'EN') {
  console.log(`🔍 searchProduct: "${query}" | lang: ${language}`);

  const articleNumber = extractArticleNumber(query);
  if (articleNumber) {
    console.log(`🎯 Trying article number: ${articleNumber}`);
    try {
      const res = await axios.get(`${ERP_URL}/api/item`, {
        headers, params: { article_number: articleNumber }
      });
      if (res.data && res.data.found !== false) {
        console.log(`✅ Found by article: ${res.data.item_title}`);
        return { ...res.data, found: true };
      }
    } catch (e) {
      console.error(`❌ Article lookup failed:`, e.response?.data || e.message);
    }
  }

  // Keyword search fallback
  const cleaned = wordsToDigits(query)
    .toLowerCase()
    .replace(/(yeah|i want|i need|get me|order|item|number|article|please|it's|its|ich möchte|ich brauche|bitte|gerne)/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`🔤 Keyword search: "${cleaned}" | lang: ${language}`);
  if (cleaned.length > 2) {
    try {
      const res = await axios.get(`${ERP_URL}/api/item`, {
        headers, params: { search: cleaned, language }
      });
      if (res.data && res.data.found !== false) {
        console.log(`✅ Found by search: ${res.data.item_title}`);
        return { ...res.data, found: true };
      }
    } catch (e) {
      console.error(`❌ Search failed:`, e.response?.data || e.message);
    }
  }

  return { found: false };
}

module.exports = { searchProduct };