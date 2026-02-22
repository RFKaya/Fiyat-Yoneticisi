import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Defines the path to the data file.
const dataFilePath = path.join(process.cwd(), 'src/data/app-data.json');

// Helper function to read data from the JSON file.
async function readData() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    // If the file doesn't exist, it might be the first run.
    // Let's check the error code.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File not found, which is okay on first start. Return a default structure.
      return { products: [], ingredients: [], categories: [], margins: [], platformCommissionRate: 15, kdvRate: 10, bankCommissionRate: 2.5 };
    }
    // For other errors, we should throw them.
    throw error;
  }
}

/**
 * Handles GET requests to fetch all application data.
 */
export async function GET() {
  try {
    const data = await readData();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ message: 'Error reading data file.', error: error.message }, { status: 500 });
  }
}

/**
 * Handles POST requests to update application data.
 * It completely overwrites the data file with the new data from the request body.
 */
export async function POST(request: Request) {
  try {
    const newData = await request.json();
    
    // Basic validation to ensure we're not writing junk
    if (typeof newData.products === 'undefined' || typeof newData.ingredients === 'undefined' || typeof newData.platformCommissionRate === 'undefined' || typeof newData.kdvRate === 'undefined' || typeof newData.bankCommissionRate === 'undefined') {
        throw new Error("Invalid data structure received.");
    }

    // Write the updated data back to the file, overwriting it.
    await fs.writeFile(dataFilePath, JSON.stringify(newData, null, 2));

    return NextResponse.json({ message: 'Data saved successfully.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error writing data file.', error: error.message }, { status: 500 });
  }
}
