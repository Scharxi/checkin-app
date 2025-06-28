# Check-In Backend (Websockets)

Dieses Backend ersetzt die SSE-Funktionalität der Next.js-App durch vollwertige Websockets mit Socket.io.

## Features

- ✅ **Echtzeit Websocket-Kommunikation** mit Socket.io
- ✅ **Bidirektionale Events** für Check-in/Check-out
- ✅ **Auto-Broadcasting** an alle verbundenen Clients
- ✅ **Type-Safe Events** mit TypeScript
- ✅ **Prisma Database Integration**
- ✅ **Error Handling** und Validation
- ✅ **CORS-Konfiguration** für Next.js Frontend

## Setup

### 1. Dependencies installieren

```bash
cd backend
npm install
```

### 2. Umgebungsvariablen

Erstelle eine `.env`-Datei basierend auf `.env.example`:

```bash
cp .env.example .env
```

Bearbeite die `.env`-Datei mit deinen Werten:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/checkin_db"
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. Datenbank Setup

**Wichtig:** Das Backend nutzt das **gemeinsame** Prisma-Schema aus dem Root-Verzeichnis.

```bash
# Prisma Client generieren (nutzt Root-Schema)
npm run postinstall

# Datenbank-Schema pushen (nutzt Root-Schema)
npm run db:push
```

### 4. Server starten

```bash
# Development mit hot reload
npm run dev

# Production build
npm run build
npm start
```

## Websocket Events

### Client → Server

- `get:initial-data` - Initiale Daten abrufen
- `user:checkin` - User einchecken
- `user:checkout` - User auschecken

### Server → Client

- `checkins:initial` - Initiale Check-in-Daten
- `locations:initial` - Initiale Location-Daten
- `checkin:update` - Neuer Check-in
- `checkout:update` - Check-out Update
- `locations:update` - Location-Updates
- `error` - Fehler-Events

## API Endpoints

- `GET /health` - Health Check

## Verwendung mit Frontend

Das Frontend muss auf `socket.io-client` umgestellt werden. Der neue Hook `use-websockets.ts` ersetzt `use-sse.ts`.

## Debugging

Server läuft auf Port `3001` (konfigurierbar).

Logs zeigen:
- Client-Verbindungen/Trennungen
- Event-Verarbeitung
- Fehler und Validierung 