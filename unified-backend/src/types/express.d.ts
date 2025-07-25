// import { Request as ExpressRequest } from 'express';
import { File as MulterFile } from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: MulterFile;
      files?: MulterFile[] | { [fieldname: string]: MulterFile[] };
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
    }
  }
}