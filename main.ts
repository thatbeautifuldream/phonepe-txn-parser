import express, { type Request, type Response } from "express";
import type { RequestHandler } from "express";
import multer from "multer";
import { format } from "date-fns";
import { promises as fs } from "fs";
import fs_sync from "fs";
import path from "path";
import morgan from "morgan";

const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
fs.mkdir(logsDir, { recursive: true }).catch(console.error);

// Create a write stream for access logs
const accessLogStream = fs_sync.createWriteStream(
  path.join(logsDir, "access.log"),
  { flags: "a" }
);

// Use different logging formats for development and production
const morganFormat =
  process.env.NODE_ENV === "production"
    ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
    : "dev";

// Setup Morgan middleware
app.use(morgan(morganFormat));
// Also log to file in production
if (process.env.NODE_ENV === "production") {
  app.use(morgan(morganFormat, { stream: accessLogStream as any }));
}

const upload = multer({ dest: "uploads/" });

const START_OF_RECORD_MARKER = /^[A-Z][a-z][a-z]\s\d{2},\s20\d{2}$/;
const AMOUNT_MARKER = /[\d]+\.[\d]{2}$/;

interface PhonePeTxn {
  ts: string;
  payee: string;
  txn_id: string;
  utr_no: string;
  payer: string;
  kind: string;
  currency: string;
  amount: number;
}

const parseRecord = (lines: string[]): PhonePeTxn => {
  let len_r = lines.length;
  for (let i = 6; i < len_r; i++) {
    if (AMOUNT_MARKER.test(lines[i])) {
      lines = lines.slice(0, i + 1);
      break;
    }
  }

  return {
    ts: format(new Date(`${lines[0]} ${lines[1]}`), "yyyy-MM-dd'T'HH:mm:ss"),
    payee: lines[2].split(" ").slice(2).join(" ").replace("- ", "").trim(),
    txn_id: lines[3].split(" ").pop() || "",
    utr_no: lines[4].split(" ").pop() || "",
    payer: lines[5].split(" ").pop() || "",
    kind: lines[6].split(" ")[0],
    currency: lines[6].split(" ")[1],
    amount: parseFloat(
      lines.length === 8 ? lines[7] : lines[6].split(" ").pop() || "0"
    ),
  };
};

const processFile: RequestHandler = async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.file) {
      console.warn("Request received without file");
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    console.info(
      `Processing file: ${req.file.originalname} (${req.file.size} bytes)`
    );

    // Check if the uploaded file is a text file
    if (req.file.mimetype !== "text/plain") {
      console.warn(`Invalid file type received: ${req.file.mimetype}`);
      res.status(400).json({
        error: "Invalid file type",
        message: "Only .txt files are supported",
      });
      return;
    }

    const filePath = path.resolve(req.file.path);
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let records: PhonePeTxn[] = [];
    let rec: string[] = [];

    for (const line of lines) {
      if (START_OF_RECORD_MARKER.test(line)) {
        if (rec.length) {
          records.push(parseRecord(rec));
          rec = [];
        }
        rec.push(line);
      } else if (rec.length) {
        rec.push(line);
      }
    }
    if (rec.length) records.push(parseRecord(rec));

    // Clean up the uploaded file
    await fs.unlink(filePath);

    const processingTime = Date.now() - startTime;
    console.info(
      `Successfully processed ${records.length} transactions in ${processingTime}ms`
    );

    // Send JSON response
    res.json({
      success: true,
      count: records.length,
      transactions: records,
      meta: {
        file_type: req.file.mimetype,
        original_name: req.file.originalname,
        processing_time_ms: processingTime,
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error processing file:", {
      error: error instanceof Error ? error.message : String(error),
      file: req.file?.originalname,
      processingTime,
    });
    res.status(500).json({
      success: false,
      error: "Error processing file",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

app.post("/process", upload.single("file"), processFile);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.info(
    `Server running on port ${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
});
