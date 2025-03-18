"use client";

import React, { useEffect, useRef, useState } from "react";
// import throttle from 'lodash/throttle'; // Remove this import
import { throttle, isEmpty } from "lodash";

interface DrawingCanvasProps {
  width?: number;
  height?: number;
}

export default function DrawingCanvas({
  width = 600,
  height = 400,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabric, setFabric] = useState<any>(null);
  const fabricCanvasRef = useRef<any>(null);
  const [explanation, setExplanation] = useState<string>(
    "Draw something to get an explanation..."
  );
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Dynamic import for fabric.js
  useEffect(() => {
    import("fabric").then((fabricModule) => {
      setFabric(fabricModule);
    });
  }, []);

  // Setup canvas on component mount and when fabric is loaded
  useEffect(() => {
    if (!fabric || !canvasRef.current) return;

    fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      width,
      height,
    });

    const canvas = fabricCanvasRef.current;

    // Setup free drawing brush
    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.width = 3;
    canvas.freeDrawingBrush.color = "#FFFFFF";

    // Set up event listeners for mouse interactions
    canvas.on("mouse:down", () => {
      console.log("mouse:down");
      setIsDrawing(true);
    });

    canvas.on("mouse:up", () => {
      console.log("mouse:up");
      setIsDrawing(false);
    });

    canvas.on("mouse:out", () => {
      setIsDrawing(false);
    });

    // Add path:created event for better drawing detection
    canvas.on("path:created", () => {
      console.log("path:created");
      sendDrawingData();
    });

    // Add mouse:move event to track continuous drawing
    canvas.on("mouse:move", () => {
      if (isDrawing) {
        sendDrawingData();
      }
    });

    return () => {
      fabricCanvasRef.current?.dispose();
    };
  }, [fabric, width, height]);

  // Function to get canvas data as vector paths
  const getCanvasData = () => {
    if (!fabricCanvasRef.current) return null;
    
    // Get JSON representation of the canvas objects
    const jsonData = fabricCanvasRef.current.toJSON();
    return jsonData;
  };

  console.log("isDrawing", isDrawing);

  // Send data to API and get explanation - throttled to 1200ms
  const sendDrawingData = useRef(
    throttle(async () => {
      const canvasData = getCanvasData();
      
      if (!canvasData || isEmpty(canvasData)) return;

      // Get the actual image data from the canvas
      let imageData = null;
      if (fabricCanvasRef.current) {
        // Convert canvas to base64 PNG
        imageData = fabricCanvasRef.current.toDataURL({
          format: 'png',
          quality: 0.8
        });
        
        // Remove the data URL prefix to get just the base64 data
        imageData = imageData.replace(/^data:image\/(png|jpg);base64,/, '');
      }

      console.log("canvasData", canvasData);
      console.log("Sending image data:", imageData ? "Yes" : "No");

      try {
        const response = await fetch("/api/explain-drawing", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            canvasData,
            imageData 
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setExplanation(data.explanation);
        }
      } catch (error) {
        console.error("Error sending drawing data:", error);
      }
    }, 1200)
  ).current;

  // Effect to trigger the API call based on canvas changes
  useEffect(() => {
    if (isDrawing) {
      sendDrawingData();
    }
  }, [isDrawing, sendDrawingData]);

  // Clear the canvas
  const handleClear = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      setExplanation("Draw something to get an explanation...");
      setIsDrawing(false);
    }
  };

  return (
    <div className="drawing-container">
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} />
        <button onClick={handleClear} className="clear-button">
          Clear Canvas
        </button>
      </div>
      <div className="explanation-panel" style={{ backgroundColor: "black" }}>
        <h3>Explanation:</h3>
        <p>{explanation}</p>
      </div>
      <style jsx>{`
        .drawing-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: ${width}px;
        }
        .canvas-wrapper {
          position: relative;
          border: 1px solid #ccc;
        }
        .clear-button {
          position: absolute;
          bottom: 10px;
          right: 10px;
          padding: 8px 16px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .explanation-panel {
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: #f9f9f9;
          min-height: 100px;
        }
      `}</style>
    </div>
  );
}
