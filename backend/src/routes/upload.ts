import express from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept video and audio files
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and audio files are allowed'));
    }
  },
});

// POST /api/upload/presigned-url - Get presigned URL for direct S3 upload
router.post('/presigned-url', async (req, res) => {
  try {
    const { fileName, fileType, workerId } = req.body;
    
    if (!fileName || !fileType || !workerId) {
      return res.status(400).json({
        error: 'fileName, fileType, and workerId are required'
      });
    }

    // Generate unique file key
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${workerId}/${uuidv4()}.${fileExtension}`;
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: uniqueFileName,
      ContentType: fileType,
      Metadata: {
        workerId: workerId,
        originalName: fileName,
      },
    });

    // Generate presigned URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${uniqueFileName}`;

    res.json({
      success: true,
      uploadUrl: signedUrl,
      fileUrl: fileUrl,
      key: uniqueFileName,
    });
    return;
  } catch (error) {
    console.error('Presigned URL error:', error);
    res.status(500).json({
      error: 'Failed to generate upload URL'
    });
    return;
  }
});

// POST /api/upload/direct - Direct file upload to S3
router.post('/direct', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided'
      });
    }

    const { workerId } = req.body;
    if (!workerId) {
      return res.status(400).json({
        error: 'workerId is required'
      });
    }

    // Generate unique file key
    const fileExtension = req.file.originalname.split('.').pop();
    const uniqueFileName = `${workerId}/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: uniqueFileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      Metadata: {
        workerId: workerId,
        originalName: req.file.originalname,
      },
    });

    await s3Client.send(command);

    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${uniqueFileName}`;

    res.json({
      success: true,
      fileUrl: fileUrl,
      key: uniqueFileName,
      size: req.file.size,
    });
    return;
  } catch (error) {
    console.error('Direct upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file'
    });
    return;
  }
});

// POST /api/upload/multiple - Upload multiple files
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'No files provided'
      });
    }

    const { workerId } = req.body;
    if (!workerId) {
      return res.status(400).json({
        error: 'workerId is required'
      });
    }

    const uploadPromises = files.map(async (file) => {
      const fileExtension = file.originalname.split('.').pop();
      const uniqueFileName = `${workerId}/${uuidv4()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          workerId: workerId,
          originalName: file.originalname,
        },
      });

      await s3Client.send(command);

      return {
        originalName: file.originalname,
        fileUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${uniqueFileName}`,
        key: uniqueFileName,
        size: file.size,
      };
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.json({
      success: true,
      files: uploadedFiles,
    });
    return;
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      error: 'Failed to upload files'
    });
    return;
  }
});

export default router;