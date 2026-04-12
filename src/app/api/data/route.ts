import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyAuthCookie } from '@/lib/auth';
import { apiDataLogger as log, logApiRequest, logApiResponse, logApiError, summarizeData } from '@/lib/logger';

// Define paths and default data structure
const dataDirPath = path.join(process.cwd(), 'src/data');
const dataFilePath = path.join(dataDirPath, 'app-data.json');
const defaultData = {
  products: [],
  ingredients: [],
  categories: [],
  margins: [],
  platformCommissionRate: 15,
  kdvRate: 10,
  bankCommissionRate: 2.5,
  stopajRate: 1,
};

// Helper function to read data. If the file doesn't exist, it creates it.
async function readData() {
  try {
    log.debug('Veri dosyası okunuyor...', { path: dataFilePath });
    const fileContent = await fs.readFile(dataFilePath, 'utf8');
    const data = JSON.parse(fileContent);
    log.debug('Veri dosyası başarıyla okundu', summarizeData(data));
    return data;
  } catch (error) {
    // If the file or directory doesn't exist, create it.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      try {
        log.warn('Veri dosyası bulunamadı, yeni dosya oluşturuluyor...', { path: dataFilePath });
        await fs.mkdir(dataDirPath, { recursive: true });
        await fs.writeFile(dataFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
        log.success('Varsayılan veri dosyası başarıyla oluşturuldu');
        return defaultData;
      } catch (writeError) {
        log.error('Varsayılan veri dosyası oluşturulamadı!', writeError);
        // If we can't create the file, there's a bigger problem.
        throw new Error('Failed to create and initialize data file.');
      }
    }
    log.error('Veri dosyası okunurken beklenmeyen hata', error);
    // For other errors, re-throw them.
    throw error;
  }
}

/**
 * Handles GET requests to fetch all application data.
 */
export async function GET() {
  logApiRequest('API:Data', 'GET');

  if (!(await verifyAuthCookie())) {
    logApiResponse('API:Data', 'GET', 401, { reason: 'Yetkilendirme başarısız' });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const timer = log.time('GET veri okuma süresi');
    const data = await readData();
    timer.end();

    logApiResponse('API:Data', 'GET', 200, {
      products: data.products?.length || 0,
      ingredients: data.ingredients?.length || 0,
      categories: data.categories?.length || 0,
      margins: data.margins?.length || 0,
      rates: {
        platformCommission: data.platformCommissionRate,
        bankCommission: data.bankCommissionRate,
        kdv: data.kdvRate,
        stopaj: data.stopajRate,
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    logApiError('API:Data', 'GET', error);
    return NextResponse.json({ message: 'Error reading data file.', error: error.message }, { status: 500 });
  }
}

/**
 * Handles POST requests to update application data.
 * It completely overwrites the data file with the new data from the request body.
 */
export async function POST(request: Request) {
  logApiRequest('API:Data', 'POST');

  if (!(await verifyAuthCookie())) {
    logApiResponse('API:Data', 'POST', 401, { reason: 'Yetkilendirme başarısız' });
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const newData = await request.json();
    
    log.debug('Gelen veri yapısı kontrol ediliyor...', summarizeData(newData));

    // Basic validation to ensure we're not writing junk
    if (typeof newData.products === 'undefined' || typeof newData.ingredients === 'undefined' || typeof newData.platformCommissionRate === 'undefined' || typeof newData.kdvRate === 'undefined' || typeof newData.bankCommissionRate === 'undefined' || typeof newData.stopajRate === 'undefined') {
        log.error('Geçersiz veri yapısı! Zorunlu alanlar eksik.', {
          products: typeof newData.products !== 'undefined',
          ingredients: typeof newData.ingredients !== 'undefined',
          platformCommissionRate: typeof newData.platformCommissionRate !== 'undefined',
          kdvRate: typeof newData.kdvRate !== 'undefined',
          bankCommissionRate: typeof newData.bankCommissionRate !== 'undefined',
          stopajRate: typeof newData.stopajRate !== 'undefined',
        });
        throw new Error("Invalid data structure received.");
    }
    
    // Ensure the directory exists before writing. This is a safeguard.
    await fs.mkdir(dataDirPath, { recursive: true });

    const timer = log.time('POST veri yazma süresi');
    // Write the updated data back to the file, overwriting it.
    await fs.writeFile(dataFilePath, JSON.stringify(newData, null, 2));
    timer.end();

    logApiResponse('API:Data', 'POST', 200, {
      products: newData.products?.length || 0,
      ingredients: newData.ingredients?.length || 0,
      categories: newData.categories?.length || 0,
      margins: newData.margins?.length || 0,
    });

    return NextResponse.json({ message: 'Data saved successfully.' }, { status: 200 });
  } catch (error: any) {
    logApiError('API:Data', 'POST', error);
    return NextResponse.json({ message: 'Error writing data file.', error: error.message }, { status: 500 });
  }
}
