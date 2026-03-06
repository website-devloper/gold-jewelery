const fs = require('fs');
const path = require('path');

// Read the translations file
const translationsPath = path.join(__dirname, '..', 'lib', 'firestore', 'translations.ts');
const fileContent = fs.readFileSync(translationsPath, 'utf-8');

// Use regex to find all keys in the DEFAULT_TRANSLATION_KEYS object
// The format is typically: 'key.name': 'Arabic String',
// OR keyName: 'Arabic String',
const keyRegex = /(?:['"]([^'"]+)['"]|([a-zA-Z0-9_]+))\s*:\s*['"`]/g;
let match;
const keys = new Set();

while ((match = keyRegex.exec(fileContent)) !== null) {
    // match[1] is quoted key ('admin.marketing'), match[2] is unquoted key (common)
    const key = match[1] || match[2];
    if (key && key !== 'Record' && key !== 'string') {
        keys.add(key);
    }
}

console.log(`Found ${keys.size} keys.`);

// Function to convert a key to Title Case English
// e.g., 'admin.marketing_campaigns' -> 'Marketing Campaigns'
// e.g., 'products' -> 'Products'
function convertKeyToEnglish(key) {
    // Remove namespace prefix if exists (e.g., 'admin.', 'common.')
    let cleanStr = key;
    if (key.includes('.')) {
        cleanStr = key.split('.').pop();
    }

    // Replace underscores and dashes with spaces
    cleanStr = cleanStr.replace(/[_-]/g, ' ');

    // Uppercase first letter of each word
    return cleanStr.replace(/\b\w/g, c => c.toUpperCase());
}

// Generate the output content
let output = `export const ENGLISH_TRANSLATION_KEYS: Record<string, string> = {\n`;

for (const key of keys) {
    // Skip if it looks like TS type syntax that regex accidentally caught
    if (key.includes('typeof') || key.includes('keyof')) continue;

    const englishVal = convertKeyToEnglish(key);

    // Choose how to format the key (quoted if it contains dots or hyphens)
    const formattedKey = /^[a-zA-Z0-9_]+$/.test(key) ? key : `'${key}'`;

    output += `  ${formattedKey}: '${englishVal.replace(/'/g, "\\'")}',\n`;
}

output += `};\n`;

// Write to the new file
const outputPath = path.join(__dirname, '..', 'lib', 'firestore', 'translations_en.ts');
fs.writeFileSync(outputPath, output);

console.log(`Generated English translations to ${outputPath}`);
