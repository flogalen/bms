import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import compression from "compression";

// Load environment variables first
dotenv.config();

console.log("Environment variables loaded");

// Create the express app
const app = express();

console.log("Express app created");

// Add a simple console log to verify code execution
console.log("Server initialization started...");

// Middleware
try {
  app.use(cors());
  console.log("CORS middleware initialized");
  
  app.use(helmet());
  console.log("Helmet middleware initialized");
  
  app.use(compression());
  console.log("Compression middleware initialized");
  
  app.use(express.json());
  console.log("JSON parsing middleware initialized");
  
  app.use(express.urlencoded({ extended: true }));
  console.log("URL encoding middleware initialized");
  
  app.use(cookieParser());
  console.log("Cookie parser middleware initialized");
} catch (err) {
  console.error("Error during middleware setup:", err);
  process.exit(1);
}

// Test route
app.get("/test", (req, res) => {
  console.log("Test route accessed");
  res.status(200).send("Server is working!");
});

// Health check route
app.get("/health", (req, res) => {
  console.log("Health check route accessed");
  res.status(200).json({ status: "ok" });
});

// Import routes
import authRoutes from "./routes/auth.routes";

// Register routes
app.use("/api/auth", authRoutes);
console.log("Auth routes registered");

// Add error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 3001;

// Try-catch around the server start
try {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
  });
  
  // Handle server errors
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please try a different port.`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
} catch (err) {
  console.error("Failed to start server:", err);
  process.exit(1);
}

export default app;
