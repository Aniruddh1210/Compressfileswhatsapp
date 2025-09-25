const fs = require('fs-extra');
const { PDFDocument } = require('pdf-lib');
const { execSync } = require('child_process');

/**
 * Final PDF compression aiming for the best quality under 2MB.
 * This version uses a more refined set of strategies.
 */
async function finalPDFCompression(buffer, filename) {
    try {
        console.log(`🚀 Starting final PDF compression...`);
        
        const originalSizeMB = buffer.length / 1024 / 1024;
        console.log(`📖 Original size: ${originalSizeMB.toFixed(2)}MB`);
        
        let bestResult = buffer;
        let bestSize = buffer.length;
        let bestScore = -1;

        // Use PDF-lib for initial optimization
        try {
            const pdfDoc = await PDFDocument.load(buffer);
            const optimizedBuffer = await pdfDoc.save({ useObjectStreams: true });
            if (optimizedBuffer.length < bestSize) {
                bestResult = optimizedBuffer;
                bestSize = optimizedBuffer.length;
                console.log(`🔍 PDF-lib optimization reduced size to: ${(bestSize / 1024 / 1024).toFixed(2)}MB`);
            }
        } catch (pdfLibError) {
            console.log('⚠️ PDF-lib optimization failed, proceeding with original buffer.');
        }

        // Refined Ghostscript strategies
        try {
            const tempDir = './temp';
            await fs.ensureDir(tempDir);
            const tempInput = `${tempDir}/input_${Date.now()}.pdf`;
            const tempOutput = `${tempDir}/output_${Date.now()}.pdf`;
            
            await fs.writeFile(tempInput, bestResult);

            const finalStrategies = [
                { name: "High Quality", resolution: 170, setting: "ebook" },
                { name: "Good Quality", resolution: 150, setting: "ebook" },
                { name: "Balanced", resolution: 130, setting: "screen" },
                { name: "Economy", resolution: 110, setting: "screen" },
                { name: "Compact", resolution: 95, setting: "screen" }
            ];
            
            for (const strategy of finalStrategies) {
                try {
                    console.log(`⚙️ Trying strategy: ${strategy.name} (${strategy.resolution}dpi, /${strategy.setting})`);
                    
                    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/${strategy.setting} -dDownsampleColorImages=true -dColorImageResolution=${strategy.resolution} -dDownsampleGrayImages=true -dGrayImageResolution=${strategy.resolution} -dDownsampleMonoImages=true -dMonoImageResolution=${strategy.resolution} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`;
                    
                    execSync(command, { stdio: 'pipe' });
                    
                    if (await fs.pathExists(tempOutput)) {
                        const result = await fs.readFile(tempOutput);
                        const resultSize = result.length;
                        const resultSizeMB = resultSize / 1024 / 1024;
                        console.log(`📊 Result: ${resultSizeMB.toFixed(2)}MB`);
                        
                        const maxSize = 2 * 1024 * 1024;
                        if (resultSize <= maxSize && resultSize > 100000) {
                            const score = resultSize; // Higher size is better, as long as it's under 2MB
                            if (score > bestScore) {
                                console.log(`✅ New best result: ${resultSizeMB.toFixed(2)}MB`);
                                bestResult = result;
                                bestSize = resultSize;
                                bestScore = score;
                            }
                        }
                        await fs.remove(tempOutput);
                    }
                } catch (error) {
                    console.log(`⚠️ Strategy ${strategy.name} failed.`);
                }
            }
            
            await fs.remove(tempInput);
            
        } catch (gsError) {
            console.log('⚠️ Ghostscript processing failed.');
        }
        
        const finalSizeMB = bestSize / 1024 / 1024;
        console.log(`✅ Final compression complete. Best size: ${finalSizeMB.toFixed(2)}MB`);
        
        if (bestSize > 2 * 1024 * 1024) {
             console.log('⚠️ Could not compress below 2MB.');
        }

        return {
            buffer: Buffer.from(bestResult),
            filename: filename.replace(/\.[^.]+$/, '_compressed.pdf'),
            mimetype: 'application/pdf'
        };
        
    } catch (error) {
        console.error('❌ Final PDF compression error:', error);
        throw error;
    }
}

module.exports = { finalPDFCompression };
