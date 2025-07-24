# 🚀 Check-In App - Lokales Docker Deployment

Diese Anleitung zeigt, wie Sie die Check-In App lokal mit Docker ausführen können.

## 📋 Voraussetzungen

- **Docker** (Version 20.0+)
- **Docker Compose** (Version 2.0+)
- **Git** (zum Klonen des Repositories)
- **8GB RAM** (empfohlen)
- **Freie Ports**: 3000, 3001, 5432

## ⚡ Schnellstart

```bash
# Repository klonen
git clone <repository-url>
cd checkin-app

# App starten
docker-compose up -d

# Warten bis alle Services bereit sind (ca. 30-60 Sekunden)
docker-compose logs -f

# App öffnen
open http://localhost:3000
```

## 📝 Schritt-für-Schritt Anleitung

### 1. Repository vorbereiten

```bash
# In das Projektverzeichnis wechseln
cd checkin-app

# Aktuelle Container stoppen (falls vorhanden)
docker-compose down --remove-orphans
```

### 2. Container bauen und starten

```bash
# Container bauen und im Hintergrund starten
docker-compose up -d --build
```

### 3. Status überprüfen

```bash
# Container-Status anzeigen
docker-compose ps

# Logs verfolgen
docker-compose logs -f app
```

### 4. App testen

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/health
- **Admin-Login**:
  - Benutzername: `admin`
  - Passwort: `DasWasWer-42`

## 🏗️ Services Übersicht

| Service | Port | Beschreibung |
|---------|------|--------------|
| Frontend (Next.js) | 3000 | Web-Interface |
| Backend (Express + Socket.IO) | 3001 | API + WebSocket Server |
| PostgreSQL | 5432 | Datenbank |

## 🔧 Wichtige Kommandos

### Container-Management

```bash
# Services starten
docker-compose up -d

# Services stoppen
docker-compose down

# Services neu bauen
docker-compose up -d --build

# Logs anzeigen
docker-compose logs -f [service-name]

# Container-Status
docker-compose ps
```

### Troubleshooting

```bash
# Alle Container mit Daten löschen
docker-compose down -v --remove-orphans

# Docker Cache leeren
docker system prune -f

# Einzelnen Service neu starten
docker-compose restart app

# In Container einsteigen (Debugging)
docker-compose exec app sh
```

## 🔧 Umgebungsvariablen

Die App verwendet folgende Umgebungsvariablen (bereits in `docker-compose.yml` konfiguriert):

```yaml
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_LOGIN_USERNAME=admin
NEXT_PUBLIC_LOGIN_PASSWORD=DasWasWer-42

# Backend
DATABASE_URL=postgresql://checkin_user:checkin_password@postgres:5432/checkin_db
PORT=3001
NODE_ENV=production
```

## 🐛 Häufige Probleme & Lösungen

### Problem: "Port already in use"

```bash
# Prozesse auf Port 3000/3001 beenden
sudo lsof -ti:3000 | xargs kill -9
sudo lsof -ti:3001 | xargs kill -9

# Oder Docker Container stoppen
docker-compose down
```

### Problem: "Container removal already in progress"

```bash
# Warten und erneut versuchen
sleep 10
docker-compose down --remove-orphans
docker-compose up -d --build
```

### Problem: CORS-Fehler im Browser

```bash
# Container neu bauen (oft löst das CORS-Probleme)
docker-compose down
docker-compose up -d --build
```

### Problem: Datenbank-Connection-Fehler

```bash
# PostgreSQL Container-Status prüfen
docker-compose logs postgres

# Falls nötig, Datenbank zurücksetzen
docker-compose down -v
docker-compose up -d
```

### Problem: Frontend lädt nicht

```bash
# Frontend-Logs prüfen
docker-compose logs app

# Container neu starten
docker-compose restart app
```

## 🔍 Debugging

### Container-Logs anzeigen

```bash
# Alle Services
docker-compose logs -f

# Nur App (Frontend + Backend)
docker-compose logs -f app

# Nur Datenbank
docker-compose logs -f postgres

# Letzte 50 Zeilen
docker-compose logs --tail=50 app
```

### Gesundheitschecks

```bash
# Backend API testen
curl http://localhost:3001/health

# WebSocket testen
curl -i "http://localhost:3001/socket.io/?EIO=4&transport=polling"

# Frontend testen
curl -I http://localhost:3000
```

## 📱 App verwenden

### 1. Admin-Anmeldung
- URL: http://localhost:3000
- Benutzername: `admin`
- Passwort: `DasWasWer-42`

### 2. Benutzer erstellen/anmelden
- Nach Admin-Login können Sie App-Benutzer erstellen
- Oder sich mit existierenden Benutzern anmelden (z.B. "Lucas")

### 3. Funktionen testen
- ✅ Check-in/Check-out bei Standorten
- ✅ Temporäre Standorte erstellen
- ✅ Hilfe-Anfragen stellen
- ✅ Real-time Updates via WebSocket

## 🛑 App stoppen

```bash
# Services stoppen (Daten bleiben erhalten)
docker-compose down

# Services stoppen + Daten löschen
docker-compose down -v

# Alle Docker-Ressourcen cleanup
docker-compose down -v --remove-orphans
docker system prune -f
```

## 📊 Performance-Tipps

- **RAM**: Mindestens 4GB verfügbar halten
- **Storage**: Ca. 2GB für Docker Images
- **Network**: Container communicieren intern (keine externen API-Calls)

## 🔐 Sicherheit

- ⚠️ **Produktions-Setup**: Ändern Sie Passwörter und DB-Credentials
- ⚠️ **Nur lokal**: Diese Konfiguration ist nur für lokale Entwicklung geeignet
- ⚠️ **Firewall**: Stellen Sie sicher, dass Ports 3000/3001 nur lokal erreichbar sind

## 🆘 Support

Bei Problemen:

1. **Logs prüfen**: `docker-compose logs -f`
2. **Container neu starten**: `docker-compose restart app`
3. **Komplett neu bauen**: `docker-compose down && docker-compose up -d --build`
4. **Docker cleanup**: `docker system prune -f`

---

**Viel Erfolg mit der Check-In App! 🎉**
