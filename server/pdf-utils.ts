import { readFile } from 'fs/promises';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    // Sanitize text by removing null bytes and other problematic characters 
    // that can cause UTF-8 encoding issues
    const sanitizedText = (data.text || '')
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove other control characters
    
    return sanitizedText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF');
  }
}

export async function parsePdfFile(filePath: string): Promise<string> {
  try {
    const buffer = await readFile(filePath);
    return await parsePdfBuffer(buffer);
  } catch (error) {
    console.error('Error reading or parsing PDF file:', error);
    throw new Error('Failed to parse PDF file');
  }
}

export function bufferToBase64(buffer: Buffer): string {
  // Ensure we're properly handling binary data by explicitly converting to base64
  // and sanitizing the output if needed
  try {
    const base64String = buffer.toString('base64');
    return base64String;
  } catch (error) {
    console.error('Error converting buffer to base64:', error);
    return '';
  }
}

export function base64ToBuffer(base64: string): Buffer {
  try {
    return Buffer.from(base64, 'base64');
  } catch (error) {
    console.error('Error converting base64 to buffer:', error);
    return Buffer.from('');
  }
}