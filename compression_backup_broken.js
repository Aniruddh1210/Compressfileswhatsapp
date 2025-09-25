const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

const MAX_SIZE = 2 * 1024                            const gsResult = await fs.readFile(tempOutputPath);
                            const resultSizeMB = gsResult.length / 1024 / 1024;
                            console.log(`📊 Compression result: ${resultSizeMB.toFixed(2)}MB`);
                            
                            // QUALITY FIRST: Use first good result, don't over-compress
                            if (gsResult.length <= MAX_SIZE && gsResult.length > 100) {
                                bestResult = gsResult;
                                bestSize = gsResult.length;
                                console.log(`✅ EXCELLENT quality achieved: ${resultSizeMB.toFixed(2)}MB`);
                                await fs.remove(tempOutputPath);
                                break; // STOP HERE - preserve quality over aggressive compression
                            }
                            
                            // Clean up for next attempt  
                            await fs.remove(tempOutputPath);/ 2MB in bytes
const TARGET_SIZE = 1.9 * 1024 * 1024; // Target 1.9MB for optimal quality
const MIN_QUALITY_SIZE = 1.5 * 1024 * 1024; // Don't over-compress - maintain quality

// Create temporary directories if they don't exist
const createTempDirs = () => {
    fs.ensureDirSync('./temp/uploads');
    fs.ensureDirSync('./temp/compressed');
};

// Helper function to get file size
const getFileSize = (filePath) => {
    return fs.statSync(filePath).size;
};

// Helper function to get base64 size (approximate)
const getBase64Size = (base64String) => {
    return Math.round((base64String.length * 0.75)); // Base64 to bytes conversion
};

// Compress Image - Target 1.9MB with Maximum Quality
const compressImage = async (inputBuffer, originalName) => {
    try {
        console.log('🖼️ Compressing image targeting 1.9MB with best quality...');
        
        // Get image metadata
        const image = sharp(inputBuffer);
        const metadata = await image.metadata();
        console.log(`� Original: ${metadata.width}x${metadata.height}, ${(inputBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        
        // If already under 1.9MB, return as-is with minimal optimization
        if (inputBuffer.length <= TARGET_SIZE) {
            console.log('✅ Already perfect size - applying minimal optimization');
            const compressedBuffer = await sharp(inputBuffer)
                .jpeg({ quality: 95, progressive: true })
                .toBuffer();
            
            const finalName = originalName.replace(/\.[^.]+$/, '_compressed.jpg');
            console.log(`✅ Optimized: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
            
            return {
                buffer: compressedBuffer,
                filename: finalName,
                mimetype: 'image/jpeg'
            };
        }

        // Smart compression - find the sweet spot around 1.9MB
        let bestBuffer = null;
        let bestSize = 0;
        
        // Try different quality levels to hit 1.9MB target
        const qualityLevels = [90, 85, 80, 75, 70];
        
        for (const quality of qualityLevels) {
            const testBuffer = await sharp(inputBuffer)
                .jpeg({ quality: quality, progressive: true })
                .toBuffer();
            
            console.log(`🧪 Testing Q${quality}: ${(testBuffer.length / 1024 / 1024).toFixed(2)}MB`);
            
            // If this gets us close to 1.9MB, use it
            if (testBuffer.length <= TARGET_SIZE && testBuffer.length >= MIN_QUALITY_SIZE) {
                bestBuffer = testBuffer;
                bestSize = testBuffer.length;
                console.log(`✅ Found perfect quality at ${quality}%`);
                break;
            }
            
            // If under 2MB but not ideal, keep as backup
            if (testBuffer.length <= MAX_SIZE) {
                bestBuffer = testBuffer;
                bestSize = testBuffer.length;
            }
        }
        
        // If quality compression isn't enough, try gentle resizing
        if (!bestBuffer || bestSize > MAX_SIZE) {
            console.log('🔧 Trying gentle resize with high quality...');
            
            const newWidth = Math.floor(metadata.width * 0.85); // Only 15% smaller
            bestBuffer = await sharp(inputBuffer)
                .resize(newWidth, null, { withoutEnlargement: true, fit: 'inside' })
                .jpeg({ quality: 85, progressive: true })
                .toBuffer();
                
            console.log(`📐 Resized result: ${(bestBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        }
        
        const finalName = originalName.replace(/\.[^.]+$/, '_compressed.jpg');
        console.log(`✅ Final result: ${(bestBuffer.length / 1024 / 1024).toFixed(2)}MB with excellent quality`);
        
        return {
            buffer: bestBuffer,
            filename: finalName,
            mimetype: 'image/jpeg'
        };
        
    } catch (error) {
        console.error('❌ Image compression error:', error);
        throw error;
    }
};

// Compress PDF - PROPER COMPRESSION (like online services)
const compressPDF = async (inputBuffer, originalName) => {
    try {
        console.log('📄 Compressing PDF properly (no content loss)...');
        
        // Load the PDF
        const pdfDoc = await PDFDocument.load(inputBuffer);
        const pageCount = pdfDoc.getPageCount();
        
        console.log(`📖 PDF has ${pageCount} pages - keeping ALL pages`);
        
        // Strategy 1: Save with moderate compression settings first
        let compressedBytes = await pdfDoc.save({
            useObjectStreams: true, // Keep object streams for better quality
            addDefaultPage: false,
        });
        console.log(`🔍 Optimized save: ${(compressedBytes.length / 1024).toFixed(1)}KB`);
        
        // If still too large, we need external compression
        if (compressedBytes.length > MAX_SIZE) {
            console.log('⚙️ Applying advanced compression techniques...');
            
            // Save to temp file for external processing
            const tempDir = './temp';
            const fs = require('fs-extra');
            await fs.ensureDir(tempDir);
            
            const tempInputPath = `${tempDir}/input_${Date.now()}.pdf`;
            const tempOutputPath = `${tempDir}/output_${Date.now()}.pdf`;
            
            await fs.writeFile(tempInputPath, Buffer.from(compressedBytes));
            
            try {
                // Try using Ghostscript for compression if available
                const { execSync } = require('child_process');
                
                // ULTRA-gentle compression strategies - maximum quality preservation
                const strategies = [
                    // Almost no compression (maximum quality)
                    `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress -dColorImageResolution=400 -dGrayImageResolution=400 -dMonoImageResolution=800 -dColorImageDownsampleThreshold=1.0 -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`,
                    // Tiny compression (excellent quality)
                    `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress -dColorImageResolution=300 -dGrayImageResolution=300 -dMonoImageResolution=600 -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`,
                    // Light compression (still very good quality)
                    `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/printer -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${tempOutputPath}" "${tempInputPath}"`
                ];
                
                let bestResult = compressedBytes;
                let bestSize = compressedBytes.length;
                
                for (const strategy of strategies) {
                    try {
                        console.log(`🔧 Trying Ghostscript compression...`);
                        execSync(strategy, { stdio: 'pipe' });
                        
                        if (await fs.pathExists(tempOutputPath)) {
                            const gsResult = await fs.readFile(tempOutputPath);
                            console.log(`� Ghostscript result: ${(gsResult.length / 1024).toFixed(1)}KB`);
                            
                            if (gsResult.length < bestSize && gsResult.length > 100) { // Ensure it's not corrupted
                                bestResult = gsResult;
                                bestSize = gsResult.length;
                            }
                            
                            // Clean up for next attempt
                            await fs.remove(tempOutputPath);
                            
                            // If we got to optimal quality range (under 1.9MB), perfect!
                            if (bestSize <= TARGET_SIZE) {
                                console.log(`✅ PERFECT! Achieved optimal quality at ${(bestSize / 1024 / 1024).toFixed(2)}MB!`);
                                break;
                            }
                            // If we got under 2MB, that's acceptable - don't over-compress
                            else if (bestSize <= MAX_SIZE && bestSize >= MIN_QUALITY_SIZE) {
                                console.log(`✅ Excellent quality maintained at ${(bestSize / 1024 / 1024).toFixed(2)}MB`);
                                break; // Stop here to preserve quality
                            }
                        }
                    } catch (gsError) {
                        console.log('⚠️ Ghostscript compression failed, trying next strategy...');
                    }
                }
                
                compressedBytes = bestResult;
                
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
        }
        
        const finalName = originalName.replace(/\.[^.]+$/, '_compressed.pdf');
        
        // If still too large after all compression attempts
        if (compressedBytes.length > MAX_SIZE) {
            console.log(`⚠️ PDF still ${(compressedBytes.length / 1024).toFixed(1)}KB after compression`);
            console.log('📝 This PDF has very dense content - may need manual compression');
            
            // Don't throw error, let the main function handle it with fallback
            throw new Error(`PDF compressed to ${(compressedBytes.length / 1024).toFixed(1)}KB but still over 2MB limit. Original content preserved.`);
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
};

// Compress Video (basic - requires ffmpeg to be installed)
const compressVideo = async (inputBuffer, originalName) => {
    try {
        console.log('🎥 Video compression not implemented yet');
        console.log('📝 For now, returning original video with size warning');
        
        // For now, just return the original if it's under 2MB
        if (inputBuffer.length <= MAX_SIZE) {
            return {
                buffer: inputBuffer,
                filename: originalName,
                mimetype: 'video/mp4'
            };
        } else {
            throw new Error('Video too large - compression not yet implemented');
        }
    } catch (error) {
        console.error('❌ Video compression error:', error);
        throw error;
    }
};

// Compress other files - AGGRESSIVE MODE
const compressOtherFile = async (inputBuffer, originalName, mimetype) => {
    try {
        console.log('📦 Attempting compression for other file types...');
        
        // If already under 2MB, return as-is
        if (inputBuffer.length <= MAX_SIZE) {
            return {
                buffer: inputBuffer,
                filename: originalName,
                mimetype: mimetype
            };
        }
        
        console.log('⚠️ File too large for this type, will create summary document');
        // Don't try to compress unknown file types, let main function handle with summary
        throw new Error(`File type ${mimetype} too large - creating summary instead`);
        
    } catch (error) {
        console.error('❌ Other file compression error:', error);
        throw error;
    }
};

// GUARANTEED file splitter for files that can't be compressed
const createFileSummary = async (filename, originalSize, mimetype) => {
    console.log('🔨 Creating file summary document...');
    
    // Create a text summary document
    const summaryText = `FILE TOO LARGE - SUMMARY DOCUMENT

Original File: ${filename || 'Unknown'}
Original Size: ${(originalSize / (1024 * 1024)).toFixed(2)} MB
File Type: ${mimetype}
Date: ${new Date().toISOString().split('T')[0]}

This file was too large to compress to 2MB.

Options to access full file:
1. Use a file compression app
2. Upload to Google Drive/Dropbox and share link
3. Split file into smaller parts
4. Reduce quality/resolution before sending

Compressed by WhatsApp File Compressor Bot`;
    
    const summaryBuffer = Buffer.from(summaryText, 'utf8');
    
    return {
        buffer: summaryBuffer,
        filename: `${filename || 'file'}_SUMMARY.txt`,
        mimetype: 'text/plain'
    };
};

// Main compression function - GUARANTEED to return ≤2MB
const compressFile = async (mediaBuffer, filename, mimetype) => {
    try {
        createTempDirs();
        
        const originalSize = mediaBuffer.length;
        console.log(`📊 Original file size: ${(originalSize / 1024).toFixed(1)}KB`);
        console.log(`📋 MIME type: ${mimetype}`);
        console.log(`📁 Filename: ${filename}`);
        
        // If already under 2MB, return as-is
        if (originalSize <= MAX_SIZE) {
            console.log('✅ File already under 2MB, no compression needed');
            return {
                buffer: mediaBuffer,
                filename: filename || 'file',
                mimetype: mimetype
            };
        }
        
        let result;
        
        // Determine file type and compress accordingly
        try {
            if (mimetype.startsWith('image/')) {
                result = await compressImage(mediaBuffer, filename || 'image.jpg', mimetype);
            } else if (mimetype === 'application/pdf') {
                result = await compressPDF(mediaBuffer, filename || 'document.pdf');
            } else if (mimetype.startsWith('video/')) {
                result = await compressVideo(mediaBuffer, filename || 'video.mp4');
            } else {
                result = await compressOtherFile(mediaBuffer, filename || 'file', mimetype);
            }
            
            // DOUBLE CHECK: If result is still too large, force create summary
            if (result.buffer.length > MAX_SIZE) {
                console.log('🚨 Compression result still too large, creating summary document');
                result = await createFileSummary(filename, originalSize, mimetype);
            }
            
        } catch (compressionError) {
            console.log('🚨 Compression failed, creating summary document');
            result = await createFileSummary(filename, originalSize, mimetype);
        }
        
        // FINAL GUARANTEE: Check one more time
        if (result.buffer.length > MAX_SIZE) {
            console.log('🆘 EMERGENCY: Even summary too large, creating minimal response');
            const emergencyText = `File too large: ${filename}\nSize: ${(originalSize / (1024 * 1024)).toFixed(2)}MB\nPlease compress manually.`;
            result = {
                buffer: Buffer.from(emergencyText, 'utf8'),
                filename: 'file_too_large.txt',
                mimetype: 'text/plain'
            };
        }
        
        console.log(`🎯 GUARANTEED RESULT: ${(result.buffer.length / 1024).toFixed(1)}KB (≤2MB)`);
        return result;
        
    } catch (error) {
        console.error('❌ Critical compression error:', error);
        
        // ABSOLUTE FALLBACK: Always return something ≤2MB
        const fallbackText = `Compression failed for: ${filename || 'Unknown file'}\nError: ${error.message}\nPlease try a smaller file.`;
        return {
            buffer: Buffer.from(fallbackText, 'utf8'),
            filename: 'compression_failed.txt',
            mimetype: 'text/plain'
        };
    }
};

module.exports = {
    compressFile,
    MAX_SIZE
};