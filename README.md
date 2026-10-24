# quasar-server

Yandex Station Quasar backend emulator. It provides the station WebSocket listener and a separate HTTP API. It requires PostgreSQL, `processor`, and STT/TTS backends.

## Docker Compose

```bash
docker compose build quasar-server
docker compose up -d postgres processor quasar-server
# API: http://localhost:31121; station listener: http://localhost:31120
curl http://localhost:31121/devices
```

Standalone: `docker build -t quasar-server . && docker run --rm -p 31120:31120 -p 31121:31121 --env-file .env quasar-server`.

## Environment

- `PORT` (default `31115`; the project Compose file uses `31120`)
- `API_PORT` (default `31116`; the project Compose file uses `31121`)
- `POSTGRES_URL`, for example `postgres://quasar:password@postgres:5432/quasar`
- `PROCESSOR_BASIC_URL`, for example `http://processor:8080`
- `STT_GIGAAM_URL`
- `TTS_OPENAI_BASE_URL`, `TTS_OPENAI_API_KEY`, `TTS_OPENAI_MODEL`, `TTS_OPENAI_VOICE`, and `TTS_OPENAI_SPEED`
- `AUDIO_METADATA_URLS`
- `GLAGOL_JWT_KEY` - set a stable secret

There is no formal `/health` endpoint; `GET /devices` is only a basic API check. Verify PostgreSQL and real STT/TTS endpoints before production. Evaluate the TypeORM `synchronize: true` setting before using a production database.
