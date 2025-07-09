// Test script to verify anomaly ID handling
const testAnomalyIds = [
  "valid-string-id",
  123,
  null,
  undefined,
  { id: "object-id" },
  "",
  "  whitespace  ",
  "undefined",
  "null"
];

function validateAnomalyIds(anomalyIds) {
  return anomalyIds
    .map(id => {
      // Handle different types of IDs
      if (id === null || id === undefined) return null;
      if (typeof id === 'string') return id.trim();
      if (typeof id === 'number') return String(id);
      if (typeof id === 'object') {
        try {
          const stringified = String(id);
          if (stringified !== '[object Object]') return stringified;
        } catch (e) {
          // Ignore conversion errors
        }
      }
      console.warn('Invalid anomaly ID detected:', id, typeof id);
      return null;
    })
    .filter(id => id !== null && id.length > 0 && id !== 'undefined' && id !== 'null');
}

console.log('Testing anomaly ID validation...');
console.log('Input:', testAnomalyIds);
console.log('Output:', validateAnomalyIds(testAnomalyIds));
