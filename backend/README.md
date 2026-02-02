Setup

Install dependencies and run the server:

```bash
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 4000
```

Configure MongoDB by setting `MONGO_URL` inside `app/main.py` to your connection string. The server watches the `plant_db.metrics` collection and broadcasts change events to connected WebSocket clients at `ws://<host>:4000/ws`.
Configure Supabase by creating a `.env` file (or environment variables) with `SUPABASE_URL` and `SUPABASE_KEY`. The server polls the `metrics` table and broadcasts new rows to connected WebSocket clients at `ws://<host>:4000/ws`.
