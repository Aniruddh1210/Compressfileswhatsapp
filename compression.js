const fs = require('fs-extra');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { execSync } = require('child_process');

// Constants for compression
const TARGET_SIZE = 1.9 * 1024 * 1024; // Target 1.9MB for optimal quality  
const MAX_SIZE = 2 * 1024 * 1024; // Hard limit at 2MB
const MIN_QUALITY_SIZE = 1.5 * 1024 * 1024; // Don't over-compress - maintain quality

async function compressImage(buffer, mimeType, filename) {
    try {
        console.log(`🖼️ Compressing image targeting 1.9MB with best quality...`);
        
        // Get original image info
        const image = sharp(buffer);
        const metadata = await image.metadata();
        console.log(`📏 Original dimensions: ${metadata.width}x${metadata.height}`);
        
        // Start with high quality compression
        let quality = 85;
        let result = buffer;
        let attempts = 0;
        const maxAttempts = 8;
        
        while (result.length > TARGET_SIZE && attempts < maxAttempts && quality > 40) {
            attempts++;
            console.log(`🔧 Compression attempt ${attempts}/${maxAttempts} (quality: ${quality})...`);
            
            try {
                result = await sharp(buffer)
                    .jpeg({ 
                        quality: quality,
                        progressive: true,
                        mozjpeg: true
                    })
                    .toBuffer();
                
                const sizeMB = result.length / 1024 / 1024;
                console.log(`📊 Result: ${sizeMB.toFixed(2)}MB`);
                
                if (result.length <= TARGET_SIZE) {
                    console.log(`✅ Perfect! Achieved target size with quality ${quality}`);
                    break;
                }
                
                // Reduce quality for next attempt
                quality -= 8;
            } catch (error) {
                console.log(`⚠️ Quality ${quality} failed, trying lower...`);
                quality -= 10;
            }
        }
        
        // Final check - if still over 2MB hard limit, be more aggressive
        if (result.length > MAX_SIZE) {
            console.log('⚠️ Applying final aggressive compression to meet 2MB limit...');
            result = await sharp(buffer)
                .jpeg({ 
                    quality: 35,
                    progressive: true
                })
                .toBuffer();
        }
        
        const finalSizeMB = result.length / 1024 / 1024;
        console.log(`✅ Image compressed: ${finalSizeMB.toFixed(2)}MB`);
        
        const finalName = filename.replace(/\.[^.]+$/, '_compressed.jpg');
        return {
            buffer: result,
            filename: finalName,
            mimetype: 'image/jpeg'
        };
        
    } catch (error) {
        console.error('❌ Image compression error:', error);
        throw error;
    }
}

async function compressPDF(buffer, filename) {
    try {
        console.log(`📄 Compressing PDF targeting 1.9MB with best quality...`);
        
        // First analyze the PDF
        const pdfDoc = await PDFDocument.load(buffer);
        const pageCount = pdfDoc.getPageCount();
        console.log(`📖 PDF has ${pageCount} pages - keeping ALL pages`);
        
        // Start with PDF-lib optimization
        const optimizedBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50,
            updateFieldAppearances: false
        });
        
        let compressedBytes = optimizedBytes;
        let bestSize = compressedBytes.length;
        console.log(`🔍 Optimized save: ${(bestSize / 1024 / 1024).toFixed(2)}MB`);
        
        // Try external compression tools for better results
        const tempDir = './temp';
        const tempInputPath = `${tempDir}/input_${Date.now()}.pdf`;
        const tempOutputPath = `${tempDir}/output_${Date.now()}.pdf`;
        
        try {
            await fs.ensureDir(tempDir);
            await fs.writeFile(tempInputPath, compressedBytes);
            
            // Quality-focused compression strategies
            console.log('⚙️ Applying quality-focused advanced compression...');
            const qualityStrategies = [
                // High quality for readability
                `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress -dColorImageResolution=300 -dGrayImageResolution=300 -dMonoImageResolution=1200 -dAutoRotatePages=/None -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`,
                // Printer quality - good balance
                `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/printer -dColorImageResolution=200 -dGrayImageResolution=200 -dMonoImageResolution=600 -dAutoRotatePages=/None -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`,
                // eBook quality - smaller but readable
                `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dColorImageResolution=150 -dGrayImageResolution=150 -dMonoImageResolution=300 -dAutoRotatePages=/None -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`
            ];
            
            let bestResult = compressedBytes;
            
            for (let i = 0; i < qualityStrategies.length; i++) {
                try {
                    console.log(`🔧 Quality compression attempt ${i + 1}/${qualityStrategies.length}...`);
                    execSync(qualityStrategies[i], { stdio: 'pipe' });
                    
                    if (await fs.pathExists(tempOutputPath)) {
                        const result = await fs.readFile(tempOutputPath);
                        const resultSizeMB = result.length / 1024 / 1024;
                        console.log(`📊 Result: ${resultSizeMB.toFixed(2)}MB`);
                        
                        if (result.length < bestSize && result.length > 100) {
                            bestResult = result;
                            bestSize = result.length;
                            console.log(`📊 Better result: ${resultSizeMB.toFixed(2)}MB - continuing to find optimal quality...`);
                        }
                        await fs.remove(tempOutputPath);
                    }
                } catch (error) {
                    console.log('⚠️ Quality compression attempt failed, trying next...');
                }
            }
            
            compressedBytes = bestResult;

            // FINAL CHECK: If still too large, use progressively stronger strategies  
            if (bestSize > MAX_SIZE) {
                console.log('⚠️ Quality-focused compression insufficient, applying stronger compression...');
                
                // Adaptive compression based on ORIGINAL file size
                const originalSizeMB = buffer.length / 1024 / 1024;
                const strongerStrategies = [];
                
                if (originalSizeMB > 10) {
                    // For very large files (>10MB), use progressive aggressive compression
                    strongerStrategies.push(
                        // First try moderate aggressive
                        `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dColorImageResolution=72 -dGrayImageResolution=72 -dMonoImageResolution=150 -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`,
                        // Then very aggressive if needed  
                        `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dColorImageResolution=50 -dGrayImageResolution=50 -dMonoImageResolution=100 -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`,
                        // Ultra aggressive fallback
                        `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen -dColorImageResolution=36 -dGrayImageResolution=36 -dMonoImageResolution=72 -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`
                    );
                } else {
                    // For smaller files, use quality-focused compression targeting 1.4-1.7MB
                    strongerStrategies.push(`gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dColorImageResolution=175 -dGrayImageResolution=175 -dMonoImageResolution=350 -dColorImageDownsampleThreshold=1.0 -dGrayImageDownsampleThreshold=1.0 -dAutoRotatePages=/None -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`);
                }
                
                for (let i = 0; i < strongerStrategies.length; i++) {
                    try {
                        console.log(`🔥 Stronger compression ${i + 1}/${strongerStrategies.length}...`);
                        execSync(strongerStrategies[i], { stdio: 'pipe' });
                        if (await fs.pathExists(tempOutputPath)) {
                            const strongResult = await fs.readFile(tempOutputPath);
                            const strongSizeMB = strongResult.length / 1024 / 1024;
                            console.log(`📊 Strong compression result: ${strongSizeMB.toFixed(2)}MB`);
                            
                            if (strongResult.length <= MAX_SIZE && strongResult.length > 100) {
                                compressedBytes = strongResult;
                                bestSize = strongResult.length; // UPDATE bestSize so we don't get the error
                                console.log(`✅ SUCCESS! Got it under 2MB: ${strongSizeMB.toFixed(2)}MB`);
                                await fs.remove(tempOutputPath);
                                break; // STOP immediately when we get under 2MB
                            }
                        }
                        await fs.remove(tempOutputPath);
                    } catch (strongError) {
                        console.log('⚠️ Strong compression attempt failed, trying next...');
                    }
                }
            }
            
        } catch (error) {
            console.log('⚠️ External compression tools not available, using PDF-lib optimization only');
        }
        
        // Clean up temp files
        try {
            await fs.remove(tempInputPath);
            await fs.remove(tempOutputPath);
        } catch (cleanupError) {
            // Ignore cleanup errors
        }
        
        const finalName = filename.replace(/\.[^.]+$/, '_compressed.pdf');
        
        // If still too large after all compression attempts
        if (compressedBytes.length > MAX_SIZE) {
            console.log(`⚠️ PDF still ${(compressedBytes.length / 1024 / 1024).toFixed(2)}MB after compression`);
            console.log('📝 This PDF has very dense content - may need manual compression');
            
            // Don't throw error, let the main function handle it with fallback
            throw new Error(`PDF compressed to ${(compressedBytes.length / 1024 / 1024).toFixed(2)}MB but still over 2MB limit. Original content preserved.`);
        }
        
        const finalSizeMB = compressedBytes.length / 1024 / 1024;
        console.log(`✅ PDF compressed with excellent quality: ${finalSizeMB.toFixed(2)}MB (all ${pageCount} pages preserved)`);
        
        return {
            buffer: Buffer.from(compressedBytes),
            filename: finalName,
            mimetype: 'application/pdf'
        };
        
    } catch (error) {
        console.error('❌ PDF compression error:', error);
        throw error;
    }
}

async function compressFile(buffer, mimeType, filename) {
    try {
        console.log(`📊 Original file size: ${(buffer.length / 1024).toFixed(1)}KB`);
        console.log(`📋 MIME type: ${mimeType}`);
        console.log(`📁 Filename: ${filename}`);
        
        if (mimeType.startsWith('image/')) {
            return await compressImage(buffer, mimeType, filename);
        } else if (mimeType === 'application/pdf') {
            return await compressPDF(buffer, filename);
        } else {
            throw new Error(`Unsupported file type: ${mimeType}`);
        }
        
    } catch (error) {
        console.error('❌ Compression error:', error);
        throw error;
    }
}

module.exports = {
    compressFile,
    compressImage,
    compressPDF
};