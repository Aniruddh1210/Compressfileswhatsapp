const fs = require('fs-extra');
const { enhancedPDFCompression } = require('./compression-enhanced');

async function testEnhancedCompression() {
    try {
        console.log('✨ Testing ENHANCED compression...\n');
        
        const testFile = 'passport lower parel Receipt.pdf';
        const inputBuffer = await fs.readFile(testFile);
        
        console.log('📄 Original file:', testFile);
        console.log('📊 Original size:', (inputBuffer.length / 1024 / 1024).toFixed(2), 'MB\n');
        
        const start = Date.now();
        const result = await enhancedPDFCompression(inputBuffer, testFile);
        const time = Date.now() - start;
        
        console.log('\n✨ ENHANCED COMPRESSION RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Final size:', (result.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('⏱️ Processing time:', time, 'ms');
        console.log('🎯 Under 2MB:', result.buffer.length <= 2 * 1024 * 1024 ? '✅ YES' : '❌ NO');
        
        const compressionRatio = ((inputBuffer.length - result.buffer.length) / inputBuffer.length * 100).toFixed(1);
        console.log('📈 Compression ratio:', compressionRatio + '%');
        
        await fs.writeFile('./temp/enhanced_compressed.pdf', result.buffer);
        console.log('\n📁 Enhanced compressed file saved to ./temp/enhanced_compressed.pdf');
        
    } catch (error) {
        console.error('❌ Enhanced compression test failed:', error);
    }
}

testEnhancedCompression();
