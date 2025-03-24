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
import personRoutes from "./routes/person.routes";
import interactionRoutes from "./routes/interaction.routes";
import tagRoutes from "./routes/tag.routes";

// Register routes
app.use("/api/auth", authRoutes);
console.log("Auth routes registered");

app.use("/api/people", personRoutes);
console.log("Person routes registered");

app.use("/api/interactions", interactionRoutes);
console.log("Interaction routes registered");

app.use("/api/tags", tagRoutes);
console.log("Tag routes registered");

// Add error handler with detailed logging
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log detailed error information
  console.error("=== SERVER ERROR ===");
  console.error(`Request URL: ${req.method} ${req.originalUrl}`);
  console.error(`Request body:`, req.body);
  console.error(`Request headers:`, req.headers);
  console.error(`Error message: ${err.message}`);
  console.error(`Error stack: ${err.stack}`);
  console.error(`Error type: ${err.constructor.name}`);
  console.error(`Error is instance of Error: ${err instanceof Error}`);
  console.error(`Error properties:`, Object.keys(err));
  
  // Check for specific error types
  if (err.name === 'PrismaClientKnownRequestError') {
    console.error(`Prisma error code: ${err.code}`);
  }
  
  // Try to identify the source of the error
  const stack = err.stack || '';
  if (stack.includes('person.service')) {
    console.error('Error originated in person.service');
  } else if (stack.includes('person.controller')) {
    console.error('Error originated in person.controller');
  } else if (stack.includes('prisma')) {
    console.error('Error originated in prisma');
  }
  
  // Send a more informative error response in development
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    res.status(500).json({ 
      error: "Server error", 
      message: err.message,
      stack: err.stack,
      path: req.originalUrl,
      type: err.constructor.name
    });
  } else {
    // In production, don't expose error details
    res.status(500).json({ error: "Something went wrong!" });
  }
});

const PORT = process.env.PORT || 3001;

// Create a server variable that can be exported for testing
let server: any;

// Only start the server if this file is run directly (not imported in tests)
if (require.main === module) {
  try {
    server = app.listen(PORT, () => {
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
}

export default app;
