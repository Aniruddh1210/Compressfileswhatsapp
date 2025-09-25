const fs = require('fs-extra');
const { PDFDocument } = require('pdf-lib');
const { execSync } = require('child_process');

/**
 * Balanced PDF compression targeting 1.5-1.8MB sweet spot
 * Perfect balance between quality and size
 */
async function balancedPDFCompression(buffer, filename) {
    try {
        console.log(`⚖️ Balanced PDF compression (targeting 1.5-1.8MB sweet spot)...`);
        
        const originalSizeMB = buffer.length / 1024 / 1024;
        console.log(`📖 Original: ${originalSizeMB.toFixed(2)}MB`);
        
        // Always try to find the best compression balance
        // Remove the "sweet spot" check - we want to compress even if already under 2MB
        
        // Start with PDF-lib optimization
        const pdfDoc = await PDFDocument.load(buffer);
        const optimized = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50
        });
        
        let bestResult = buffer; // Start with original
        let bestSize = buffer.length; // Start with original size
        let bestScore = -1; // Initialize score for 2MB targeting
        console.log(`🔍 PDF-lib optimization: ${(bestSize / 1024 / 1024).toFixed(2)}MB`);
        
        // Balanced Ghostscript strategies targeting 1.5-1.8MB
        try {
            const tempDir = './temp';
            await fs.ensureDir(tempDir);
            const tempInput = `${tempDir}/input_${Date.now()}.pdf`;
            const tempOutput = `${tempDir}/output_${Date.now()}.pdf`;
            
            await fs.writeFile(tempInput, bestResult);
            
            // Progressive strategies with a wider range of settings to find the sweet spot
            const balancedStrategies = [
                // Strategy 1: High quality, minimal compression
                {
                    name: "High Quality (Minimal)",
                    resolution: 300,
                    setting: "prepress"
                },
                // Strategy 2: Good quality, light compression
                {
                    name: "Good Quality (Light)",
                    resolution: 220,
                    setting: "printer"
                },
                // Strategy 3: Balanced quality and compression
                {
                    name: "Balanced",
                    resolution: 150,
                    setting: "ebook"
                },
                // Strategy 4: High compression, acceptable quality
                {
                    name: "High Compression",
                    resolution: 120,
                    setting: "screen"
                },
                // Strategy 5: Maximum compression, lowest acceptable quality
                {
                    name: "Maximum Compression",
                    resolution: 95,
                    setting: "screen"
                }
            ];
            
            for (const strategy of balancedStrategies) {
                try {
                    console.log(`⚖️ Testing: ${strategy.name}...`);
                    
                    const command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/${strategy.setting} -dDownsampleColorImages=true -dColorImageResolution=${strategy.resolution} -dDownsampleGrayImages=true -dGrayImageResolution=${strategy.resolution} -dDownsampleMonoImages=true -dMonoImageResolution=${strategy.resolution} -dColorImageDownsampleType=/Average -dGrayImageDownsampleType=/Average -dMonoImageDownsampleType=/Average -dAutoRotatePages=/None -dOptimize=true -dCompressFonts=true -dEmbedAllFonts=false -dSubsetFonts=true -dCompressStreams=true -dCompressObjects=true -dDetectDuplicateImages=true -dColorConversionStrategy=/LeaveColorUnchanged -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`;
                    
                    execSync(command, { stdio: 'pipe' });
                    
                    if (await fs.pathExists(tempOutput)) {
                        const result = await fs.readFile(tempOutput);
                        const resultSizeMB = result.length / 1024 / 1024;
                        console.log(`📊 ${strategy.name}: ${resultSizeMB.toFixed(2)}MB`);
                        
                        // Prioritize results closest to 2MB without going over
                        const maxSize = 2 * 1024 * 1024; // 2MB limit
                        if (result.length <= maxSize && result.length > 100000) {
                            // Calculate how close this is to 2MB (prefer closer to 2MB)
                            const distanceFrom2MB = maxSize - result.length;
                            const currentScore = Math.max(0, 1000000 - distanceFrom2MB);

                            if (currentScore > bestScore) {
                                console.log(`✅ Better result: ${resultSizeMB.toFixed(2)}MB (closer to 2MB target)`);
                                bestResult = result;
                                bestSize = result.length;
                                bestScore = currentScore;
                            }
                        }
                        
                        await fs.remove(tempOutput);
                    }
                } catch (error) {
                    console.log(`⚠️ ${strategy.name} failed, continuing...`);
                }
            }
            
            await fs.remove(tempInput);
            
        } catch (gsError) {
            console.log('⚠️ Ghostscript not available, using PDF-lib only');
        }
        
        const finalSizeMB = bestSize / 1024 / 1024;
        console.log(`✅ Balanced compression complete: ${finalSizeMB.toFixed(2)}MB`);
        
        // Quality assessment
        if (bestSize >= 1.5 * 1024 * 1024 && bestSize <= 1.8 * 1024 * 1024) {
            console.log('🏆 PERFECT! Sweet spot achieved - excellent quality with good compression.');
        } else if (bestSize >= 1.2 * 1024 * 1024 && bestSize < 1.5 * 1024 * 1024) {
            console.log('✅ GOOD! Nice balance between quality and size.');
        } else if (bestSize < 1.2 * 1024 * 1024) {
            console.log('📦 COMPACT! High compression achieved.');
        } else {
            console.log('⚠️ Still large - may need more aggressive compression.');
        }
        
        return {
            buffer: Buffer.from(bestResult),
            filename: filename.replace(/\.[^.]+$/, '_balanced.pdf'),
            mimetype: 'application/pdf'
        };
        
    } catch (error) {
        console.error('❌ Balanced PDF compression error:', error);
        throw error;
    }
}

module.exports = { balancedPDFCompression };