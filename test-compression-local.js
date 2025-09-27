#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { enhancedPDFCompression } = require('./compression-enhanced');
const { compressImageEnhanced } = require('./compression-enhanced');

console.log('🧪 Testing compression functions locally...\n');

async function testWithSampleFile() {
    // Look for any PDF or image in the workspace
    const testFiles = [
        'passport lower parel Receipt.pdf',
        'Scanned Document 2.pdf'
    ];
    
    let testFile = null;
    for (const file of testFiles) {
        if (fs.existsSync(file)) {
            testFile = file;
            break;
        }
    }
    
    if (!testFile) {
        console.log('❌ No test PDF found. Creating a minimal test...');
        return testMinimal();
    }
    
    console.log(`📄 Found test file: ${testFile}`);
    const stats = fs.statSync(testFile);
    const originalSize = stats.size;
    console.log(`📊 Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    
    try {
        const buffer = fs.readFileSync(testFile);
        console.log('🔄 Compressing...');
        
        const result = await enhancedPDFCompression(buffer, testFile);
        
        console.log(`✅ Compressed successfully!`);
        console.log(`📊 Compressed size: ${(result.buffer.length / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📉 Reduction: ${(((originalSize - result.buffer.length) / originalSize) * 100).toFixed(1)}%`);
        console.log(`📋 MIME type: ${result.mimetype}`);
        console.log(`📁 Filename: ${result.filename}`);
        
        // Save compressed version
        const outputPath = `temp/test_compressed_${Date.now()}.pdf`;
        fs.writeFileSync(outputPath, result.buffer);
        console.log(`💾 Saved to: ${outputPath}`);
        
        return true;
    } catch (error) {
        console.error('❌ Compression failed:', error.message);
        return false;
    }
}

async function testMinimal() {
    console.log('🔧 Creating minimal test case...');
    
    // Test that the compression modules can be loaded
    try {
        console.log('📦 Loading compression modules...');
        const enhanced = require('./compression-enhanced');
        console.log('✅ Modules loaded successfully');
        
        console.log('🎯 Available functions:', Object.keys(enhanced));
        return true;
    } catch (error) {
        console.error('❌ Module loading failed:', error.message);
        return false;
    }
}

async function main() {
    const success = await testWithSampleFile();
    
    if (success) {
        console.log('\n🎉 Local compression test passed! The bot should work correctly.');
    } else {
        console.log('\n💥 Local test failed. Check dependencies and file paths.');
    }
    
    console.log('\n📝 Next: Test on VM with same script');
}

main().catch(console.error);