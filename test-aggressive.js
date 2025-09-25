const { compressFile } = require('./compression');

// Test with a simulated large PDF
async function testAggressiveCompression() {
    console.log('🧪 Testing AGGRESSIVE compression...\n');
    
    try {
        // Create a fake large file buffer (4MB)
        const largeFakeBuffer = Buffer.alloc(4 * 1024 * 1024); // 4MB of zeros
        
        console.log(`📊 Testing with ${(largeFakeBuffer.length / (1024 * 1024)).toFixed(1)}MB fake file`);
        
        const result = await compressFile(largeFakeBuffer, 'test-large-file.pdf', 'application/pdf');
        
        console.log(`✅ Result: ${(result.buffer.length / 1024).toFixed(1)}KB`);
        console.log(`📁 Filename: ${result.filename}`);
        console.log(`📋 Type: ${result.mimetype}`);
        
        if (result.buffer.length <= 2 * 1024 * 1024) {
            console.log('🎉 SUCCESS: File compressed to ≤2MB!');
        } else {
            console.log('❌ FAILED: File still over 2MB');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testAggressiveCompression();