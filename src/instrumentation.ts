export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron');
    const { runBackup } = await import('./lib/backup');
    const { createLogger } = await import('./lib/logger');
    
    const log = createLogger('System:Instrumentation');
    
    log.info('Yedekleme sistemi başlatılıyor...');

    // Schedule backup to run every day at midnight (00:00)
    // Pattern: 'minute hour day-of-month month day-of-week'
    cron.schedule('0 0 * * *', async () => {
      log.info('Zamanlanmış yedekleme işlemi başlatıldı (00:00)');
      await runBackup();
    });

    log.success('Yedekleme sistemi başarıyla zamanlandı (Her gün 00:00)');
    
    // Optional: Take an initial backup on startup if you want to be sure it's working
    // process.nextTick(runBackup); 
  }
}
