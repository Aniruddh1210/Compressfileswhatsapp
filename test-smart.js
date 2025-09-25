const fs = require('fs-extra');
const { smartPDFCompression } = require('./compression-smart');

async function testSmartCompression() {
    try {
        console.log('🧠 Testing SMART compression (targeting 1.8-1.9MB)...\n');
        
        const testFile = 'passport lower parel Receipt.pdf';
        const inputBuffer = await fs.readFile(testFile);
        
        console.log('📄 Original file:', testFile);
        console.log('📊 Original size:', (inputBuffer.length / 1024 / 1024).toFixed(2), 'MB\n');
        
        const start = Date.now();
        const result = await smartPDFCompression(inputBuffer, testFile);
        const time = Date.now() - start;
        
        console.log('\n🎯 SMART COMPRESSION RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Final size:', (result.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('⏱️ Processing time:', time, 'ms');
        console.log('🎯 Under 2MB:', result.buffer.length <= 2 * 1024 * 1024 ? '✅ YES' : '❌ NO');
        
        const sizeMB = result.buffer.length / 1024 / 1024;
        if (sizeMB >= 1.7 && sizeMB <= 2.0) {
            console.log('🏆 PERFECT RANGE! Optimal quality achieved.');
        } else if (sizeMB >= 1.4 && sizeMB < 1.7) {
            console.log('✅ GOOD RANGE! Nice balance achieved.');
        } else if (sizeMB < 1.4) {
            console.log('📦 HIGH COMPRESSION! File is quite small.');
        } else {
            console.log('⚠️ Still over 2MB - needs more compression.');
        }
        
        await fs.writeFile('./temp/smart_compressed.pdf', result.buffer);
        console.log('\n📁 Smart compressed file saved to ./temp/smart_compressed.pdf');
        
    } catch (error) {
        console.error('❌ Smart compression test failed:', error);
    }
}

testSmartCompression();