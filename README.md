# Check-In App

Ein Live Check-In System für Teams mit Next.js, PostgreSQL, Prisma und Server-Sent Events (SSE).

## Features

- ✅ **Live Updates** - Sofortige Benachrichtigungen über Check-ins/Check-outs via SSE
- ✅ **PostgreSQL Database** - Robuste Datenhaltung mit Prisma ORM
- ✅ **React Query** - Effiziente Datenverwaltung und Caching
- ✅ **Modern UI** - Responsive Design mit Tailwind CSS und shadcn/ui
- ✅ **Docker Support** - Einfache Entwicklungsumgebung

## Technologie Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes, Server-Sent Events
- **Database**: PostgreSQL mit Prisma ORM
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: React Query
- **Containerization**: Docker Compose

## Installation

### Voraussetzungen

- Node.js 18+
- Docker und Docker Compose
- pnpm (empfohlen) oder npm

### Setup

1. **Repository klonen**
```bash
git clone <repository-url>
cd checkin-app
```

2. **Dependencies installieren**
```bash
pnpm install
```

3. **Umgebungsvariablen konfigurieren**
```bash
cp .env.example .env.local
```

4. **Datenbank starten**
```bash
docker-compose up -d
```

5. **Prisma Setup**
```bash
# Datenbank Schema pushen
pnpm db:push

# Datenbank mit Initial-Daten befüllen
pnpm db:seed
```

6. **Development Server starten**
```bash
pnpm dev
```

Die Anwendung ist jetzt unter `http://localhost:3000` verfügbar.

## Nutzung

### Für Benutzer

1. **Registrierung**: Geben Sie Ihren Namen ein
2. **Check-in**: Klicken Sie auf einen Standort zum Einchecken
3. **Check-out**: Klicken Sie erneut auf den aktuellen Standort
4. **Live-Updates**: Sehen Sie in Echtzeit, wer wo eingecheckt ist

### Für Controller

Standorte können über die API verwaltet werden:

```bash
# Neuen Standort erstellen
curl -X POST http://localhost:3000/api/locations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Neuer Standort",
    "description": "Beschreibung des Standorts",
    "icon": "MapPin",
    "color": "bg-indigo-500"
  }'
```

## API Endpunkte

### Users
- `GET /api/users` - Alle Benutzer abrufen
- `POST /api/users` - Neuen Benutzer erstellen

### Locations  
- `GET /api/locations` - Alle Standorte abrufen
- `POST /api/locations` - Neuen Standort erstellen

### Check-ins
- `GET /api/checkins` - Alle aktiven Check-ins abrufen
- `POST /api/checkins` - Check-in/Check-out durchführen
- `DELETE /api/checkins` - Manueller Check-out

### Live Updates
- `GET /api/sse` - Server-Sent Events Stream

## Datenbank Schema

```prisma
model User {
  id        String     @id @default(cuid())
  name      String
  email     String?    @unique
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  checkIns  CheckIn[]
}

model Location {
  id          String     @id @default(cuid())
  name        String
  description String
  icon        String
  color       String
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  checkIns    CheckIn[]
}

model CheckIn {
  id           String    @id @default(cuid())
  userId       String
  locationId   String
  checkedInAt  DateTime  @default(now())
  checkedOutAt DateTime?
  isActive     Boolean   @default(true)
  user         User      @relation(fields: [userId], references: [id])
  location     Location  @relation(fields: [locationId], references: [id])
}
```

## Verfügbare Scripts

```bash
# Development
pnpm dev          # Development Server starten
pnpm build        # Production Build erstellen
pnpm start        # Production Server starten

# Database
pnpm db:push      # Schema zur Datenbank pushen
pnpm db:migrate   # Migration erstellen und ausführen
pnpm db:seed      # Datenbank mit Initial-Daten befüllen
pnpm db:studio    # Prisma Studio öffnen

# Utilities
pnpm lint         # Code linting
```

## Entwicklung

### Neue Standorte hinzufügen

Bearbeiten Sie `prisma/seed.ts` um neue Standard-Standorte hinzuzufügen:

```typescript
const newLocation = {
  id: "new-location",
  name: "Neuer Standort",
  description: "Beschreibung",
  icon: "MapPin", // Lucide React Icon Name
  color: "bg-blue-500", // Tailwind CSS Klasse
}
```

### Icons

Unterstützte Icons (Lucide React):
- `Briefcase`, `Coffee`, `Dumbbell`, `Book`, `ShoppingBag`, `Users`, `MapPin`, etc.

### Farben

Unterstützte Tailwind Farben:
- `bg-blue-500`, `bg-red-500`, `bg-green-500`, `bg-yellow-500`, etc.

## Deployment

### Docker Production

```bash
# Production Image erstellen
docker build -t checkin-app .

# Mit Docker Compose deployen
docker-compose -f docker-compose.prod.yml up -d
```

### Vercel Deployment

1. Vercel PostgreSQL Database erstellen
2. Umgebungsvariablen in Vercel konfigurieren
3. Repository zu Vercel verbinden
4. Automatisches Deployment

## Troubleshooting

### Datenbank Probleme

```bash
# Datenbank zurücksetzen
docker-compose down -v
docker-compose up -d
pnpm db:push
pnpm db:seed
```

### SSE Verbindungsprobleme

- Prüfen Sie die Browser-Konsole auf Fehler
- Stellen Sie sicher, dass der Server läuft
- Überprüfen Sie Firewall-Einstellungen

## Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details. 