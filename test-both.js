const fs = require('fs-extra');
const { compressFile } = require('./compression');

async function testBothFiles() {
    try {
        console.log('🧪 Testing both file sizes...');
        
        // Test small file first (should get ~1.5MB)
        console.log('\n📄 Testing small file (passport)...');
        const smallFile = await fs.readFile('passport lower parel Receipt.pdf');
        console.log(`Original: ${(smallFile.length / 1024 / 1024).toFixed(2)}MB`);
        
        const smallResult = await compressFile(smallFile, 'application/pdf', 'passport.pdf');
        console.log(`Result: ${(smallResult.buffer.length / 1024 / 1024).toFixed(2)}MB`);
        
        // Test large file (should get under 2MB)
        console.log('\n📄 Testing large file (scanned doc)...');
        const largeFile = await fs.readFile('Scanned Document 2.pdf');
        console.log(`Original: ${(largeFile.length / 1024 / 1024).toFixed(2)}MB`);
        
        const largeResult = await compressFile(largeFile, 'application/pdf', 'scanned.pdf');
        console.log(`Result: ${(largeResult.buffer.length / 1024 / 1024).toFixed(2)}MB`);
        
        console.log('\n✅ Both tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testBothFiles();