# Restaurant Planning SaaS — Monorepo

Système de gestion de planning pour la restauration, combinant une interface web Next.js et un moteur d'optimisation Timefold (Java).

## Structure

```
.
├── app/       # Front-end & API routes — Next.js 15, TypeScript, Tailwind CSS
└── solver/    # Moteur de planning — Spring Boot 3, Timefold Solver
```

## Services

| Service | Technologie | Port par défaut |
|---------|-------------|-----------------|
| `app`   | Next.js 15  | 3000            |
| `solver`| Spring Boot | 8080            |

## Démarrage rapide

### Prérequis

- Node.js ≥ 20
- Java 21 (JDK)
- Maven ≥ 3.9

### `app` — interface web

```bash
cd app
npm install
npm run dev
```

### `solver` — moteur Timefold

```bash
cd solver
./mvnw spring-boot:run
```

## Architecture

```
app/
├── src/app/          # Next.js App Router (pages + API routes)
└── src/components/   # Composants React partagés

solver/
└── src/main/java/com/restaurant/solver/
    ├── domain/       # Entités du domaine (Shift, Employee, …)
    ├── constraints/  # Contraintes Timefold
    └── rest/         # Endpoints REST
```

## Licence

Propriétaire — tous droits réservés.
