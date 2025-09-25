const fs = require('fs-extra');
const { compressFile } = require('./compression');
const { compressFileEnhanced } = require('./compression-enhanced');

async function compareCompression() {
    try {
        console.log('🔄 Comparing compression methods...\n');
        
        // Test with the PDF file
        const testFile = 'passport lower parel Receipt.pdf';
        const inputBuffer = await fs.readFile(testFile);
        
        console.log('📄 Original file:', testFile);
        console.log('📊 Original size:', (inputBuffer.length / 1024 / 1024).toFixed(2), 'MB\n');
        
        // Test old compression
        console.log('🔧 Testing OLD compression method...');
        const startOld = Date.now();
        const oldResult = await compressFile(inputBuffer, 'application/pdf', testFile);
        const timeOld = Date.now() - startOld;
        
        console.log('✅ Old method result:');
        console.log('   Size:', (oldResult.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('   Time:', timeOld, 'ms\n');
        
        // Save old result
        await fs.writeFile('./temp/old_compression.pdf', oldResult.buffer);
        
        // Test new enhanced compression  
        console.log('🚀 Testing ENHANCED compression method...');
        const startNew = Date.now();
        const newResult = await compressFileEnhanced(inputBuffer, 'application/pdf', testFile);
        const timeNew = Date.now() - startNew;
        
        console.log('✅ Enhanced method result:');
        console.log('   Size:', (newResult.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('   Time:', timeNew, 'ms\n');
        
        // Save new result
        await fs.writeFile('./temp/enhanced_compression.pdf', newResult.buffer);
        
        // Compare results
        console.log('📊 COMPARISON RESULTS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const sizeDiff = oldResult.buffer.length - newResult.buffer.length;
        const sizeDiffMB = sizeDiff / 1024 / 1024;
        const percentImprovement = (sizeDiff / oldResult.buffer.length * 100).toFixed(1);
        
        console.log('🆚 Size comparison:');
        console.log('   Old method:', (oldResult.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('   Enhanced method:', (newResult.buffer.length / 1024 / 1024).toFixed(2), 'MB');
        console.log('   Difference:', sizeDiffMB.toFixed(2), 'MB');
        console.log('   Improvement:', percentImprovement, '%');
        
        console.log('\n⏱️ Speed comparison:');
        console.log('   Old method:', timeOld, 'ms');
        console.log('   Enhanced method:', timeNew, 'ms');
        
        if (newResult.buffer.length < oldResult.buffer.length) {
            console.log('\n🎉 ENHANCED METHOD WINS! Better compression achieved.');
        } else if (newResult.buffer.length === oldResult.buffer.length) {
            console.log('\n🤝 TIE! Same compression achieved.');
        } else {
            console.log('\n⚠️ Old method achieved smaller file size.');
        }
        
        console.log('\n📁 Files saved to ./temp/ for manual quality comparison');
        
    } catch (error) {
        console.error('❌ Comparison failed:', error);
    }
}

compareCompression();