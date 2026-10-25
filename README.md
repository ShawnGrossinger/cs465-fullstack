# Travlr Getaways — Full Stack Travel Booking Application

A full stack web application built on the **MEAN stack** (MongoDB, Express, Angular, Node.js) for the fictional client Travlr Getaways. The project was developed incrementally across CS 465, from a static customer-facing site through a database-backed REST API to a secured single-page administration application.

## Overview

The application has three tiers that communicate through a single REST API:

- **Customer-facing website** — a server-rendered Express application using the Handlebars (HBS) templating engine. It presents travel content to the public and is optimized for fast first loads.
- **Administrator single-page application (SPA)** — an Angular application that lets administrators create, read, update, and delete trips without full-page reloads.
- **REST API and database** — an Express/Mongoose API backed by a MongoDB document database, consumed by both front ends and secured with JSON Web Tokens (JWT).

## Features

- Server-rendered customer site with reusable Handlebars partials
- RESTful API exposing trip data as JSON (GET, POST, PUT, DELETE)
- MongoDB persistence through Mongoose schemas with validation
- Angular admin SPA with reusable components, reactive forms, and client-side routing
- JWT-based authentication: admin registration, login, and protected write endpoints
- Password hashing with a per-user salt (PBKDF2); secrets kept out of source control

## Technology Stack

| Tier | Technology |
|------|-----------|
| Database | MongoDB, Mongoose ODM |
| Server | Node.js, Express |
| Customer front end | Handlebars (HBS), HTML, CSS |
| Admin front end | Angular (TypeScript), Bootstrap |
| Authentication | Passport (local strategy), JSON Web Tokens, Node `crypto` |

## Getting Started

### Prerequisites
- Node.js and npm
- MongoDB running locally on the default port (`27017`)
- Angular CLI (`npm install -g @angular/cli`)

### Setup
```bash
# 1. Install server dependencies
npm install

# 2. Install admin SPA dependencies
cd app_admin && npm install && cd ..

# 3. Create a .env file in the project root with your own JWT secret
echo "JWT_SECRET=$(openssl rand -hex 32)" > .env   # .env is git-ignored

# 4. Seed the database
node ./app_api/models/seed
```

### Running
```bash
# Terminal 1 — Express server (customer site + API) on http://localhost:3000
DEBUG=travlr:* npm start

# Terminal 2 — Angular admin SPA on http://localhost:4200
cd app_admin && ng serve
```

## Project Structure
```
travlr/
├── app_server/     # Customer-facing Express app (routes, controllers, HBS views)
├── app_api/        # REST API (routes, controllers, Mongoose models, auth config)
├── app_admin/      # Angular admin SPA (components, services, models, interceptor)
├── public/         # Static assets for the customer site
├── data/           # Seed data (trips.json)
└── app.js          # Express entry point, CORS, and middleware wiring
```

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
