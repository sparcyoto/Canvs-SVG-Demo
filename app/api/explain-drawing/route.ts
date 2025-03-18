import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(
  // Replace this with your actual Gemini API key or use environment variable
  'AIzaSyDrJOJbV6p9YJk-PK_nI5H48_PhvX3KNNY'
  // process.env.GEMINI_API_KEY,
);

export async function POST(request: NextRequest) {
  try {
    const { canvasData, imageData } = await request.json();

    // Use the image data if available, otherwise fall back to SVG conversion
    const imageContent = imageData ? 
      { inlineData: { data: imageData, mimeType: "image/png" } } : 
      { text: convertToSVG(canvasData) };
    
    // Extract path information to create a simplified representation
    const pathsInfo = extractPathsInfo(canvasData);

    console.log("pathsInfo", pathsInfo);
    if (!imageData) console.log("svgData", imageContent.text);
    else console.log("Using image data");
    
    // Send to Gemini API for interpretation
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `Detect Math symbols or numbers from the drawing.
Please identify any mathematical symbols, numbers, equations, or expressions shown in this drawing.
Be specific about what you see and if it forms a coherent mathematical expression.`;
    
    const result = await model.generateContent([
      { text: prompt },
      imageContent,
      { text: `Additional vector data for context: ${JSON.stringify(pathsInfo)}` }
    ]);
    
    const response = await result.response;
    
    // Extract explanation from Gemini response
    const explanation = response.text() || "Unable to interpret the drawing";

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error processing drawing:', error);
    return NextResponse.json(
      { error: 'Failed to process drawing' },
      { status: 500 }
    );
  }
}

// Helper function to convert fabric canvas data to SVG
function convertToSVG(canvasData: any): string {
  try {
    // Extract dimensions
    const width = canvasData.width || 600;
    const height = canvasData.height || 400;
    
    // Start SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    
    // Process each path object
    if (canvasData.objects && Array.isArray(canvasData.objects)) {
      canvasData.objects.forEach((obj: any) => {
        if (obj.type === 'path' && obj.path) {
          // Extract path data
          const pathData = convertFabricPathToSVG(obj.path);
          const stroke = obj.stroke || '#000000';
          const strokeWidth = obj.strokeWidth || 1;
          
          // Add path to SVG
          svg += `<path d="${pathData}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
        }
      });
    }
    
    // End SVG
    svg += '</svg>';
    return svg;
  } catch (error) {
    console.error('Error converting to SVG:', error);
    return '<svg xmlns="http://www.w3.org/2000/svg"></svg>'; // Return empty SVG on error
  }
}

// Helper function to convert fabric.js path commands to SVG path data
function convertFabricPathToSVG(pathData: any[]): string {
  if (!Array.isArray(pathData)) return '';
  
  let svgPath = '';
  
  pathData.forEach((cmd) => {
    if (Array.isArray(cmd)) {
      const command = cmd[0];
      const args = cmd.slice(1);
      
      switch (command) {
        case 'M': // Move to
          svgPath += `M${args[0]},${args[1]} `;
          break;
        case 'L': // Line to
          svgPath += `L${args[0]},${args[1]} `;
          break;
        case 'Q': // Quadratic curve
          svgPath += `Q${args[0]},${args[1]},${args[2]},${args[3]} `;
          break;
        case 'C': // Cubic curve
          svgPath += `C${args[0]},${args[1]},${args[2]},${args[3]},${args[4]},${args[5]} `;
          break;
        case 'Z': // Close path
          svgPath += 'Z ';
          break;
      }
    }
  });
  
  return svgPath.trim();
}

// Helper function to extract relevant path information
function extractPathsInfo(canvasData: any) {
  if (!canvasData.objects || !Array.isArray(canvasData.objects)) {
    return [];
  }

  return canvasData.objects.map((obj: any) => {
    // For path objects, extract the path data and any other relevant properties
    if (obj.type === 'path') {
      return {
        type: 'path',
        path: obj.path, // Contains the movement commands and coordinates
        stroke: obj.stroke, // Color
        strokeWidth: obj.strokeWidth,
        // Add other relevant properties as needed
      };
    }
    return obj;
  });
}

// Helper function to calculate the overall bounds of the drawing
function calculateDrawingBounds(pathObjects: any[]) {
  if (pathObjects.length === 0) {
    return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  pathObjects.forEach(obj => {
    const left = obj.left || 0;
    const top = obj.top || 0;
    const width = obj.width || 0;
    const height = obj.height || 0;

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, left + width);
    maxY = Math.max(maxY, top + height);
  });

  return {
    width: maxX - minX,
    height: maxY - minY,
    minX,
    minY,
    maxX,
    maxY
  };
} 