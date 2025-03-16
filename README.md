# PhonePe Transaction Parser

A Node.js service that parses PhonePe transaction history text files and converts them into structured JSON data.

> PhonePe emails a password protected PDF on demand. Needed to convert it to json for my expense tracking app, so here's a service that does that.

## Features

- Parses PhonePe transaction history text files
- Extracts detailed transaction information including timestamps, amounts, and transaction IDs
- Returns structured JSON data
- Includes request logging and error handling
- Production-ready with proper logging setup

## Prerequisites

- Node.js (v14 or higher)
- pnpm

## Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

## Usage

1. Start the server:

```bash
pnpm start
```

The server will start on port 3000 by default (configurable via PORT environment variable).

2. Send a POST request to `/process` endpoint with a text file:

```bash
curl -X POST -F "file=@your-transactions.txt" http://localhost:3000/process
```

### API Response Format

The API returns JSON in the following format:

```json
{
  "success": true,
  "count": number,
  "transactions": [
    {
      "ts": "ISO timestamp",
      "payee": "string",
      "txn_id": "string",
      "utr_no": "string",
      "payer": "string",
      "kind": "string",
      "currency": "string",
      "amount": number
    }
  ],
  "meta": {
    "file_type": "string",
    "original_name": "string",
    "processing_time_ms": number
  }
}
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment setting ('development' or 'production')

## Credits

This project uses the following open-source packages:

- [Express](https://expressjs.com/) - Fast, unopinionated web framework for Node.js
- [Multer](https://github.com/expressjs/multer) - Middleware for handling multipart/form-data
- [date-fns](https://date-fns.org/) - Modern JavaScript date utility library
- [Morgan](https://github.com/expressjs/morgan) - HTTP request logger middleware
- [Gist by @vsbabu](https://gist.github.com/vsbabu/37275c9e45b8a496ed987e801950991a) - Python script that converts phonepe txn to psv

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
