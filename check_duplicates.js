
const fs = require('fs');

const filePath = 'c:\\Users\\Mikasa Ackerman\\Downloads\\codecanyon-61943339-pardah-nextjs-modern-ecommerce-platform-with-firebase-backend\\sourcecode\\lib\\firestore\\translations.ts';
const content = fs.readFileSync(filePath, 'utf-8');

const lines = content.split('\n');
const keys = new Map();

lines.forEach((line, index) => {
    const match = line.match(/^\s*['"](.+?)['"]\s*:/);
    if (match) {
        const key = match[1];
        if (!keys.has(key)) {
            keys.set(key, []);
        }
        keys.get(key).push(index + 1);
    }
});

const duplicates = Array.from(keys.entries()).filter(([key, lineNumbers]) => lineNumbers.length > 1);

if (duplicates.length > 0) {
    console.log('Found duplicates:');
    duplicates.forEach(([key, lineNumbers]) => {
        console.log(`${key}: ${lineNumbers.join(', ')}`);
    });
} else {
    console.log('No duplicates found.');
}
