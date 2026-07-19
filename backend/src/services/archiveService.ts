import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

interface ExtractedFileResult {
  originalFilename: string;
  storedFilename: string;
  fileUrl: string;
  fileSize: number;
  checksumSha256: string;
  fileType: string;
  folderPath: string;
}

export const extractArchiveSecurely = async (
  archivePath: string,
  destDir: string
): Promise<ExtractedFileResult[]> => {
  const extractedFiles: ExtractedFileResult[] = [];

  if (!fs.existsSync(archivePath)) {
    throw new Error('Archive file does not exist.');
  }

  const zip = new AdmZip(archivePath);
  const entries = zip.getEntries();

  // Security limits configuration
  const MAX_FILE_COUNT = 100;
  const MAX_TOTAL_SIZE = 300 * 1024 * 1024; // 300 MB
  const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.ps1', '.sh', '.msi', '.vbs', '.js', '.vbe', '.wsf'];

  if (entries.length > MAX_FILE_COUNT) {
    throw new Error(`Archive Bomb Blocked: Too many files in archive (Limit: ${MAX_FILE_COUNT}).`);
  }

  let totalSize = 0;
  for (const entry of entries) {
    if (!entry.isDirectory) {
      totalSize += entry.header.size;
    }
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    throw new Error(`Archive Bomb Blocked: Extracted size exceeds limit (Limit: 300MB).`);
  }

  // Ensure output directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName;

    // Guard: Prevent Path Traversal (e.g. ../../etc/passwd)
    const normalizedName = path.normalize(entryName).replace(/^(\.\.(\/|\\))+/, '');
    if (entryName.includes('..') || path.isAbsolute(normalizedName)) {
      console.warn(`[ArchiveService] Malicious path traversal attempt blocked: ${entryName}`);
      continue;
    }

    const ext = path.extname(entryName).toLowerCase();
    
    // Guard: Block executable files
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      console.warn(`[ArchiveService] Executable payload rejected: ${entryName}`);
      continue;
    }

    // Save with unique name to avoid naming collision in target dir
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const basename = path.basename(normalizedName);
    const storedFilename = `${uniqueSuffix}-${basename}`;
    const fileUrl = path.join(destDir, storedFilename);

    // Extract file content
    const fileBuffer = entry.getData();
    fs.writeFileSync(fileUrl, fileBuffer);

    // Compute checksum
    const checksumSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    extractedFiles.push({
      originalFilename: basename,
      storedFilename,
      fileUrl,
      fileSize: fileBuffer.length,
      checksumSha256,
      fileType: ext.substring(1).toUpperCase(),
      folderPath: path.dirname(normalizedName) === '.' ? '' : path.dirname(normalizedName),
    });
  }

  return extractedFiles;
};
