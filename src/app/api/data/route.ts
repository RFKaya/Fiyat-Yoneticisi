import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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
};

// Helper function to read data. If the file doesn't exist, it creates it.
async function readData() {
  try {
    const fileContent = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    // If the file or directory doesn't exist, create it.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      try {
        console.log('Data file not found. Creating a new one...');
        await fs.mkdir(dataDirPath, { recursive: true });
        await fs.writeFile(dataFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
        return defaultData;
      } catch (writeError) {
        console.error('Failed to create default data file:', writeError);
        // If we can't create the file, there's a bigger problem.
        throw new Error('Failed to create and initialize data file.');
      }
    }
    // For other errors, re-throw them.
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
    
    // Ensure the directory exists before writing. This is a safeguard.
    await fs.mkdir(dataDirPath, { recursive: true });

    // Write the updated data back to the file, overwriting it.
    await fs.writeFile(dataFilePath, JSON.stringify(newData, null, 2));

    return NextResponse.json({ message: 'Data saved successfully.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Error writing data file.', error: error.message }, { status: 500 });
  }
}
