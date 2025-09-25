const fs = require('fs-extra');
const { PDFDocument } = require('pdf-lib');
const { execSync } = require('child_process');

/**
 * Aggressive PDF compression for resistant documents
 * Uses image resampling and extreme optimization
 */
async function aggressivePDFCompression(buffer, filename) {
    try {
        console.log(`🔥 Aggressive PDF compression for resistant documents...`);
        
        const originalSizeMB = buffer.length / 1024 / 1024;
        console.log(`📖 Original: ${originalSizeMB.toFixed(2)}MB`);
        
        // Start with PDF-lib optimization
        const pdfDoc = await PDFDocument.load(buffer);
        const pageCount = pdfDoc.getPageCount();
        console.log(`📄 ${pageCount} pages detected`);
        
        const optimized = await pdfDoc.save({
            useObjectStreams: false, // Sometimes this helps with aggressive compression
            addDefaultPage: false,
            objectsPerTick: 100
        });
        
        let bestResult = optimized;
        let bestSize = optimized.length;
        console.log(`🔍 PDF-lib optimization: ${(bestSize / 1024 / 1024).toFixed(2)}MB`);
        
        // Aggressive Ghostscript strategies for resistant PDFs
        try {
            const tempDir = './temp';
            await fs.ensureDir(tempDir);
            const tempInput = `${tempDir}/input_${Date.now()}.pdf`;
            const tempOutput = `${tempDir}/output_${Date.now()}.pdf`;
            
            await fs.writeFile(tempInput, bestResult);
            
            // Progressive strategies targeting closer to 2MB for better quality
            const aggressiveStrategies = [
                // Strategy 1: High quality downsample (target 1.8-1.9MB)
                {
                    name: "High Quality (1.8MB target)",
                    command: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress -dDownsampleColorImages=true -dColorImageResolution=200 -dDownsampleGrayImages=true -dGrayImageResolution=200 -dDownsampleMonoImages=true -dMonoImageResolution=400 -dColorImageDownsampleType=/Bicubic -dGrayImageDownsampleType=/Bicubic -dAutoRotatePages=/None -dOptimize=true -dCompressFonts=true -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`
                },
                // Strategy 2: Good quality downsample (target 1.6-1.7MB)
                {
                    name: "Good Quality (1.6MB target)",
                    command: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/printer -dDownsampleColorImages=true -dColorImageResolution=170 -dDownsampleGrayImages=true -dGrayImageResolution=170 -dDownsampleMonoImages=true -dMonoImageResolution=350 -dColorImageDownsampleType=/Bicubic -dGrayImageDownsampleType=/Bicubic -dAutoRotatePages=/None -dOptimize=true -dCompressFonts=true -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`
                },
                // Strategy 3: Balanced downsample (target 1.4-1.5MB)
                {
                    name: "Balanced Quality (1.4MB target)",
                    command: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dDownsampleColorImages=true -dColorImageResolution=140 -dDownsampleGrayImages=true -dGrayImageResolution=140 -dDownsampleMonoImages=true -dMonoImageResolution=300 -dColorImageDownsampleType=/Bicubic -dGrayImageDownsampleType=/Bicubic -dAutoRotatePages=/None -dOptimize=true -dCompressFonts=true -dDetectDuplicateImages=true -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`
                },
                // Strategy 4: Compact fallback (ensure under 2MB)
                {
                    name: "Compact Fallback (1MB target)",
                    command: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dDownsampleColorImages=true -dColorImageResolution=120 -dDownsampleGrayImages=true -dGrayImageResolution=120 -dDownsampleMonoImages=true -dMonoImageResolution=250 -dColorImageDownsampleType=/Average -dGrayImageDownsampleType=/Average -dAutoRotatePages=/None -dOptimize=true -dCompressFonts=true -dDetectDuplicateImages=true -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`
                }
            ];
            
            for (const strategy of aggressiveStrategies) {
                try {
                    console.log(`🔥 Trying: ${strategy.name}...`);
                    
                    execSync(strategy.command, { stdio: 'pipe' });
                    
                    if (await fs.pathExists(tempOutput)) {
                        const result = await fs.readFile(tempOutput);
                        const resultSizeMB = result.length / 1024 / 1024;
                        console.log(`📊 ${strategy.name}: ${resultSizeMB.toFixed(2)}MB`);
                        
                        // Prioritize results in the 1.6-2MB range for optimal quality
                        if (result.length <= 2 * 1024 * 1024 && result.length > 50000) {
                            console.log(`✅ SUCCESS! ${strategy.name} achieved ${resultSizeMB.toFixed(2)}MB`);
                            
                            // Perfect range: 1.6-2MB
                            if (result.length >= 1.6 * 1024 * 1024) {
                                console.log(`🎯 PERFECT! Optimal quality achieved: ${resultSizeMB.toFixed(2)}MB`);
                                bestResult = result;
                                bestSize = result.length;
                                await fs.remove(tempOutput);
                                break; // Stop here - this is ideal
                            }
                            // Good range: 1.3-1.6MB, but keep looking for better
                            else if (result.length >= 1.3 * 1024 * 1024) {
                                if (bestSize < 1.3 * 1024 * 1024 || bestSize > 2 * 1024 * 1024) {
                                    bestResult = result;
                                    bestSize = result.length;
                                }
                            }
                            // Backup: any valid result under 2MB
                            else {
                                if (bestSize > 2 * 1024 * 1024) {
                                    bestResult = result;
                                    bestSize = result.length;
                                }
                            }
                        }
                        
                        await fs.remove(tempOutput);
                    }
                } catch (error) {
                    console.log(`⚠️ ${strategy.name} failed, trying next...`);
                }
            }
            
            await fs.remove(tempInput);
            
        } catch (gsError) {
            console.log('⚠️ Ghostscript not available, using PDF-lib only');
        }
        
        const finalSizeMB = bestSize / 1024 / 1024;
        console.log(`✅ Aggressive compression complete: ${finalSizeMB.toFixed(2)}MB`);
        
        // Assessment
        if (bestSize <= 2 * 1024 * 1024) {
            if (bestSize >= 1.6 * 1024 * 1024) {
                console.log('🏆 EXCELLENT! Great quality maintained under 2MB.');
            } else if (bestSize >= 1.2 * 1024 * 1024) {
                console.log('✅ GOOD! Solid compression with decent quality.');
            } else {
                console.log('📦 COMPACT! Maximum compression achieved.');
            }
        } else {
            console.log('⚠️ Still over 2MB - this is a very resistant PDF.');
        }
        
        return {
            buffer: Buffer.from(bestResult),
            filename: filename.replace(/\.[^.]+$/, '_compressed.pdf'),
            mimetype: 'application/pdf'
        };
        
    } catch (error) {
        console.error('❌ Aggressive PDF compression error:', error);
        throw error;
    }
}

module.exports = { aggressivePDFCompression };