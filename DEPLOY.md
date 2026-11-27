# Deploying to Coolify

The app is a Next.js 16 server app. It is deployed as a Docker image built from the
`Dockerfile` in this repo (Next.js `output: 'standalone'`, Node 22 Alpine, non-root user).

Two things are written at runtime and must survive restarts and redeploys:

| What | Path inside the container | Env var |
| --- | --- | --- |
| Print rate card (edited in Admin > Print rates) | `/data/print-rates.json` | `PRINT_RATES_FILE` |
| Uploaded print files | `/data/uploads/print` | `PRINT_UPLOAD_DIR` |

Both live under `/data`, which is mounted as a persistent volume. On the first boot of an
empty volume the entrypoint seeds `print-rates.json` from the copy baked into the image.

## 1. Create the resource

1. In Coolify: **Project > New Resource > Public Repository** (or *Private Repository (GitHub App)*).
2. Repository: `https://github.com/ClixdotWeb/prayag-digital-zone.git`, branch `main`.
3. **Build Pack: Dockerfile**. Dockerfile location `/Dockerfile`, base directory `/`.
4. **Ports Exposes: `3000`**.

## 2. Environment variables

Set these in **Configuration > Environment Variables** (not build-time; runtime is enough):

```
PRINT_QUOTE_SECRET=<long random string>
PRINT_ADMIN_KEY=<the key an admin types in Admin > Print rates>
```

Generate the secret with:

```sh
openssl rand -hex 32
```

`PRINT_QUOTE_SECRET` signs print-job prices so the browser cannot change them. In production
the server refuses to start a quote without it. **Never reuse the example value, and never
commit either value.** Changing `PRINT_QUOTE_SECRET` later invalidates quotes already issued
(customers just re-request a price).

`NODE_ENV`, `PORT`, `HOSTNAME`, `DATA_DIR`, `PRINT_RATES_FILE` and `PRINT_UPLOAD_DIR` are
already set in the Dockerfile — only override them if you move the volume.

## 3. Persistent storage

**Configuration > Persistent Storage > Add > Volume Mount**:

- Name: `prayag-data`
- Destination path: `/data`

Use a Docker **volume**, not a host bind mount: a named volume inherits the image's
ownership so the non-root `nextjs` user (uid 1001) can write to it. If you do use a host
path, `chown -R 1001:1001` it on the host first.

## 4. Domain and deploy

1. **Configuration > General > Domains**: enter your domain, e.g. `https://prayag.example.com`.
   Coolify terminates TLS and proxies to port 3000.
2. Point the domain's DNS `A` record at the Coolify server.
3. Press **Deploy**.

The container has a `HEALTHCHECK` that fetches `/`, so Coolify's health status reflects the
real app.

## 5. After the first deploy

1. Open the site and check the home page and `/print` load.
2. Go to **Admin > Print rates**, enter `PRINT_ADMIN_KEY`, and replace the placeholder
   tariff. The shipped rates are placeholders and are flagged as such in the UI.
3. Redeploy once and confirm the saved rates survived — that proves the volume is mounted.

## Notes

- This is a prototype: carts, orders, accounts and products are seed data in `src/lib/data.js`
  and live in browser memory only. Only the rate card and uploaded print files are persisted
  server-side. There is no database and no real payment gateway yet.
- Uploaded print files are never pruned. Watch the volume's disk use, or add a cleanup job.
- Scaling past one container would need shared storage for `/data`; run a single instance.

## Building the image locally

```sh
docker build -t prayag-web .
docker run --rm -p 3000:3000 \
  -e PRINT_QUOTE_SECRET=dev-secret \
  -e PRINT_ADMIN_KEY=dev-key \
  -v prayag-data:/data \
  prayag-web
```
