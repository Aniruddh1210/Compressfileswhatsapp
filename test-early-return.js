const fs = require('fs-extra');
const { enhancedPDFCompression } = require('./compression-enhanced');

async function testEarlyReturn() {
    try {
        console.log('🧪 Testing early return logic...');
        
        // Use a file that we know will compress well
        const testFile = 'Scanned Document 2.pdf';
        
        console.log(`\n🧪 Testing: ${testFile}`);
        const inputBuffer = await fs.readFile(testFile);
        
        console.log(`📄 Original file: ${testFile}`);
        console.log(`📊 Original size: ${(inputBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        
        // Test compression
        const result = await enhancedPDFCompression(inputBuffer, testFile);
        
        console.log(`✅ Compressed size: ${(result.buffer.length / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📁 Output filename: ${result.filename}`);
        
        // Save the result for inspection
        await fs.ensureDir('./temp');
        await fs.writeFile(`./temp/${result.filename}`, result.buffer);
        console.log(`💾 Saved compressed file to: ./temp/${result.filename}`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEarlyReturn();