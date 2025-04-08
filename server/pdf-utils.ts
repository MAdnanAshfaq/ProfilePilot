import { readFile } from 'fs/promises';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
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
  return buffer.toString('base64');
}

export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}