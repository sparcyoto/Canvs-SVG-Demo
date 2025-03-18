import DrawingCanvas from './components/DrawingCanvas';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Interactive Drawing Interpreter
        </h1>
        <p className="mb-8 text-center bg-black">
          Draw something on the canvas and get real-time interpretations from AI
        </p>
        <div className="flex justify-center">
          <DrawingCanvas width={800} height={500} />
        </div>
      </div>
    </main>
  );
}
