const fs = require('fs-extra');
const { compressFileEnhanced } = require('./compression-enhanced');

async function testOptimalCompression() {
    try {
        console.log('🎯 Testing optimal 2MB target compression...\n');
        
        // Test with the PDF file
        const testFile = 'passport lower parel Receipt.pdf';
        const inputBuffer = await fs.readFile(testFile);
        
        console.log('📄 Original file:', testFile);
        console.log('📊 Original size:', (inputBuffer.length / 1024 / 1024).toFixed(2), 'MB\n');
        
        // Test enhanced compression
        console.log('🚀 Testing OPTIMIZED compression (targeting ~1.9MB)...');
        const start = Date.now();
        const result = await compressFileEnhanced(inputBuffer, 'application/pdf', testFile);
        const time = Date.now() - start;
        
        console.log('\n✅ RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Final size:', (result.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('⏱️ Processing time:', time, 'ms');
        console.log('🎯 Target achieved:', result.buffer.length <= 2 * 1024 * 1024 ? '✅ YES' : '❌ NO');
        
        const compressionRatio = ((inputBuffer.length - result.buffer.length) / inputBuffer.length * 100).toFixed(1);
        console.log('📈 Compression ratio:', compressionRatio + '%');
        
        // Save result
        await fs.writeFile('./temp/final_compressed.pdf', result.buffer);
        console.log('\n📁 Compressed file saved to ./temp/final_compressed.pdf');
        
        // Quality assessment
        const sizeMB = result.buffer.length / 1024 / 1024;
        if (sizeMB >= 1.8 && sizeMB <= 2.0) {
            console.log('🏆 PERFECT! Optimal quality-size balance achieved.');
        } else if (sizeMB < 1.8) {
            console.log('💡 Good compression but could be larger for better quality.');
        } else {
            console.log('⚠️ File slightly over 2MB limit.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testOptimalCompression();