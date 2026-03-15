# Octonus Solutions — HRMS & Event Management

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Run the app
```bash
npm run dev
```

Open http://localhost:8080

## Demo Login Accounts

| Username | Password | Access |
|----------|----------|--------|
| admin | admin123 | Full access |
| manager | manager123 | Events & HR |
| accountant | acc123 | Finance only |
| staff | staff123 | Limited |

## Tech Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router v6
- TanStack Query
- Supabase (ready to connect)

## Modules
- Dashboard
- HR & Staff (profiles, attendance, payroll, leaves, ledger, user rights)
- Event Booking (calendar, menu management, kitchen sheet, third-party sourcing)
- Finance (ledger, event-based finance, advance tracking, supplier ledger, P&L)
- Inventory (stock management, low stock alerts, history)
- Expenses (tracking, category reports)
- Settings (company info, notifications, security)

## To connect Supabase
1. Create a project at supabase.com
2. Copy your URL and anon key
3. Create a `.env` file:
```
VITE_SUPABASE_URL=your_url_here
VITE_SUPABASE_ANON_KEY=your_key_here
```
