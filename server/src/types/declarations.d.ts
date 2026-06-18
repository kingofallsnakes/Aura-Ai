declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }

  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>;
  export = pdfParse;
}

declare module 'hpp' {
  import { RequestHandler } from 'express';
  function hpp(options?: Record<string, unknown>): RequestHandler;
  export = hpp;
}
