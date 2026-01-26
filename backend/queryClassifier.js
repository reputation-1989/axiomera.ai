// Smart Query Classification System
// Determines task type and REQUIRED complexity (not debate intensity)

function classifyQuery(prompt) {
  const promptLower = prompt.toLowerCase();

  const codeKeywords = [
    'write a function', 'write code', 'implement', 'algorithm',
    'debug', 'fix this code', 'program', 'script', 'class',
    'codeforces', 'leetcode', 'solve:', 'java', 'python', 'c++',
    'javascript', 'function to', 'method to'
  ];

  const creativeKeywords = [
    'story', 'poem', 'creative', 'imagine', 'brainstorm',
    'design', 'fiction', 'narrative'
  ];

  const analyticalKeywords = [
    'analyze', 'compare', 'evaluate', 'pros and cons',
    'which is better', 'should i', 'worth it'
  ];

  const isCode = codeKeywords.some(k => promptLower.includes(k));
  const isCreative = creativeKeywords.some(k => promptLower.includes(k));
  const isAnalytical = analyticalKeywords.some(k => promptLower.includes(k));

  if (isCode) {
    return {
      type: 'code',
      complexity: 'high',
      enableCodeExecution: true
    };
  }

  if (isAnalytical) {
    return {
      type: 'analytical',
      complexity: 'medium',
      enableCodeExecution: false
    };
  }

  if (isCreative) {
    return {
      type: 'creative',
      complexity: 'low',
      enableCodeExecution: false
    };
  }

  return {
    type: 'general',
    complexity: 'low',
    enableCodeExecution: false
  };
}

export { classifyQuery };
