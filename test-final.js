const fs = require('fs-extra');
const { finalPDFCompression } = require('./compression-final');

async function testFinalCompression() {
    try {
        console.log('🚀 Testing FINAL compression...\n');
        
        const testFile = 'passport lower parel Receipt.pdf';
        const inputBuffer = await fs.readFile(testFile);
        
        console.log('📄 Original file:', testFile);
        console.log('📊 Original size:', (inputBuffer.length / 1024 / 1024).toFixed(2), 'MB\n');
        
        const start = Date.now();
        const result = await finalPDFCompression(inputBuffer, testFile);
        const time = Date.now() - start;
        
        console.log('\n🏁 FINAL COMPRESSION RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Final size:', (result.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('⏱️ Processing time:', time, 'ms');
        console.log('🎯 Under 2MB:', result.buffer.length <= 2 * 1024 * 1024 ? '✅ YES' : '❌ NO');
        
        const compressionRatio = ((inputBuffer.length - result.buffer.length) / inputBuffer.length * 100).toFixed(1);
        console.log('📈 Compression ratio:', compressionRatio + '%');
        
        await fs.writeFile('./temp/final_compressed.pdf', result.buffer);
        console.log('\n📁 Final compressed file saved to ./temp/final_compressed.pdf');
        
    } catch (error) {
        console.error('❌ Final compression test failed:', error);
    }
}

testFinalCompression();
