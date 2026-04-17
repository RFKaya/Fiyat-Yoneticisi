import fs from 'fs';
import path from 'path';
import { createLogger } from './logger';

const log = createLogger('Utils:Backup');

/**
 * Performs a backup of the SQLite database.
 * Copies the database file to a timestamped file in the /backups directory.
 */
export async function runBackup() {
  try {
    const startTime = Date.now();
    
    // 1. Determine database source path
    let dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/database.sqlite';
    if (!path.isAbsolute(dbPath)) {
      dbPath = path.join(process.cwd(), dbPath);
    }

    if (!fs.existsSync(dbPath)) {
      log.error('Veritabanı dosyası bulunamadı', { path: dbPath });
      return { success: false, error: 'Source database not found' };
    }

    // 2. Ensure backup directory exists
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      log.info('Yedekleme dizini oluşturuluyor...', { path: backupDir });
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 3. Generate backup filename
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .split('Z')[0];
    
    const backupFileName = `db_backup_${timestamp}.sqlite`;
    const destinationPath = path.join(backupDir, backupFileName);

    // 4. Perform copy
    // Note: Using copyFileSync for simple atomic-ish operation in local environment
    fs.copyFileSync(dbPath, destinationPath);
    
    const duration = Date.now() - startTime;
    const stats = fs.statSync(destinationPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    log.success('Veritabanı yedeği başarıyla alındı', {
      file: backupFileName,
      size: `${sizeMB} MB`,
      duration: `${duration}ms`
    });

    return { 
      success: true, 
      file: backupFileName, 
      path: destinationPath,
      size: stats.size
    };

  } catch (error) {
    log.error('Yedekleme işlemi sırasında hata oluştu', {
      error: error instanceof Error ? error.message : String(error)
    });
    return { success: false, error };
  }
}
