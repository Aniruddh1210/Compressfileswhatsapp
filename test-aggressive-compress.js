const fs = require('fs-extra');
const { execSync } = require('child_process');

async function aggressiveCompress() {
    try {
        console.log('🔥 Testing aggressive compression for large files...');
        
        // Use the large file
        const inputFile = 'Scanned Document 2.pdf';
        const tempInput = `./temp/test_input.pdf`;
        const tempOutput = `./temp/test_output.pdf`;
        
        // Copy input file
        await fs.copyFile(inputFile, tempInput);
        
        const inputBuffer = await fs.readFile(inputFile);
        console.log(`📄 Original: ${(inputBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        
        // Try increasingly aggressive strategies
        const strategies = [
            // Very aggressive - target under 2MB
            `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dColorImageResolution=72 -dGrayImageResolution=72 -dMonoImageResolution=150 -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`,
            // Ultra aggressive if needed
            `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dColorImageResolution=50 -dGrayImageResolution=50 -dMonoImageResolution=100 -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`,
            // Final fallback - very low quality but guaranteed small
            `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dColorImageResolution=36 -dGrayImageResolution=36 -dMonoImageResolution=72 -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`
        ];
        
        for (let i = 0; i < strategies.length; i++) {
            try {
                console.log(`\n🔥 Aggressive strategy ${i + 1}/${strategies.length}...`);
                execSync(strategies[i], { stdio: 'pipe' });
                
                if (await fs.pathExists(tempOutput)) {
                    const result = await fs.readFile(tempOutput);
                    const sizeMB = result.length / 1024 / 1024;
                    console.log(`📊 Result: ${sizeMB.toFixed(2)}MB`);
                    
                    if (result.length <= 2 * 1024 * 1024) {
                        console.log(`✅ SUCCESS! Under 2MB with strategy ${i + 1}`);
                        await fs.writeFile(`./temp/final_compressed.pdf`, result);
                        console.log(`💾 Saved to: ./temp/final_compressed.pdf`);
                        break;
                    }
                    await fs.remove(tempOutput);
                } else {
                    console.log(`❌ Strategy ${i + 1} failed - no output file`);
                }
            } catch (error) {
                console.log(`❌ Strategy ${i + 1} failed:`, error.message);
            }
        }
        
        // Cleanup
        await fs.remove(tempInput);
        await fs.remove(tempOutput);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

aggressiveCompress();