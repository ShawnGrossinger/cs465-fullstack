# Travlr Getaways — Full Stack Travel Booking Application

A full stack web application built on the **MEAN stack** (MongoDB, Express, Angular, Node.js) for the fictional client Travlr Getaways. The project was developed incrementally across CS 465, from a static customer-facing site through a database-backed REST API to a secured single-page administration application, and then re-engineered in CS 499 (see [CS 499 Enhancement One](#cs-499-enhancement-one-software-design-and-engineering)).

## Overview

The application has three tiers that communicate through a single REST API:

- **Customer-facing website** — a server-rendered Express application using the Handlebars (HBS) templating engine.
- **Administrator single-page application (SPA)** — an Angular application that lets administrators create, read, update, and delete trips.
- **REST API and database** — an Express API backed by MongoDB through Mongoose, consumed by both front ends and secured with JSON Web Tokens (JWT) and role-based access control.

## Features

- Server-rendered customer site with reusable Handlebars partials
- RESTful API exposing trip data as JSON, documented in OpenAPI 3 (`app_api/openapi.yaml`, served at `/api/openapi.yaml`)
- Layered API: routes → middleware → controllers → services → repositories
- Role-based access control: only administrators can create, edit, or delete trips
- Request validation on every endpoint and allowlist sanitization of trip descriptions
- PBKDF2-SHA512 password hashing at OWASP's recommended work factor, with automatic upgrade of older hashes
- Rate limiting on login and registration, security headers (helmet, Content Security Policy), CORS allowlist
- Angular admin SPA with an administrator route guard and user-facing error messages
- Automated tests for the API (Jest, Supertest), the database layer, and the Angular app (Jasmine, Karma), run by GitHub Actions on every push

## Technology Stack

| Tier | Technology |
|------|-----------|
| Database | MongoDB, Mongoose ODM |
| Server | Node.js, Express, Joi (validation), helmet, express-rate-limit, sanitize-html |
| Customer front end | Handlebars (HBS), HTML, CSS |
| Admin front end | Angular (TypeScript), Bootstrap |
| Authentication | JSON Web Tokens, Node `crypto` (PBKDF2) |
| Testing and CI | Jest, Supertest, Jasmine, Karma, GitHub Actions |

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+ (needed to load sanitize-html's HTML parser)
- MongoDB running locally on the default port (`27017`)
- Angular CLI (`npm install -g @angular/cli`) for `ng serve`

### Setup
```bash
# 1. Install server dependencies
npm install

# 2. Install admin SPA dependencies
cd app_admin && npm install && cd ..

# 3. Create .env from the template and add a JWT secret (.env is git-ignored)
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env

# 4. Seed the trips collection
npm run seed

# 5. Create an administrator (you will be prompted for a password)
npm run create-admin -- --email admin@example.com --name "Site Admin"
```

### Running
```bash
# Terminal 1 — Express server (customer site + API) on http://localhost:3000
npm start

# Terminal 2 — Angular admin SPA on http://localhost:4200
cd app_admin && ng serve
```

The server checks its configuration at startup and refuses to start with a missing or short `JWT_SECRET` or a weakened password work factor. All settings are listed in `.env.example`.

### Running the tests
```bash
npm test               # API, customer site, and unit tests — no database needed
npm run test:coverage  # same, with a coverage report
npm run test:db        # repository and full-stack tests against MongoDB
                       # (uses MONGO_TEST_URI, default mongodb://127.0.0.1:27017/travlr_test;
                       #  the database name must end in _test because it is wiped)
cd app_admin && npm test -- --watch=false --browsers=ChromeHeadlessCI   # Angular tests
```

## Project Structure
```
travlr/
├── app.js                 # createApp(): wires the layers and security middleware together
├── bin/www                # entry point: config check, DB connect, start, graceful shutdown
├── app_api/
│   ├── config/            # validated configuration from the environment
│   ├── routes/            # endpoint → middleware pipeline
│   ├── middleware/        # authenticate, requireRole, validate, rate limits, error handler
│   ├── controllers/       # HTTP in / HTTP out only
│   ├── services/          # business rules, passwords, tokens
│   ├── repositories/      # the only code that talks to MongoDB
│   ├── validation/        # Joi request schemas
│   ├── models/            # Mongoose schemas and the seed script
│   ├── db/                # connection management
│   ├── utils/             # error types, sanitizer, structured logger
│   └── openapi.yaml       # API documentation
├── app_server/            # customer website (routes, controllers, HBS views)
├── app_admin/             # Angular admin SPA
├── scripts/create-admin.js
├── tests/                 # api/, site/, unit/, db/, support/
├── .github/workflows/     # CI pipeline
├── public/                # static assets for the customer site
└── data/                  # seed data (trips.json)
```

## CS 499 Enhancement One: Software Design and Engineering

A code review of the CS 465 version found design flaws that were also security vulnerabilities. Each one is listed below with its fix and the tests that keep it fixed.

| Finding in the original | Change | Verified by |
|---|---|---|
| Anyone could call `/api/register` and the token it returned could create, edit, and delete trips (no roles) | `role` on users; trip writes require `admin`, re-checked against the database on every write; registration creates customers only; `npm run create-admin` | `tests/api/accessControl.test.js` |
| Trip descriptions were stored without validation and rendered unescaped (`{{{this.description}}}`), so a script in a description ran on the public travel page | Joi validation strips unknown fields and checks every value; descriptions pass an HTML allowlist when saved **and** when rendered; Content Security Policy | `tests/api/trips.test.js`, `tests/site/travel.test.js` |
| PBKDF2 at 1,000 iterations, synchronous (blocks the event loop), compared with `===` | 220,000 iterations (OWASP), async hashing, `crypto.timingSafeEqual`, per-user work factor with upgrade at next login, equal-time response for unknown accounts | `tests/api/auth.test.js`, `tests/unit/services.test.js` |
| No limit on login attempts | Rate limits on `/login` (failed attempts only) and `/register` | `tests/api/auth.test.js` |
| Controllers mixed HTTP, validation, and queries; inconsistent responses (`err` undefined, 200 + `[]` for a missing trip, 201 + old document on update) | Layered architecture, central error handler with one JSON error shape, correct status codes | `tests/api/trips.test.js`, `tests/api/hardening.test.js` |
| Hard-coded URLs and CORS origin; database connected as a side effect of `require`; shutdown handler never called | Validated config module, explicit connection management, graceful shutdown on SIGINT/SIGTERM | `tests/unit/services.test.js` |
| Admin app: no route guards, trip code passed through `localStorage`, token sent with every request, errors only logged | `adminGuard`, `edit-trip/:tripCode`, token sent only to the API, sign-out on 401, safe `returnUrl`, error messages | `app_admin/src/**/*.spec.ts` |
| No automated tests (the 8 generated Angular specs all failed) | 77 server-side tests, database integration tests, 41 Angular tests, GitHub Actions | CI |
| `npm audit`: 3 critical, 2 high, 2 moderate advisories | Updated dependencies; one moderate advisory remains (see below) | CI audit step |

### Upgrading an existing installation
- **Promote your existing account**, or it will be treated as a customer: `npm run create-admin -- --email you@example.com --promote`
- **Log in again.** Tokens now carry an issuer, audience, and role, so tokens issued by the old version are rejected.
- Passwords created by the old version keep working and are rehashed at the stronger work factor on the next login.
- API changes for any other client: `GET /api/trips/{code}` returns one object (404 if missing); `PUT` returns 200 with the updated trip; `DELETE` returns 204; `POST /api/register` returns 201. See `app_api/openapi.yaml`.

### Known issues and risk decisions
- **hbs (moderate, GHSA-7f5c-rpf4-86p8, no patch exists).** The issue requires request data to reach `res.render()` options. Travlr only renders fixed objects built in its own controllers, so it is not exposed. Replacing the view engine is noted for future work.
- **Angular 19 is past end of support.** `npm audit` in `app_admin` reports high-severity advisories whose fixes exist only in Angular 20+. Most concern features this app does not use (server-side rendering, hydration, i18n), but the right fix is a framework upgrade, planned as follow-up work.
- **sanitize-html is kept at the latest version (2.18.2)** because earlier versions have XSS bypass advisories. Its parser is published only as an ES module, so Node 20.19+/22.12+ is required, and Jest transpiles that one dependency (`tests/support/jest.shared.js`).
- **Tokens are stored in `localStorage`**, as in the original design. The new Content Security Policy and sanitization reduce the XSS risk that makes this dangerous; moving to an HttpOnly cookie would also require CSRF protection and is noted for future work.

---

# Project Reflection

## Architecture

This project used two distinct styles of front-end development against the same back end. The customer-facing site is a **server-rendered Express application**: a request hits an Express route, a controller fetches data, and the Handlebars engine compiles a template into complete HTML on the server before sending it to the browser. Very little JavaScript runs on the client, which keeps the first load fast and the pages easy for search engines to index. The administrator side is an **Angular single-page application**. It loads once and then renders everything in the browser, updating the view in place as the user moves between the trip list, the add form, and the edit form; it communicates with the server only by exchanging JSON over the REST API. The SPA delivers a richer, application-like experience at the cost of a heavier initial download and a dependency on client-side JavaScript. JavaScript is the common thread that makes both possible — Node and Express run JavaScript on the server, and Angular is written in TypeScript that compiles to JavaScript in the browser — so the entire stack is built in one language.

The back end uses the **NoSQL MongoDB database** because its document model fits the rest of the stack naturally. MongoDB stores data as flexible, JSON-like documents rather than rows in fixed tables, so a trip is kept as a single self-contained document that maps directly onto a JavaScript object with no translation layer. Because every tier — browser, server, and database — speaks JSON, data flows end to end without conversion. Mongoose sits on top of MongoDB to add the structure and validation that a schema-less store would otherwise lack, and the document model scales horizontally to support the high connection volume the client expects.

## Functionality

**JSON** (JavaScript Object Notation) and **JavaScript** are related but different. JavaScript is a full programming language with logic, functions, and behavior; JSON is only a text-based *data format* for representing structured data. JSON borrows JavaScript's object-literal syntax but is stricter — keys must be quoted strings, only a small set of value types is allowed, and it contains no functions or executable code. That neutrality is exactly why JSON ties the front end and back end together: the API returns trip data as JSON, the browser parses it into JavaScript objects it can render, and Mongoose marshals the same data between JSON documents in MongoDB and JavaScript objects in the server. JSON is the shared contract every tier agrees on.

I refactored code repeatedly to improve structure and reduce duplication. The static HTML site was refactored into an **MVC structure** with routes, controllers, and views, and the repeated page header and footer were pulled into reusable **Handlebars partials**. The hardcoded trip markup was then replaced with a single templated loop driven by JSON data. Later, the database-access code was refactored out of the website into a **separate API application** (`app_api`) so the data layer could serve multiple clients, and the website controller was changed to consume that API over HTTP instead of reading a file. In the Angular app, the trip-rendering markup was refactored out of the listing into a reusable **trip-card component**, the login and register calls were refactored into one shared helper method, and the logic for attaching the security token was centralized in a single **HTTP interceptor** rather than repeated on every API call. The benefit of reusable UI components is that each piece is written and tested once and then used anywhere; the interface stays consistent, a change is made in one place instead of many, and each class stays small and focused on a single responsibility, which makes the whole application easier to maintain and debug.

## Testing

In a full stack application, **methods** are the HTTP verbs — GET to read, POST to create, PUT to update, and DELETE to remove — and each one is mapped to a controller function. **Endpoints** are the URLs the API exposes, such as `/api/trips`, `/api/trips/:tripCode`, `/api/login`, and `/api/register`; each endpoint pairs a URL with the methods it accepts. I tested these from the outside in. First I exercised the endpoints in isolation using Postman and the browser: a GET to `/api/trips` returned the trip list as JSON with a 200 status, a PUT returned a 201, and each change was confirmed both in MongoDB Compass and in the Express server log, which records every request's method and status code. Only after the API was verified did I test the same operations through the Angular interface.

Adding a **security** layer made testing more involved. The write endpoints are protected and require a JSON Web Token presented as a Bearer token, so testing them means first calling `/api/login` to obtain a fresh token and then supplying it on Postman's Authorization tab — and, just as importantly, testing the failure cases: a request with no token, a tampered token, or an expired token must be rejected with a 401. The key lesson is that security has to be enforced on the **server**. The Angular app hides the Add and Edit controls when no one is logged in, but that is only a convenience; the real protection is the authentication middleware on the API, because browser-based rules like CORS do not stop a tool such as Postman or curl. Authentication confirms *who* the caller is, and the server must verify that on every protected request.

## Reflection

This course gave me hands-on experience building and securing a complete full stack application rather than isolated pieces, which is exactly the kind of end-to-end understanding I want as I move toward systems and security engineering roles. I learned to design a REST API around a NoSQL data model, to structure an application with MVC and separation of concerns, and to build a modern front end as an Angular single-page application. The security module was the most valuable to me: implementing JWT authentication, hashing passwords with a per-user salt, protecting routes with middleware, and keeping secrets out of version control connected directly to my interest in security engineering and gave me a concrete, working example to point to. Alongside those, I practiced a disciplined Git workflow, branching for each stage of development and keeping a clean commit history. Together these skills — full stack development, API design, authentication fundamentals, and version control — make me a more well-rounded and marketable candidate as I pursue a software and security engineering career.
