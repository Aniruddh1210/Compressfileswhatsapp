const fs = require('fs-extra');
const { aggressivePDFCompression } = require('./compression-aggressive');

async function testAggressiveCompression() {
    try {
        console.log('🔥 Testing AGGRESSIVE compression for resistant PDFs...\n');
        
        const testFile = 'passport lower parel Receipt.pdf';
        const inputBuffer = await fs.readFile(testFile);
        
        console.log('📄 Original file:', testFile);
        console.log('📊 Original size:', (inputBuffer.length / 1024 / 1024).toFixed(2), 'MB\n');
        
        const start = Date.now();
        const result = await aggressivePDFCompression(inputBuffer, testFile);
        const time = Date.now() - start;
        
        console.log('\n🔥 AGGRESSIVE COMPRESSION RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Final size:', (result.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('⏱️ Processing time:', time, 'ms');
        console.log('🎯 Under 2MB:', result.buffer.length <= 2 * 1024 * 1024 ? '✅ YES' : '❌ NO');
        
        const compressionRatio = ((inputBuffer.length - result.buffer.length) / inputBuffer.length * 100).toFixed(1);
        console.log('📈 Compression ratio:', compressionRatio + '%');
        
        const sizeMB = result.buffer.length / 1024 / 1024;
        if (sizeMB >= 1.6 && sizeMB <= 2.0) {
            console.log('🏆 EXCELLENT! Perfect balance achieved.');
        } else if (sizeMB >= 1.2 && sizeMB < 1.6) {
            console.log('✅ GOOD! Nice compression with decent quality.');
        } else if (sizeMB < 1.2) {
            console.log('📦 MAXIMUM! Ultra-compressed result.');
        } else {
            console.log('⚠️ Still needs more compression work.');
        }
        
        await fs.writeFile('./temp/aggressive_compressed.pdf', result.buffer);
        console.log('\n📁 Aggressively compressed file saved to ./temp/aggressive_compressed.pdf');
        
    } catch (error) {
        console.error('❌ Aggressive compression test failed:', error);
    }
}

testAggressiveCompression();