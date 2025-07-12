"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const router = express_1.default.Router();
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only video and audio files are allowed'));
        }
    },
});
router.post('/presigned-url', async (req, res) => {
    try {
        const { fileName, fileType, workerId } = req.body;
        if (!fileName || !fileType || !workerId) {
            return res.status(400).json({
                error: 'fileName, fileType, and workerId are required'
            });
        }
        const fileExtension = fileName.split('.').pop();
        const uniqueFileName = `${workerId}/${(0, uuid_1.v4)()}.${fileExtension}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: uniqueFileName,
            ContentType: fileType,
            Metadata: {
                workerId: workerId,
                originalName: fileName,
            },
        });
        const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, {
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
    }
    catch (error) {
        console.error('Presigned URL error:', error);
        res.status(500).json({
            error: 'Failed to generate upload URL'
        });
        return;
    }
});
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
        const fileExtension = req.file.originalname.split('.').pop();
        const uniqueFileName = `${workerId}/${(0, uuid_1.v4)()}.${fileExtension}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
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
    }
    catch (error) {
        console.error('Direct upload error:', error);
        res.status(500).json({
            error: 'Failed to upload file'
        });
        return;
    }
});
router.post('/multiple', upload.array('files', 10), async (req, res) => {
    try {
        const files = req.files;
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
            const uniqueFileName = `${workerId}/${(0, uuid_1.v4)()}.${fileExtension}`;
            const command = new client_s3_1.PutObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
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
    }
    catch (error) {
        console.error('Multiple upload error:', error);
        res.status(500).json({
            error: 'Failed to upload files'
        });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map