import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = ""
MONGO_DB = "plant_db"
MONGO_COLLECTION = "metrics"

app = FastAPI()
clients = set()
mongo_client = None
watch_task = None

async def watch_changes():
    db = mongo_client[MONGO_DB]
    coll = db[MONGO_COLLECTION]
    async with coll.watch([], full_document='updateLookup') as stream:
        async for change in stream:
            payload = {"type": "change", "data": change}
            text = json.dumps(payload, default=str)
            bad = []
            for ws in list(clients):
                try:
                    await ws.send_text(text)
                except Exception:
                    bad.append(ws)
            for ws in bad:
                clients.discard(ws)

@app.on_event("startup")
async def startup():
    global mongo_client, watch_task
    mongo_client = AsyncIOMotorClient() if MONGO_URL == "" else AsyncIOMotorClient(MONGO_URL)
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
    if mongo_client:
        mongo_client.close()

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
