const fs = require('fs-extra');
const { PDFDocument } = require('pdf-lib');
const { execSync } = require('child_process');

/**
 * Smart PDF compression that uses multiple passes to find the best quality under 2MB.
 */
async function smartPDFCompression(buffer, filename) {
    try {
        console.log(`🤖 Starting smart PDF compression...`);
        
        const originalSizeMB = buffer.length / 1024 / 1024;
        console.log(`📖 Original size: ${originalSizeMB.toFixed(2)}MB`);
        
        let bestResult = buffer;
        let bestSize = buffer.length;

        // --- Pass 1: PDF-lib optimization ---
        try {
            const pdfDoc = await PDFDocument.load(buffer);
            const optimizedBuffer = await pdfDoc.save({ useObjectStreams: true });
            if (optimizedBuffer.length < bestSize) {
                bestResult = optimizedBuffer;
                bestSize = optimizedBuffer.length;
                console.log(`🔍 Pass 1 (PDF-lib) reduced size to: ${(bestSize / 1024 / 1024).toFixed(2)}MB`);
            }
        } catch (pdfLibError) {
            console.log('⚠️ Pass 1 (PDF-lib) failed, proceeding with original buffer.');
        }

        // --- Pass 2: Ghostscript strategies ---
        try {
            const tempDir = './temp';
            await fs.ensureDir(tempDir);
            const tempInput = `${tempDir}/input_${Date.now()}.pdf`;
            const tempOutput = `${tempDir}/output_${Date.now()}.pdf`;
            
            await fs.writeFile(tempInput, bestResult);

            const strategies = [
                { name: "Prepress (300dpi)", resolution: 300, setting: "prepress" },
                { name: "Printer (200dpi)", resolution: 200, setting: "printer" },
                { name: "Ebook (150dpi)", resolution: 150, setting: "ebook" },
                { name: "Screen (120dpi)", resolution: 120, setting: "screen" },
                { name: "Low (95dpi)", resolution: 95, setting: "screen" }
            ];
            
            let pass2Results = [];

            for (const strategy of strategies) {
                try {
                    console.log(`⚙️ Pass 2: Trying ${strategy.name}`);
                    
                    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/${strategy.setting} -dDownsampleColorImages=true -dColorImageResolution=${strategy.resolution} -dDownsampleGrayImages=true -dGrayImageResolution=${strategy.resolution} -dDownsampleMonoImages=true -dMonoImageResolution=${strategy.resolution} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`;
                    
                    execSync(command, { stdio: 'pipe' });
                    
                    if (await fs.pathExists(tempOutput)) {
                        const result = await fs.readFile(tempOutput);
                        const resultSize = result.length;
                        const resultSizeMB = resultSize / 1024 / 1024;
                        console.log(`📊 Result: ${resultSizeMB.toFixed(2)}MB`);
                        
                        if (resultSize > 100000) { // Ignore tiny/broken files
                            pass2Results.push({ buffer: result, size: resultSize });
                        }
                        await fs.remove(tempOutput);
                    }
                } catch (error) {
                    console.log(`⚠️ Strategy ${strategy.name} failed.`);
                }
            }
            
            await fs.remove(tempInput);

            // Find the best result from pass 2 (largest file under 2MB)
            let bestPass2Result = null;
            let bestPass2Score = -1;
            const maxSize = 2 * 1024 * 1024;

            for(const res of pass2Results) {
                if (res.size <= maxSize) {
                    if (res.size > bestPass2Score) {
                        bestPass2Score = res.size;
                        bestPass2Result = res.buffer;
                    }
                }
            }

            if (bestPass2Result) {
                bestResult = bestPass2Result;
                bestSize = bestPass2Result.length;
                console.log(`✅ Pass 2 best result: ${(bestSize / 1024 / 1024).toFixed(2)}MB`);
            }
            
        } catch (gsError) {
            console.log('⚠️ Pass 2 (Ghostscript) failed entirely.');
        }
        
        const finalSizeMB = bestSize / 1024 / 1024;
        console.log(`✅ Smart compression complete. Final size: ${finalSizeMB.toFixed(2)}MB`);
        
        if (bestSize > 2 * 1024 * 1024) {
             console.log('⚠️ Could not compress below 2MB.');
        }

        return {
            buffer: Buffer.from(bestResult),
            filename: filename.replace(/\.[^.]+$/, '_compressed.pdf'),
            mimetype: 'application/pdf'
        };
        
    } catch (error) {
        console.error('❌ Smart PDF compression error:', error);
        throw error;
    }
}

module.exports = { smartPDFCompression };