// Code Execution Service using Piston API (Free)
import axios from 'axios';

const PISTON_API = 'https://emkc.org/api/v2/piston';

// Language mapping
const LANGUAGE_MAP = {
    'python': { language: 'python', version: '3.10.0' },
    'javascript': { language: 'javascript', version: '18.15.0' },
    'java': { language: 'java', version: '15.0.2' },
    'cpp': { language: 'cpp', version: '10.2.0' },
    'c': { language: 'c', version: '10.2.0' },
    'go': { language: 'go', version: '1.16.2' },
    'rust': { language: 'rust', version: '1.68.2' }
};

// Extract code blocks from markdown text
function extractCodeBlocks(text) {
    const codeBlocks = [];
    
    // Match code blocks with language specification: ``````
    const blockRegex = /``````/g;
    let match;
    
    while ((match = blockRegex.exec(text)) !== null) {
        const language = (match[1] || 'python').toLowerCase();
        const code = match[2].trim();
        
        if (code) {
            codeBlocks.push({
                language: language,
                code: code,
                raw: match[0]
            });
        }
    }
    
    return codeBlocks;
}

// Execute code using Piston API
async function executeCode(code, language = 'python', stdin = '') {
    try {
        const langConfig = LANGUAGE_MAP[language.toLowerCase()] || LANGUAGE_MAP['python'];
        
        const response = await axios.post(`${PISTON_API}/execute`, {
            language: langConfig.language,
            version: langConfig.version,
            files: [{
                content: code
            }],
            stdin: stdin,
            compile_timeout: 10000,
            run_timeout: 3000,
            compile_memory_limit: -1,
            run_memory_limit: -1
        });
        
        return {
            success: true,
            output: response.data.run.stdout || response.data.run.stderr || 'No output',
            exitCode: response.data.run.code,
            language: language,
            executionTime: response.data.run.runtime || 'N/A'
        };
    } catch (error) {
        return {
            success: false,
            output: error.message,
            error: error.message,
            language: language,
            exitCode: 1
        };
    }
}

// Execute all code blocks found in text
async function executeAllCodeBlocks(text, stdin = '') {
    const codeBlocks = extractCodeBlocks(text);
    
    if (codeBlocks.length === 0) {
        return null;
    }
    
    const results = [];
    
    for (const block of codeBlocks) {
        const result = await executeCode(block.code, block.language, stdin);
        results.push({
            ...result,
            originalCode: block.code
        });
    }
    
    return results;
}

// Generate test cases for code
function generateTestCases(problemDescription) {
    // Common edge cases for different problem types
    const edgeCases = {
        array: [
            '[]',
            '[1]',
            '[1,1,1,1]',
            '[5,4,3,2,1]',
            '[-1,-5,0,10]'
        ],
        number: [
            '0',
            '1',
            '-1',
            '1000000',
            '-1000000'
        ],
        string: [
            '""',
            '"a"',
            '"aaa"',
            '"Hello World"'
        ]
    };
    
    return edgeCases;
}

export { executeCode, extractCodeBlocks, executeAllCodeBlocks, generateTestCases };
