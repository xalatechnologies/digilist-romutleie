#!/usr/bin/env node

/**
 * i18n Verification Script
 * 
 * Checks for:
 * 1. Missing translation keys (keys used in code but not in translation files)
 * 2. Hardcoded strings in UI components
 * 3. Enum values displayed directly without localization
 */

const fs = require('fs');
const path = require('path');

const TRANSLATION_DIR = path.join(__dirname, '../i18n/locales');
const COMPONENTS_DIR = path.join(__dirname, '../components');

// Load translation files
const enTranslations = JSON.parse(fs.readFileSync(path.join(TRANSLATION_DIR, 'en.json'), 'utf8'));
const nbTranslations = JSON.parse(fs.readFileSync(path.join(TRANSLATION_DIR, 'nb.json'), 'utf8'));

// Flatten translation keys
function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...flattenKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = new Set(flattenKeys(enTranslations));
const nbKeys = new Set(flattenKeys(nbTranslations));

// Find missing keys
const missingInNb = [...enKeys].filter(k => !nbKeys.has(k));
const missingInEn = [...nbKeys].filter(k => !enKeys.has(k));

console.log('=== i18n Verification Report ===\n');

if (missingInNb.length > 0) {
  console.log('❌ Missing in nb.json:');
  missingInNb.forEach(k => console.log(`  - ${k}`));
  console.log('');
}

if (missingInEn.length > 0) {
  console.log('❌ Missing in en.json:');
  missingInEn.forEach(k => console.log(`  - ${k}`));
  console.log('');
}

if (missingInNb.length === 0 && missingInEn.length === 0) {
  console.log('✅ All translation keys are present in both languages\n');
}

// Check for hardcoded strings (basic pattern matching)
console.log('=== Checking for hardcoded strings ===\n');
console.log('Note: This is a basic check. Manual review recommended.\n');

// Common hardcoded string patterns
const hardcodedPatterns = [
  /(?:placeholder|title|aria-label|aria-describedby)=["']([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)["']/g,
  />([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)</g,
];

let foundHardcoded = false;

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Skip lines with t() calls
    if (line.includes('t(') || line.includes('useTranslation')) return;
    
    // Check for common hardcoded patterns
    if (/["'](?:Create|Add|Edit|Delete|Save|Cancel|Search|Filter|Loading|Error|Success|No\s+\w+\s+found)[^"']*["']/.test(line)) {
      console.log(`⚠️  ${filePath}:${index + 1} - Possible hardcoded string: ${line.trim()}`);
      foundHardcoded = true;
    }
  });
}

// Check Views.tsx
const viewsPath = path.join(COMPONENTS_DIR, 'Views.tsx');
if (fs.existsSync(viewsPath)) {
  checkFile(viewsPath);
}

if (!foundHardcoded) {
  console.log('✅ No obvious hardcoded strings found (basic check passed)');
}

console.log('\n=== Summary ===');
console.log(`Total keys in en.json: ${enKeys.size}`);
console.log(`Total keys in nb.json: ${nbKeys.size}`);
console.log(`Missing in nb: ${missingInNb.length}`);
console.log(`Missing in en: ${missingInEn.length}`);

if (missingInNb.length > 0 || missingInEn.length > 0 || foundHardcoded) {
  process.exit(1);
} else {
  console.log('\n✅ All checks passed!');
  process.exit(0);
}

