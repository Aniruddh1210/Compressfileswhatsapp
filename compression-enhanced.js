const fs = require('fs-extra');
const sharp = require('sharp');
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');
const { execSync } = require('child_process');

// Enhanced constants for optimal size targeting
const TARGET_SIZE = 1.95 * 1024 * 1024; // Target 1.95MB - closer to 2MB limit
const MAX_SIZE = 2 * 1024 * 1024; // Hard limit at 2MB

/**
 * Enhanced image compression using advanced Sharp settings
 * Similar to what professional services use
 */
async function compressImageEnhanced(buffer, mimeType, filename) {
    try {
        console.log(`🖼️ Enhanced image compression (professional quality)...`);
        
        const image = sharp(buffer);
        const metadata = await image.metadata();
        console.log(`📏 Original: ${metadata.width}x${metadata.height}, ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
        
        // If already under target, apply minimal optimization
        if (buffer.length <= TARGET_SIZE) {
            console.log('✅ Size already optimal - applying quality enhancement');
            const result = await image
                .jpeg({
                    quality: 95,
                    progressive: true,
                    mozjpeg: true,
                    chromaSubsampling: '4:4:4' // Best quality
                })
                .toBuffer();
            
            return {
                buffer: result,
                filename: filename.replace(/\.[^.]+$/, '_optimized.jpg'),
                mimetype: 'image/jpeg'
            };
        }
        
        // Advanced multi-stage compression
        const strategies = [
            // Stage 1: High quality with optimal settings
            {
                quality: 90,
                progressive: true,
                mozjpeg: true,
                chromaSubsampling: '4:2:0',
                optimiseScans: true
            },
            // Stage 2: Balanced quality
            {
                quality: 85,
                progressive: true,
                mozjpeg: true,
                chromaSubsampling: '4:2:0',
                optimiseScans: true
            },
            // Stage 3: Smart resize + quality
            {
                quality: 80,
                progressive: true,
                mozjpeg: true,
                chromaSubsampling: '4:2:0',
                optimiseScans: true,
                resize: Math.round(metadata.width * 0.9)
            }
        ];
        
        for (const strategy of strategies) {
            try {
                let processor = image.clone();
                
                if (strategy.resize) {
                    processor = processor.resize(strategy.resize, null, {
                        kernel: sharp.kernel.lanczos3,
                        withoutEnlargement: true
                    });
                }
                
                const result = await processor
                    .jpeg({
                        quality: strategy.quality,
                        progressive: strategy.progressive,
                        mozjpeg: strategy.mozjpeg,
                        chromaSubsampling: strategy.chromaSubsampling,
                        optimiseScans: strategy.optimiseScans
                    })
                    .toBuffer();
                
                const resultSizeMB = result.length / 1024 / 1024;
                console.log(`📊 Strategy result: ${resultSizeMB.toFixed(2)}MB (quality: ${strategy.quality})`);
                
                if (result.length <= TARGET_SIZE) {
                    console.log(`✅ Perfect quality achieved: ${resultSizeMB.toFixed(2)}MB`);
                    return {
                        buffer: result,
                        filename: filename.replace(/\.[^.]+$/, '_compressed.jpg'),
                        mimetype: 'image/jpeg'
                    };
                }
            } catch (error) {
                console.log(`⚠️ Strategy failed, trying next...`);
            }
        }
        
        // Final fallback - ensure under 2MB
        const fallback = await image
            .resize(Math.round(metadata.width * 0.8), null, {
                kernel: sharp.kernel.lanczos3,
                withoutEnlargement: true
            })
            .jpeg({
                quality: 75,
                progressive: true,
                mozjpeg: true
            })
            .toBuffer();
        
        return {
            buffer: fallback,
            filename: filename.replace(/\.[^.]+$/, '_compressed.jpg'),
            mimetype: 'image/jpeg'
        };
        
    } catch (error) {
        console.error('❌ Enhanced image compression error:', error);
        throw error;
    }
}

/**
 * Enhanced PDF compression using multiple advanced techniques
 * Mimics professional PDF compressors like iLovePDF
 */
async function compressPDFEnhanced(buffer, filename) {
    try {
        console.log(`📄 Enhanced PDF compression (professional algorithms)...`);
        
        // Load and analyze PDF
        const pdfDoc = await PDFDocument.load(buffer);
        const pageCount = pdfDoc.getPageCount();
        console.log(`📖 PDF: ${pageCount} pages, ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
        
        // Stage 1: Advanced PDF-lib optimization with custom settings
        const optimized = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50,
            updateFieldAppearances: false
        });
        
        let bestResult = optimized;
        let bestSize = optimized.length;
        console.log(`🔍 Stage 1 - PDF-lib optimization: ${(bestSize / 1024 / 1024).toFixed(2)}MB`);
        
        // Stage 2: External compression using Ghostscript (if available)
        try {
            const tempDir = './temp';
            await fs.ensureDir(tempDir);
            const tempInput = `${tempDir}/input_${Date.now()}.pdf`;
            const tempOutput = `${tempDir}/output_${Date.now()}.pdf`;
            
            await fs.writeFile(tempInput, bestResult);
            
            // Professional compression strategies targeting optimal 1.8-2MB range
            const professionalStrategies = [
                // Strategy 1: Target 1.9MB with excellent quality
                {
                    name: "Premium Quality (1.9MB target)",
                    command: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress -dColorImageResolution=220 -dGrayImageResolution=220 -dMonoImageResolution=400 -dColorImageDownsampleType=/Bicubic -dGrayImageDownsampleType=/Bicubic -dAutoRotatePages=/None -dEmbedAllFonts=true -dSubsetFonts=true -dOptimize=true -dCompressFonts=true -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`
                },
                // Strategy 2: Target 1.7MB with high quality
                {
                    name: "High Quality (1.7MB target)",
                    command: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/printer -dColorImageResolution=180 -dGrayImageResolution=180 -dMonoImageResolution=350 -dColorImageDownsampleType=/Bicubic -dGrayImageDownsampleType=/Bicubic -dAutoRotatePages=/None -dEmbedAllFonts=true -dSubsetFonts=true -dOptimize=true -dCompressFonts=true -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`
                },
                // Strategy 3: Target 1.5MB balanced
                {
                    name: "Balanced Quality (1.5MB target)",
                    command: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dColorImageResolution=160 -dGrayImageResolution=160 -dMonoImageResolution=300 -dColorImageDownsampleType=/Bicubic -dGrayImageDownsampleType=/Bicubic -dDetectDuplicateImages=true -dCompressFonts=true -dOptimize=true -dAutoRotatePages=/None -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`
                },
                // Strategy 4: Fallback - ensure under 2MB
                {
                    name: "Compact (under 2MB guarantee)",
                    command: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dColorImageResolution=120 -dGrayImageResolution=120 -dMonoImageResolution=250 -dColorImageDownsampleType=/Bicubic -dGrayImageDownsampleType=/Bicubic -dDetectDuplicateImages=true -dCompressFonts=true -dOptimize=true -dAutoRotatePages=/None -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`
                }
            ];
            
            for (const strategy of professionalStrategies) {
                try {
                    console.log(`⚙️ Trying: ${strategy.name}...`);
                    
                    // Execute Ghostscript with better error handling
                    const result = execSync(strategy.command, { 
                        stdio: ['pipe', 'pipe', 'pipe'],
                        encoding: 'utf8'
                    });
                    
                    if (await fs.pathExists(tempOutput)) {
                        const compressedFile = await fs.readFile(tempOutput);
                        const resultSizeMB = compressedFile.length / 1024 / 1024;
                        console.log(`📊 ${strategy.name}: ${resultSizeMB.toFixed(2)}MB`);
                        
                        // Prioritize files in the 1.6-2MB range for best quality
                        if (compressedFile.length <= MAX_SIZE && compressedFile.length > 1000) {
                            // Perfect range: 1.6-2MB
                            if (compressedFile.length >= 1.6 * 1024 * 1024) {
                                console.log(`🎯 PERFECT QUALITY achieved with ${strategy.name}: ${resultSizeMB.toFixed(2)}MB`);
                                bestResult = compressedFile;
                                bestSize = compressedFile.length;
                                await fs.remove(tempOutput);
                                break; // Stop here - this is ideal
                            }
                            // Good range: 1.3-1.6MB
                            else if (compressedFile.length >= 1.3 * 1024 * 1024) {
                                console.log(`✅ GOOD quality with ${strategy.name}: ${resultSizeMB.toFixed(2)}MB`);
                                if (bestSize < 1.3 * 1024 * 1024 || bestSize > MAX_SIZE) {
                                    bestResult = compressedFile;
                                    bestSize = compressedFile.length;
                                }
                            }
                            // Backup: any valid result
                            else {
                                console.log(`📦 Fallback quality with ${strategy.name}: ${resultSizeMB.toFixed(2)}MB`);
                                if (bestSize > MAX_SIZE) {
                                    bestResult = compressedFile;
                                    bestSize = compressedFile.length;
                                }
                            }
                        }
                        
                        await fs.remove(tempOutput);
                    } else {
                        console.log(`⚠️ ${strategy.name}: No output file created`);
                    }
                } catch (strategyError) {
                    console.log(`⚠️ ${strategy.name} failed:`, strategyError.message.substring(0, 100));
                }
            }
            
            // Cleanup
            await fs.remove(tempInput);
            
        } catch (gsError) {
            console.log('⚠️ Ghostscript not available, using PDF-lib only');
        }
        
        // Stage 3: If still too large, apply final optimization
        if (bestSize > MAX_SIZE) {
            console.log('🔧 Applying final optimization pass...');
            try {
                const finalPdf = await PDFDocument.load(bestResult);
                const finalOptimized = await finalPdf.save({
                    useObjectStreams: false, // Sometimes this helps reduce size
                    addDefaultPage: false,
                    objectsPerTick: 100,
                    updateFieldAppearances: false
                });
                
                if (finalOptimized.length < bestSize) {
                    bestResult = finalOptimized;
                    bestSize = finalOptimized.length;
                }
            } catch (finalError) {
                console.log('⚠️ Final optimization failed');
            }
        }
        
        const finalSizeMB = bestSize / 1024 / 1024;
        console.log(`✅ Enhanced PDF compression complete: ${finalSizeMB.toFixed(2)}MB`);
        
        // Quality check
        if (bestSize > MAX_SIZE) {
            console.log(`⚠️ File ${finalSizeMB.toFixed(2)}MB - may need manual optimization`);
        }
        
        return {
            buffer: Buffer.from(bestResult),
            filename: filename.replace(/\.[^.]+$/, '_compressed.pdf'),
            mimetype: 'application/pdf'
        };
        
    } catch (error) {
        console.error('❌ Enhanced PDF compression error:', error);
        throw error;
    }
}

/**
 * Enhanced PDF compression with more granular control to find the best quality under 2MB.
 */
async function enhancedPDFCompression(buffer, filename) {
    try {
        console.log(`✨ Starting enhanced PDF compression...`);
        
        const originalSizeMB = buffer.length / 1024 / 1024;
        console.log(`📖 Original size: ${originalSizeMB.toFixed(2)}MB`);
        
        let bestResult = buffer;
        let bestSize = buffer.length;

        const tempDir = './temp';
        await fs.ensureDir(tempDir);
        const tempInput = `${tempDir}/input_${Date.now()}.pdf`;
        const tempOutput = `${tempDir}/output_${Date.now()}.pdf`;
        
        await fs.writeFile(tempInput, buffer);

        const strategies = [
            // Custom strategies targeting the 1.5-1.9MB sweet spot
            { 
                name: "Custom-HighQ", 
                setting: "custom", 
                params: "-dPDFSETTINGS=/printer -dColorImageResolution=160 -dGrayImageResolution=160 -dMonoImageResolution=350 -dJPEGQ=90 -dOptimize=true -dCompressFonts=true" 
            },
            { 
                name: "Custom-MediumQ", 
                setting: "custom", 
                params: "-dPDFSETTINGS=/printer -dColorImageResolution=150 -dGrayImageResolution=150 -dMonoImageResolution=320 -dJPEGQ=85 -dOptimize=true -dCompressFonts=true" 
            },
            { 
                name: "Custom-BalancedQ", 
                setting: "custom", 
                params: "-dPDFSETTINGS=/ebook -dColorImageResolution=140 -dGrayImageResolution=140 -dMonoImageResolution=300 -dJPEGQ=82 -dOptimize=true -dCompressFonts=true" 
            },
            { 
                name: "Custom-CompactQ", 
                setting: "custom", 
                params: "-dPDFSETTINGS=/ebook -dColorImageResolution=130 -dGrayImageResolution=130 -dMonoImageResolution=280 -dJPEGQ=78 -dOptimize=true -dCompressFonts=true" 
            },
            
            // High quality options targeting 1.5-1.9MB
            { name: "Premium-300", resolution: 300, setting: "prepress" },
            { name: "Premium-250", resolution: 250, setting: "prepress" },
            { name: "Premium-220", resolution: 220, setting: "prepress" },
            { name: "Printer-200", resolution: 200, setting: "printer" },
            { name: "Printer-180", resolution: 180, setting: "printer" },
            { name: "Printer-170", resolution: 170, setting: "printer" },
            { name: "Printer-150", resolution: 150, setting: "printer" },
            
            // Fallback options if above don't work
            { name: "Ebook-120", resolution: 120, setting: "ebook" },
            { name: "Ebook-110", resolution: 110, setting: "ebook" },
            { name: "Screen-100", resolution: 100, setting: "screen" },
            { name: "Screen-90", resolution: 90, setting: "screen" },
            { name: "Screen-72", resolution: 72, setting: "screen" }
        ];
        
        let passResults = [];

        for (const strategy of strategies) {
            try {
                console.log(`⚙️ Trying ${strategy.name}`);
                
                let command;
                if (strategy.setting === 'custom') {
                    // Custom compression for targeting specific sizes
                    command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 ${strategy.params} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`;
                } else {
                    command = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/${strategy.setting} -dDownsampleColorImages=true -dColorImageResolution=${strategy.resolution} -dDownsampleGrayImages=true -dGrayImageResolution=${strategy.resolution} -dDownsampleMonoImages=true -dMonoImageResolution=${strategy.resolution} -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutput}" "${tempInput}"`;
                }
                
                execSync(command, { stdio: 'pipe' });
                
                if (await fs.pathExists(tempOutput)) {
                    const result = await fs.readFile(tempOutput);
                    const resultSize = result.length;
                    const resultSizeMB = resultSize / 1024 / 1024;
                    console.log(`📊 Result: ${resultSizeMB.toFixed(2)}MB`);
                    
                    if (resultSize > 100000) {
                        passResults.push({ buffer: result, size: resultSize });
                    }
                    await fs.remove(tempOutput);
                }
            } catch (error) {
                console.log(`⚠️ Strategy ${strategy.name} failed.`);
            }
        }
        
        await fs.remove(tempInput);

        let bestPassResult = null;
        let bestPassScore = -1;
        const maxSize = 1.9 * 1024 * 1024; // Target 1.9MB for WhatsApp overhead
        const idealMinSize = 1.5 * 1024 * 1024; // Prefer results above 1.5MB for quality

        // Check if original is already close to target
            const origSizeMB = buffer.length / 1024 / 1024;
            if (buffer.length <= maxSize) {
                console.log(`✨ Original file ${origSizeMB.toFixed(2)}MB is already under target!`);
            bestPassResult = buffer;
            bestPassScore = buffer.length;
        } else {
            // Smart selection: find the largest file that's still under 1.9MB
            for(const res of passResults) {
                const sizeMB = res.size / 1024 / 1024;
                console.log(`🔍 Evaluating: ${sizeMB.toFixed(2)}MB`);
                
                if (res.size <= maxSize) {
                    // Prefer results closer to 1.9MB but prioritize staying under limit
                    if (res.size > bestPassScore) {
                        bestPassScore = res.size;
                        bestPassResult = res.buffer;
                        console.log(`📈 New best: ${sizeMB.toFixed(2)}MB (closest to 1.9MB)`);
                    }
                }
            }
            
                // Special logic: If we have results that are too small (under 1MB) and original is manageable
                // check if we should prefer a slightly larger result from a different approach
                if (bestPassResult && bestPassScore < 1024 * 1024 && origSizeMB <= 3.0) {
                    console.log(`🤔 Current best is quite small (${(bestPassScore/1024/1024).toFixed(2)}MB). Looking for better quality...`);
                
                    // Try to find a result that's at least 1.2MB if possible
                    let betterQualityResult = null;
                    let betterQualityScore = bestPassScore;
                
                    for(const res of passResults) {
                        if (res.size <= maxSize && res.size >= 1.2 * 1024 * 1024) {
                            if (res.size > betterQualityScore) {
                                betterQualityScore = res.size;
                                betterQualityResult = res.buffer;
                                console.log(`📈 Found better quality option: ${(res.size/1024/1024).toFixed(2)}MB`);
                            }
                        }
                    }
                
                    if (betterQualityResult) {
                        bestPassResult = betterQualityResult;
                        bestPassScore = betterQualityScore;
                    }
                }

            // Fallback: if original is close to 2MB and we only have very small compressed versions
            if (!bestPassResult && buffer.length <= 2.1 * 1024 * 1024) {
                 console.log(`🔄 Fallback: Using original ${origSizeMB.toFixed(2)}MB (acceptable size)`);
                bestPassResult = buffer;
                bestPassScore = buffer.length;
            }
        }

        if (bestPassResult) {
            bestResult = bestPassResult;
            bestSize = bestPassResult.length;
            console.log(`✅ Best result: ${(bestSize / 1024 / 1024).toFixed(2)}MB`);
        }
        
        const finalSizeMB = bestSize / 1024 / 1024;
        console.log(`✅ Enhanced compression complete. Final size: ${finalSizeMB.toFixed(2)}MB`);
        
        return {
            buffer: Buffer.from(bestResult),
            filename: filename.replace(/\.[^.]+$/, '_compressed.pdf'),
            mimetype: 'application/pdf'
        };
        
    } catch (error) {
        console.error('❌ Enhanced PDF compression error:', error);
        throw error;
    }
}

/**
 * Main enhanced compression function
 */
async function compressFileEnhanced(buffer, mimeType, filename) {
    try {
        const originalSizeMB = buffer.length / 1024 / 1024;
        console.log(`📊 Enhanced compression - Original: ${originalSizeMB.toFixed(2)}MB`);
        console.log(`📋 MIME: ${mimeType} | File: ${filename}`);
        
        // Skip compression if already small enough
        if (buffer.length <= TARGET_SIZE) {
            console.log('✅ File already optimal size');
            return {
                buffer: buffer,
                filename: filename,
                mimetype: mimeType
            };
        }
        
        if (mimeType.startsWith('image/')) {
            return await compressImageEnhanced(buffer, mimeType, filename);
        } else if (mimeType === 'application/pdf') {
            return await compressPDFEnhanced(buffer, filename);
        } else {
            throw new Error(`Unsupported file type: ${mimeType}`);
        }
        
    } catch (error) {
        console.error('❌ Enhanced compression error:', error);
        throw error;
    }
}

module.exports = {
    compressFileEnhanced,
    compressImageEnhanced,
    compressPDFEnhanced,
    enhancedPDFCompression
};