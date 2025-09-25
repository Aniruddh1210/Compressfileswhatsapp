const fs = require('fs-extra');
const { balancedPDFCompression } = require('./compression-balanced');

async function testBalancedCompression() {
    try {
        console.log('⚖️ Testing BALANCED compression (1.5-1.8MB sweet spot)...\n');
        
        const testFile = 'passport lower parel Receipt.pdf';
        const inputBuffer = await fs.readFile(testFile);
        
        console.log('📄 Original file:', testFile);
        console.log('📊 Original size:', (inputBuffer.length / 1024 / 1024).toFixed(2), 'MB\n');
        
        const start = Date.now();
        const result = await balancedPDFCompression(inputBuffer, testFile);
        const time = Date.now() - start;
        
        console.log('\n⚖️ BALANCED COMPRESSION RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Final size:', (result.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('⏱️ Processing time:', time, 'ms');
        console.log('🎯 Under 2MB:', result.buffer.length <= 2 * 1024 * 1024 ? '✅ YES' : '❌ NO');
        
        const compressionRatio = ((inputBuffer.length - result.buffer.length) / inputBuffer.length * 100).toFixed(1);
        console.log('📈 Compression ratio:', compressionRatio + '%');
        
        const sizeMB = result.buffer.length / 1024 / 1024;
        if (sizeMB >= 1.5 && sizeMB <= 1.8) {
            console.log('🏆 PERFECT! Sweet spot achieved - excellent quality balance.');
        } else if (sizeMB >= 1.2 && sizeMB < 1.5) {
            console.log('✅ GOOD! Nice balance between quality and compression.');
        } else if (sizeMB < 1.2) {
            console.log('📦 COMPACT! High compression - may have sacrificed some quality.');
        } else {
            console.log('⚠️ Still large - could be compressed more.');
        }
        
        await fs.writeFile('./temp/balanced_compressed.pdf', result.buffer);
        console.log('\n📁 Balanced compressed file saved to ./temp/balanced_compressed.pdf');
        
        // Compare with original aggressive method
        console.log('\n📊 COMPARISON WITH PREVIOUS METHODS:');
        console.log('- Aggressive (0.76MB): Maximum compression, lower quality');
        console.log('- Balanced (' + (result.buffer.length / 1024 / 1024).toFixed(2) + 'MB): Perfect balance of quality and size');
        console.log('- Original (2.92MB): Full quality, too large');
        
    } catch (error) {
        console.error('❌ Balanced compression test failed:', error);
    }
}

testBalancedCompression();