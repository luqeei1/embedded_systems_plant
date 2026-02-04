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

@app.get("/plant-conditions/{species_name}")
async def get_plant_conditions(species_name: str):
    # We look for the species in the dictionary. 
    # Note: Pl@ntNet might return "Monstera deliciosa (Swiss Cheese Plant)", 
    # so we check if the key is contained within the string.
    for key in plant_conditions:
        if key.lower() in species_name.lower():
            return plant_conditions[key]
    
    # Fallback if species not found in your hardcoded dict
    return plant_conditions["Monstera deliciosa"]


plant_conditions = {
    "Saintpaulia ionantha": {
        "temperature": {"min": 18.0, "max": 24.0},
        "humidity": {"min": 50.0, "max": 60.0},
        "vpd": {"min": 0.8, "max": 1.1},
        "soil_moisture": {"min": 40.0, "max": 60.0},
        "ppfd": {"min": 40.0, "max": 150.0},
        "quality_index": {"min": 0.6, "max": 0.85},
        "red_blue_ratio": {"min": 1.0, "max": 2.0}
    },
    "Anthurium scherzerianum": {
        "temperature": {"min": 20.0, "max": 28.0},
        "humidity": {"min": 60.0, "max": 80.0},
        "vpd": {"min": 0.9, "max": 1.2},
        "soil_moisture": {"min": 50.0, "max": 70.0},
        "ppfd": {"min": 150.0, "max": 350.0},
        "quality_index": {"min": 0.65, "max": 0.9},
        "red_blue_ratio": {"min": 1.1, "max": 2.4}
    },
    "Alocasia sanderiana": {
        "temperature": {"min": 20.0, "max": 28.0},
        "humidity": {"min": 60.0, "max": 90.0},
        "vpd": {"min": 0.9, "max": 1.3},
        "soil_moisture": {"min": 50.0, "max": 70.0},
        "ppfd": {"min": 150.0, "max": 350.0},
        "quality_index": {"min": 0.65, "max": 0.9},
        "red_blue_ratio": {"min": 1.1, "max": 2.4}
    },
    "Ocimum basilicum": {
        "temperature": {"min": 18.0, "max": 27.0},
        "humidity": {"min": 50.0, "max": 70.0},
        "vpd": {"min": 0.9, "max": 1.3},
        "soil_moisture": {"min": 50.0, "max": 70.0},
        "ppfd": {"min": 350.0, "max": 700.0},
        "quality_index": {"min": 0.7, "max": 0.95},
        "red_blue_ratio": {"min": 1.2, "max": 3.0}
    },
    "Asplenium nidus": {
        "temperature": {"min": 18.0, "max": 26.0},
        "humidity": {"min": 60.0, "max": 85.0},
        "vpd": {"min": 0.8, "max": 1.2},
        "soil_moisture": {"min": 45.0, "max": 65.0},
        "ppfd": {"min": 40.0, "max": 150.0},
        "quality_index": {"min": 0.6, "max": 0.85},
        "red_blue_ratio": {"min": 0.8, "max": 1.8}
    },
    "Nephrolepis exaltata": {
        "temperature": {"min": 16.0, "max": 24.0},
        "humidity": {"min": 60.0, "max": 90.0},
        "vpd": {"min": 0.8, "max": 1.2},
        "soil_moisture": {"min": 50.0, "max": 70.0},
        "ppfd": {"min": 40.0, "max": 150.0},
        "quality_index": {"min": 0.6, "max": 0.85},
        "red_blue_ratio": {"min": 0.8, "max": 1.7}
    },
    "Goeppertia roseopicta": {
        "temperature": {"min": 23.0, "max": 29.0},
        "humidity": {"min": 60.0, "max": 85.0},
        "vpd": {"min": 0.9, "max": 1.2},
        "soil_moisture": {"min": 50.0, "max": 70.0},
        "ppfd": {"min": 150.0, "max": 350.0},
        "quality_index": {"min": 0.65, "max": 0.9},
        "red_blue_ratio": {"min": 1.0, "max": 2.2}
    },
    "Spathiphyllum friedrichsthalii": {
        "temperature": {"min": 18.0, "max": 27.0},
        "humidity": {"min": 50.0, "max": 80.0},
        "vpd": {"min": 0.8, "max": 1.2},
        "soil_moisture": {"min": 50.0, "max": 70.0},
        "ppfd": {"min": 150.0, "max": 350.0},
        "quality_index": {"min": 0.6, "max": 0.85},
        "red_blue_ratio": {"min": 0.9, "max": 2.0}
    },
    "Monstera deliciosa": { # this is the final one which is being used for the test api 
        "temperature": {"min": 18.0, "max": 27.0},
        "humidity": {"min": 60.0, "max": 85.0},
        "vpd": {"min": 0.9, "max": 1.2},
        "soil_moisture": {"min": 50.0, "max": 70.0},
        "ppfd": {"min": 350.0, "max": 700.0},
        "quality_index": {"min": 0.7, "max": 0.95},
        "red_blue_ratio": {"min": 1.1, "max": 2.8}
    }
}