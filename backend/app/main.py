import asyncio
import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
METRICS_TABLE = "metrics"

app = FastAPI()
clients = set()
supabase = None
watch_task = None

async def watch_changes(poll_interval: float = 1.0):
    global supabase
    last_id = 0
    def get_max_id():
        resp = supabase.table(METRICS_TABLE).select("id").order("id", desc=True).limit(1).execute()
        if resp and resp.data:
            try:
                return int(resp.data[0]["id"])
            except Exception:
                return 0
        return 0

    last_id = await asyncio.to_thread(get_max_id)

    while True:
        try:
            def fetch_new():
                query = supabase.table(METRICS_TABLE).select("*").gt("id", last_id).order("id", asc=True).execute()
                return query

            resp = await asyncio.to_thread(fetch_new)
            new_rows = []
            if resp and getattr(resp, "data", None) is not None:
                new_rows = resp.data
            elif resp and isinstance(resp, dict) and resp.get("data") is not None:
                new_rows = resp.get("data")

            if new_rows:
                for row in new_rows:
                    try:
                        payload = {"type": "change", "data": row}
                        text = json.dumps(payload, default=str)
                        bad = []
                        for ws in list(clients):
                            try:
                                await ws.send_text(text)
                            except Exception:
                                bad.append(ws)
                        for ws in bad:
                            clients.discard(ws)
                        if "id" in row:
                            try:
                                last_id = max(last_id, int(row["id"]))
                            except Exception:
                                pass
                    except Exception:
                        continue

        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(poll_interval)
        await asyncio.sleep(poll_interval)


@app.on_event("startup")
async def startup():
    global supabase, watch_task
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in environment")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    watch_task = asyncio.create_task(watch_changes())


@app.on_event("shutdown")
async def shutdown():
    global watch_task
    if watch_task:
        watch_task.cancel()
        try:
            await watch_task
        except asyncio.CancelledError:
            pass


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.discard(websocket)
