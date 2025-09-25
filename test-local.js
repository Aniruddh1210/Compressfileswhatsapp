const fs = require('fs-extra');
const { enhancedPDFCompression } = require('./compression-enhanced');

async function testLocalCompression() {
    try {
        console.log('🧪 Testing local compression...');
        
        // Test with the large input file to see early return in action
        const testFiles = ['temp/input_1758713750526.pdf'];
        
        for (const testFile of testFiles) {
            console.log(`\n🧪 Testing: ${testFile}`);
            const inputBuffer = await fs.readFile(testFile);
            
            console.log(`📄 Original file: ${testFile}`);
            console.log(`📊 Original size: ${(inputBuffer.length / 1024 / 1024).toFixed(2)}MB`);
            
            // Test compression
            const result = await enhancedPDFCompression(inputBuffer, testFile);
            
            console.log(`✅ Compressed size: ${(result.buffer.length / 1024 / 1024).toFixed(2)}MB`);
            console.log(`📁 Output filename: ${result.filename}`);
            
            // Save the result for inspection
            await fs.writeFile(`./temp/${result.filename}`, result.buffer);
            console.log(`💾 Saved compressed file to: ./temp/${result.filename}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLocalCompression();