
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
connected_clients = set()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

@app.post("/sensor-data")
async def receive_sensor_data(sensor_payload: dict):

    print("Received sensor payload:", sensor_payload)


    for client in list(connected_clients):
        try:
            await client.send_json(sensor_payload)
        except:
            connected_clients.remove(client)

    return {"status": "received"}




