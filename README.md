# n8n-nodes-picnic

n8n Community Node, die das npm Paket [`picnic-api`](https://www.npmjs.com/package/picnic-api) wrapped.

## Features

- Produktsuche bei Picnic
- Warenkorb lesen, Artikel hinzufügen, Warenkorb leeren
- Lieferungen abrufen
- Nutzerdetails abrufen

## Voraussetzungen

- Node.js >= 18.17
- npm Account + npm Access Token
- GitHub Repository

## Lokale Entwicklung

```bash
npm install
npm test
npm run build
```

## In n8n installieren (lokal)

```bash
npm install n8n-nodes-picnic
```

Danach n8n neu starten.

## GitHub Setup

1. Repository nach GitHub pushen.
2. In GitHub unter `Settings -> Secrets and variables -> Actions` folgendes Secret anlegen:
   - `NPM_TOKEN` (Classic npm token mit Publish-Recht)
3. In `package.json` diese Felder anpassen:
   - `homepage`
   - `repository.url`
   - `bugs.url`
   - optional `author`

## Release nach npm

Dieser Repo enthält `.github/workflows/publish.yml`.

- Trigger: GitHub Release wird auf `published` gesetzt.
- Workflow baut das Paket und führt `npm publish --access public` aus.

Empfohlener Ablauf:

1. Version in `package.json` erhöhen (z. B. `0.1.1`).
2. Commit + Tag erstellen.
3. GitHub Release zum Tag veröffentlichen.
4. GitHub Action published das Paket auf npm.

## n8n Credentials

Credential-Typ `Picnic API` unterstützt:

- `authKey` (optional, bevorzugt)
- oder `Email` + `password`
- `countryCode` (`NL`, `DE`, `FR`)
- `apiVersion` (Default `15`)

## Hinweise

- Die konkrete Verfügbarkeit von Picnic-API-Funktionen kann sich ändern.
- Falls Methoden im `picnic-api` Paket abweichen, passe `src/nodes/Picnic/Picnic.node.ts` entsprechend an.
