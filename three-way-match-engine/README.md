# Three-Way Match Engine

An enterprise-grade full-stack procurement reconciliation system that matches **Purchase Orders (PO) ? Goods Receipt Notes (GRN) ? Invoices** to detect discrepancies.

---

## Project Overview

The Three-Way Match Engine automates the procurement validation process by:

1. Accepting uploads of PDF/image documents (PO, GRN, Invoice)
2. Extracting structured data using Google Gemini AI
3. Resolving products via a SKU Master catalog
4. Calculating match results with detailed discrepancy reasons
5. Presenting results in a professional enterprise ERP dashboard

---

## Architecture

```
Frontend (HTML5/CSS3/Vanilla JS)
         ? HTTP/REST API
Backend (Node.js / Express.js)
    +-- Auth (JWT Bearer)
    +-- Document Upload (Multer)
    +-- Gemini AI Extraction
    +-- SKU Resolution Service
    +-- Match Calculation Engine
         ?
MongoDB (Mongoose ODM)
```

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript   |
| Backend    | Node.js, Express.js               |
| Database   | MongoDB, Mongoose                 |
| AI/ML      | Google Gemini 1.5 Flash           |
| Auth       | JWT (jsonwebtoken)                |
| File Upload| Multer                            |
| Security   | Helmet, CORS                      |
| Testing    | Jest                              |

---

## Folder Structure

```
three-way-match-engine/
+-- backend/
¦   +-- src/
¦   ¦   +-- config/           # DB + Gemini config
¦   ¦   +-- controllers/      # Request handlers
¦   ¦   +-- middleware/       # Auth, upload, error
¦   ¦   +-- models/           # Mongoose schemas
¦   ¦   +-- routes/           # Express routers
¦   ¦   +-- seeds/            # Demo data seeder
¦   ¦   +-- services/         # Business logic
¦   ¦   +-- prompts/          # Gemini prompts
¦   ¦   +-- utils/            # Helpers
¦   ¦   +-- app.js            # Express app
¦   ¦   +-- server.js         # Entry point
¦   +-- uploads/              # Uploaded files
¦   +-- tests/                # Unit tests
¦   +-- .env.example
¦   +-- package.json
+-- frontend/
¦   +-- index.html            # Redirects to login
¦   +-- login.html            # Login page
¦   +-- dashboard.html        # Main dashboard
¦   +-- purchase-order.html   # PO detail view
¦   +-- sku-master.html       # SKU catalog
¦   +-- css/                  # Stylesheets
¦   +-- js/                   # JavaScript modules
+-- README.md
```

---

## Installation

### Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x (running locally or MongoDB Atlas)
- Google Gemini API key (optional — use mock mode for dev)

### Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd three-way-match-engine

# 2. Install backend dependencies
cd backend
npm install

# 3. Create environment file
copy .env.example .env
# Edit .env with your values

# 4. Seed the database
npm run seed

# 5. Start the backend (serves frontend too)
npm run dev
```

Then open: http://localhost:5000

---

## Environment Variables

| Variable          | Description                        | Default                    |
|-------------------|------------------------------------|----------------------------|
| `PORT`            | Server port                        | 5000                       |
| `MONGODB_URI`     | MongoDB connection string          | mongodb://localhost:27017/... |
| `JWT_SECRET`      | JWT signing secret                 | (change in production!)    |
| `JWT_EXPIRES_IN`  | Token expiry                       | 7d                         |
| `GEMINI_API_KEY`  | Google Gemini API key              | -                          |
| `GEMINI_MOCK_MODE`| Use mock data instead of Gemini    | true                       |
| `ADMIN_USERNAME`  | Demo admin username                | admin                      |
| `ADMIN_PASSWORD`  | Demo admin password                | admin123                   |

---

## Demo Credentials

```
Username: admin
Password: admin123
```

---

## Gemini Setup

1. Visit https://aistudio.google.com/app/apikey
2. Create an API key
3. Set `GEMINI_API_KEY=your-key` in `.env`
4. Set `GEMINI_MOCK_MODE=false`

When `GEMINI_MOCK_MODE=true`, realistic sample data is returned without calling the API.

---

## Database Models

### SkuMaster
| Field          | Type   | Description                     |
|----------------|--------|---------------------------------|
| erpCode        | String | ERP product code (unique)       |
| skuName        | String | Product name                    |
| eanCode        | String | EAN/barcode                     |
| hsnCode        | String | HSN code for taxation           |
| uom            | String | Unit of measure                 |
| agreedRate     | Number | Contracted price                |
| mrp            | Number | Maximum retail price            |
| priceTolerance | Number | Allowed price deviation (0-1)   |

### Document (Base + Discriminators)
Uses Mongoose discriminator pattern:
- **PurchaseOrder**: poDate, vendorName, vendorCode, items[]
- **Grn**: grnNumber, grnDate, items[receivedQuantity]
- **Invoice**: invoiceNumber, invoiceDate, items[invoicedQuantity, grossAmount]

Each document item has:
- rawItemCode, itemName, skuMaster (ref), quantity fields
- skuResolutionStatus: resolved | unresolved
- skuResolutionReason

### MatchAudit
- poNumber, status, reasons[], summary, skuResults[], calculatedAt

---

## Upload Pipeline

```
File Upload (Multer)
    ? Validate MIME type + size
    ? Extract data (Gemini AI or Mock)
    ? Resolve SKUs (ERP code ? EAN ? unresolved)
    ? Check duplicates
    ? Save to MongoDB
    ? Trigger match calculation
    ? Return document + match result
```

---

## SKU Resolution

For each document item:
1. Trim `rawItemCode`
2. Case-insensitive lookup by `erpCode`
3. If not found: case-insensitive lookup by `eanCode`
4. If still not found: mark as `unresolved` (never deleted)

---

## Matching Logic

### Quantity Aggregation
Multiple GRNs or Invoices for the same PO are aggregated by SKU (using SkuMaster._id as key, or rawItemCode for unresolved items).

### Match Rules

| Rule Code                   | Severity | Description                        |
|-----------------------------|----------|------------------------------------|
| grn_qty_exceeds_po_qty      | hard     | GRN quantity > PO quantity         |
| invoice_qty_exceeds_po_qty  | hard     | Invoice quantity > PO quantity     |
| invoice_qty_exceeds_grn_qty | hard     | Invoice quantity > GRN quantity    |
| price_mismatch              | hard     | Invoice price outside tolerance    |
| mrp_mismatch                | warning  | MRP deviation > 1%                 |
| item_missing_in_po          | warning  | Item in GRN/Invoice but not in PO  |
| unmapped_master_sku         | warning  | SKU not found in master catalog    |
| invoice_date_after_po_date  | warning  | Invoice predates PO                |
| duplicate_po                | warning  | Multiple POs with same number      |
| duplicate_document          | warning  | Duplicate GRN or Invoice           |

### Status Logic

| Status                  | Condition                                            |
|-------------------------|------------------------------------------------------|
| insufficient_documents  | Missing PO, GRN, or Invoice                         |
| mismatch                | Any hard severity reason exists                      |
| partially_matched       | Warnings only, or partial quantities                 |
| matched                 | All docs present, quantities match, no violations    |

---

## Duplicate Handling

- **Duplicate PO**: Same poNumber uploaded twice ? stored, flagged as `duplicate_po`
- **Duplicate GRN**: Same grnNumber + poNumber ? stored, flagged as `duplicate_document`
- **Duplicate Invoice**: Same invoiceNumber + poNumber ? stored, flagged as `duplicate_document`

All duplicates remain in DB for audit purposes and are surfaced in the UI.

---

## Out-of-Order Document Handling

Documents are linked by `poNumber` string (not ObjectId). This means:

- Upload Invoice ? stored, match calculated (insufficient docs)
- Upload GRN ? stored, match re-calculated
- Upload PO ? stored, match re-calculated with all documents

The match engine reads current DB state on every call.

---

## API Documentation

### Authentication

`POST /api/auth/login`
```json
{ "username": "admin", "password": "admin123" }
```
Returns: `{ success: true, data: { token, user } }`

All other endpoints require:
```
Authorization: Bearer <token>
```

### Documents

| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| POST   | /api/documents/upload         | Upload document          |
| GET    | /api/documents                | List documents           |
| GET    | /api/documents/:id            | Get document by ID       |
| GET    | /api/documents/:id/file       | Get document file        |

Query params for list: `?type=purchase_order|grn|invoice&poNumber=PO10001`

### Match & Summary

| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| GET    | /api/match/:poNumber          | Get match result         |
| GET    | /api/summary/:poNumber        | Get summary              |

### SKU Master

| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| GET    | /api/masters/sku              | List SKUs                |
| POST   | /api/masters/sku              | Create SKU               |
| PATCH  | /api/masters/sku/:id          | Update SKU               |
| DELETE | /api/masters/sku/:id          | Delete SKU               |

---

## Testing

```bash
npm test
```

Tests cover: SKU resolution, quantity aggregation, all mismatch rules, status logic, duplicate handling, out-of-order uploads, edge cases (zero agreedRate, missing MRP).

---

## Demo Scenarios

| PO Number | Scenario               |
|-----------|------------------------|
| PO10001   | Fully matched          |
| PO10002   | Partially matched      |
| PO10003   | Quantity mismatch      |
| PO10004   | Price mismatch         |
| PO10005   | Insufficient documents |

Use the Upload Document button to test additional scenarios.

---

## Assumptions & Tradeoffs

1. Single admin user (expandable to user management)
2. Match results are persisted in MatchAudit for query performance
3. Frontend served by Express for single-origin deployment
4. Gemini mock mode generates deterministic data for testing
5. Price tolerance is per-SKU in the master catalog

---

## Known Limitations

1. No real-time upload progress (simulated in UI)
2. Single PDF page preview in iframe
3. No pagination on document lists
4. Demo mode returns same data for all uploads

---

## Future Improvements

- Multi-user with RBAC
- Real-time WebSocket progress
- Automated email alerts for mismatches
- Batch document processing
- Advanced analytics dashboard
- Export to Excel/CSV

---

## AI Tools Used

- Google Gemini 1.5 Flash for document data extraction
- Gemini API via `@google/generative-ai` SDK
