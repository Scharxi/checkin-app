# Check-In App mit Websockets

Eine moderne Check-In-App mit Echtzeit-Updates über Websockets.

## 🚀 Features

- ✅ **Echtzeit Websocket-Kommunikation** statt SSE
- ✅ **Bidirektionale Events** für sofortige Updates
- ✅ **Separates Express.js Backend** mit Socket.io
- ✅ **Next.js Frontend** mit React Query
- ✅ **Type-Safe** TypeScript überall
- ✅ **Prisma ORM** für Datenbankzugriff
- ✅ **Docker Compose** für einfaches Setup

## 🏗️ Architektur

```
Frontend (Next.js)    Backend (Express.js)    Database (PostgreSQL)
     :3000         ←→       :3001           ←→       :5432
  
  [React Query]      [Socket.io Server]      [Prisma Client]
  [Socket.io Client] [CheckIn Service]       [Check-in Tables]
```

## 🛠️ Setup

### 1. Umgebungsvariablen

**Frontend (.env.local):**
```env
NEXT_PUBLIC_WS_URL=http://localhost:3001
DATABASE_URL="postgresql://username:password@localhost:5432/checkin_db"
```

**Backend (backend/.env):**
```env
DATABASE_URL="postgresql://username:password@localhost:5432/checkin_db"
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 2. Mit Docker Compose (empfohlen)

```bash
# Gesamte App starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Services einzeln stoppen
docker-compose down
```

### 3. Lokale Entwicklung

**Backend starten:**
```bash
cd backend
npm install
cp .env.example .env  # Und Werte anpassen
npm run dev
```

**Frontend starten:**
```bash
npm install
cp .env.local.example .env.local  # Und Werte anpassen
npm run dev
```

**Datenbank Setup:**
```bash
# Im backend/ oder root-Verzeichnis
npm run db:push
```

## 🔌 Websocket Events

### Client → Server
- `get:initial-data` - Initiale Daten laden
- `user:checkin` - User einchecken  
- `user:checkout` - User auschecken

### Server → Client
- `checkin:update` - Neuer Check-in
- `checkout:update` - Check-out Update
- `locations:update` - Location-Updates
- `error` - Fehler-Events

## 🗄️ Datenbank-Architektur

**Gemeinsames Schema** für Frontend und Backend:

- ✅ **Ein Schema** in `prisma/schema.prisma`
- ✅ **Separate PrismaClient-Instanzen** für jeden Service
- ✅ **Gleiche Datenbank** für alle Services
- ✅ **Single Source of Truth** für Datenmodelle

```bash
# Frontend nutzt: prisma/schema.prisma
# Backend nutzt: prisma/schema.prisma (via --schema flag)
# Beide Services → Gleiche PostgreSQL-Datenbank
```

## 🔄 Migration von SSE

Die App wurde von Server-Sent Events (SSE) auf Websockets umgestellt:

### Vorher (SSE):
- ✅ Einfache Implementation in Next.js
- ❌ Nur unidirektionale Kommunikation
- ❌ Keine bidirektionalen Events
- ❌ HTTP-Requests für Aktionen

### Nachher (Websockets):
- ✅ Bidirektionale Echtzeit-Kommunikation
- ✅ Sofortige Updates ohne HTTP-Requests
- ✅ Type-safe Events mit Socket.io
- ✅ Bessere Error-Handling
- ✅ Connection Status Management

## 📁 Projektstruktur

```
checkin-app/
├── app/                    # Next.js Frontend
│   ├── api/               # REST APIs (Users, Locations)
│   └── ...
├── backend/               # Express.js + Socket.io Backend
│   ├── src/
│   │   ├── services/     # Business Logic
│   │   ├── types/        # TypeScript Definitionen
│   │   └── server.ts     # Hauptserver
│   └── (nutzt gemeinsames Schema)
├── prisma/               # 🔗 Gemeinsames Datenbank Schema
│   └── schema.prisma     # Einzige Quelle der Wahrheit
├── hooks/                 # React Hooks
│   ├── use-websockets.ts # Websocket Hook
│   └── use-checkin-api.ts # API Hook (angepasst)
└── components/           # React Components
```

## 🐛 Debugging

**Backend Logs:**
```bash
docker-compose logs backend -f
```

**Websocket Connection testen:**
```bash
curl http://localhost:3001/health
```

**Verbindungsstatus im Frontend:**
- Check Browser DevTools → Console
- Suche nach `🔌 Websocket connected`

## 🚦 Status Indicators

- **🟢 Connected** - Websocket verbunden
- **🟡 Connecting** - Verbindung wird hergestellt  
- **🔴 Disconnected** - Keine Verbindung

## 📚 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Backend:** Express.js, Socket.io, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **UI:** TailwindCSS, Shadcn/ui, Radix UI
- **State:** React Query, Websockets
- **Dev:** Docker, ESLint, TypeScript

---

Die App ist jetzt vollständig auf Websockets umgestellt und bietet Echtzeit-Kommunikation mit besserer Performance und User Experience! 