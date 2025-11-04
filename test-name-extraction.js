// Test script for name extraction validation
// Run with: node test-name-extraction.js

const testCases = [
  // Should ACCEPT these as valid names
  { input: "I'm John Smith", expected: "John Smith", shouldAccept: true },
  { input: "My name is Sarah", expected: "Sarah", shouldAccept: true },
  { input: "Alex", expected: "Alex", shouldAccept: true },
  { input: "James", expected: "James", shouldAccept: true },
  { input: "Mary Ann", expected: "Mary Ann", shouldAccept: true },
  
  // Should REJECT these (contain numbers)
  { input: "+16479896110", expected: null, shouldAccept: false },
  { input: "14167322654", expected: null, shouldAccept: false },
  { input: "My name is 16479896110", expected: null, shouldAccept: false },
  { input: "John123", expected: null, shouldAccept: false },
  { input: "919400618778", expected: null, shouldAccept: false },
  { input: "+918800166331", expected: null, shouldAccept: false },
  { input: "916383479198", expected: null, shouldAccept: false },
  
  // Should REJECT common non-names
  { input: "yes", expected: null, shouldAccept: false },
  { input: "ok", expected: null, shouldAccept: false },
  { input: "hello", expected: null, shouldAccept: false },
  { input: "hi there", expected: null, shouldAccept: false },
];

function extractNameFromText(text) {
  try {
    const raw = (text || '').trim();
    if (!raw) return null;

    // Reject any text that contains digits (phone numbers, etc.)
    if (/\d/.test(raw)) return null;

    // Common patterns: "I'm X", "I am X", "This is X", "My name is X"
    const patterns = [
      /(my\s+name\s*'?s?\s+is|i am|i'm|this is|it is|it's)\s+([A-Za-z][A-Za-z'\- ]{1,40})/i
    ];
    for (const re of patterns) {
      const m = raw.match(re);
      if (m) {
        const candidate = m[2];
        // Double check no digits in extracted name
        if (/\d/.test(candidate)) continue;
        const cleaned = cleanName(candidate);
        if (cleaned) return cleaned;
      }
    }

    // If the message is short and looks like a name (<= 3 words, mostly letters)
    const words = raw.split(/\s+/).filter(Boolean);
    const greetings = ['hi', 'hello', 'hey', 'good', 'morning', 'evening', 'afternoon'];
    const onlyLetters = /^[A-Za-z][A-Za-z'\- ]{0,40}$/;
    if (words.length > 0 && words.length <= 3 && onlyLetters.test(raw.toLowerCase().replace(/\b(?:from|at|of)\b.*$/i, '').trim())) {
      const lower = raw.toLowerCase();
      if (!greetings.some(g => lower.includes(g))) {
        const cleaned = cleanName(raw);
        if (cleaned) return cleaned;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function cleanName(candidate) {
  // First check: reject if contains any digits
  if (/\d/.test(candidate)) return null;
  
  const stopTokens = /( from | at | of | the |\,|\.|\||\-|\+|\(|\))/i;
  let name = candidate.split('\n')[0];
  const idx = name.search(stopTokens);
  if (idx > 0) name = name.slice(0, idx);
  name = name.replace(/[^A-Za-z'\- ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) return null;
  
  // Reject if still contains digits after cleaning
  if (/\d/.test(name)) return null;
  
  // Title Case
  name = name.split(' ').slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  
  // Basic sanity checks
  if (name.length < 2) return null;
  
  // Reject common non-name words
  const invalidNames = ['yes', 'no', 'ok', 'okay', 'sure', 'thanks', 'thank', 'please', 'hi', 'hello', 'hey'];
  if (invalidNames.includes(name.toLowerCase())) return null;
  
  return name;
}

console.log('Testing Name Extraction & Validation\n');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, idx) => {
  const result = extractNameFromText(testCase.input);
  const success = testCase.shouldAccept 
    ? result === testCase.expected 
    : result === null;
  
  if (success) {
    passed++;
    console.log(`✓ Test ${idx + 1}: PASS`);
  } else {
    failed++;
    console.log(`✗ Test ${idx + 1}: FAIL`);
    console.log(`  Input: "${testCase.input}"`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got: ${result}`);
  }
});

console.log('='.repeat(70));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('\n✓ All tests passed! Name extraction is working correctly.');
} else {
  console.log('\n✗ Some tests failed. Please review the implementation.');
  process.exit(1);
}
