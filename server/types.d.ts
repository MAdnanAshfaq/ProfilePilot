declare module 'pdf-parse';
declare module 'multer';

// Extend Express Request type to include file property from multer
declare namespace Express {
  interface Request {
    file?: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    };
    files?: {
      [fieldname: string]: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
      }[];
    };
  }
}