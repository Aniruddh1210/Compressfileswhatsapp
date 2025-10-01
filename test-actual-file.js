#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { enhancedPDFCompression } = require('./compression-enhanced');

console.log('🧪 Testing with actual WhatsApp file...\n');

async function testActualFile() {
    const testFile = '/Users/aniruddh/projects/whatsapp2mbautomation/temp/Previous year prelims exam .pdf';
    
    if (!fs.existsSync(testFile)) {
        console.log('❌ Test file not found:', testFile);
        return false;
    }
    
    console.log(`📄 Testing file: ${path.basename(testFile)}`);
    const stats = fs.statSync(testFile);
    const originalSize = stats.size;
    console.log(`📊 Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    
    try {
        const buffer = fs.readFileSync(testFile);
        console.log('🔄 Starting enhanced compression...');
        console.log('⚠️  This should return ~6.58MB, NOT the original 64.44MB!\n');
        
        const result = await enhancedPDFCompression(buffer, path.basename(testFile));
        
        const compressedSize = result.buffer.length;
        const reduction = ((originalSize - compressedSize) / originalSize) * 100;
        
        console.log(`\n✅ Compression complete!`);
        console.log(`📊 Final size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📉 Reduction: ${reduction.toFixed(1)}%`);
        console.log(`📋 MIME type: ${result.mimetype}`);
        console.log(`📁 Filename: ${result.filename}`);
        
        // Critical test: Should NOT return original size
        if (compressedSize === originalSize) {
            console.log('\n❌ CRITICAL ISSUE: Returned original file instead of compressed!');
            console.log('🚨 The compression logic is still broken!');
            return false;
        }
        
        // Should return best compressed result (~6.58MB)
        const expectedSize = 6.9; // MB (allowing some variance)
        const actualSizeMB = compressedSize / 1024 / 1024;
        
        if (actualSizeMB <= expectedSize) {
            console.log('\n🎉 SUCCESS: Returned compressed version, not original!');
            console.log(`✅ Got ${actualSizeMB.toFixed(2)}MB (expected ~6.58MB)`);
            
            // Save compressed version for verification
            const outputPath = `temp/test_fixed_compression_${Date.now()}.pdf`;
            fs.writeFileSync(outputPath, result.buffer);
            console.log(`💾 Saved compressed result to: ${outputPath}`);
            
            return true;
        } else {
            console.log('\n⚠️  WARNING: File size larger than expected');
            console.log(`Got ${actualSizeMB.toFixed(2)}MB, expected ~6.58MB`);
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Compression failed:', error.message);
        console.error(error.stack);
        return false;
    }
}

async function main() {
    console.log('🎯 Testing the EXACT file that was sent via WhatsApp');
    console.log('📝 This will verify our fix works correctly\n');
    
    const success = await testActualFile();
    
    if (success) {
        console.log('\n🎉 FIXED! The compression now returns best result instead of original!');
        console.log('🚀 Ready to deploy to VM and test live!');
    } else {
        console.log('\n💥 STILL BROKEN! Need to fix the compression logic further.');
    }
}

main().catch(console.error);