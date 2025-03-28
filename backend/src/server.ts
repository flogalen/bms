import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";

// Load environment variables first
dotenv.config();

// Create the express app
const app = express();

// --- Middleware ---

// Security: CORS Configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
if (process.env.NODE_ENV !== 'production' || allowedOrigins.length === 0) {
  console.warn('CORS is configured to allow all origins. Ensure CORS_ALLOWED_ORIGINS is set in production.');
  app.use(cors());
} else {
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // If you need to handle cookies or authorization headers
  }));
}

// Security: Helmet for various HTTP headers
app.use(helmet());

// Security: Rate Limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use(limiter); // Apply the rate limiting middleware to all requests

// Performance: Compression
app.use(compression());

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

// --- Routes ---

// Test route
app.get("/test", (req, res) => {
  res.status(200).send("Server is working!");
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
}); // <-- Correctly close the handler here

// Import routes
import authRoutes from "./routes/auth.routes";
import personRoutes from "./routes/person.routes";
import interactionRoutes from "./routes/interaction.routes";
import tagRoutes from "./routes/tag.routes";

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/people", personRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/tags", tagRoutes);

// --- Error Handling ---
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log detailed error information
  console.error("=== SERVER ERROR ===");
  console.error(`Timestamp: ${new Date().toISOString()}`);
  console.error(`Request URL: ${req.method} ${req.originalUrl}`);
  // Avoid logging sensitive headers in production
  const safeHeaders = process.env.NODE_ENV === 'development' ? req.headers : { host: req.headers.host, 'user-agent': req.headers['user-agent'] };
  console.error(`Request headers:`, safeHeaders);
  // Log body only in development, consider redacting sensitive fields
  if (process.env.NODE_ENV === 'development') {
      console.error(`Request body:`, req.body);
  }
  console.error(`Error message: ${err.message}`);
  console.error(`Error stack: ${err.stack}`);
  // Add more context if available (e.g., from custom error classes)
  // if (err instanceof CustomError) { console.error(`Error context:`, err.context); }

  // Send appropriate response based on environment
  const statusCode = (err as any).statusCode || 500; // Use statusCode if available on error object
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    res.status(statusCode).json({
      error: err.name || "Server error",
      message: err.message,
      stack: err.stack, // Be cautious exposing stack traces, even in dev
      path: req.originalUrl,
    });
  } else {
    // In production, send a generic message
    res.status(statusCode).json({ error: "An unexpected error occurred" });
  }
});


// --- Server Initialization ---
const PORT = process.env.PORT || 3001;

// Create a server variable that can be exported for testing
let server: ReturnType<typeof app.listen> | undefined;

// Only start the server if this file is run directly (not imported in tests)
if (require.main === module) {
  try {
    server = app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
      // Log allowed origins in development for easier debugging
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Allowed CORS origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '*'}`);
      }
    });

    // Handle server errors (e.g., port already in use)
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
