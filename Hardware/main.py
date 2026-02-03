import time
import smbus2
import struct
import requests
import math

# --- 1. I2C / Sensor Setup ---
si7021_ADD = 0x40
AS7262_ADDR = 0x49
si7021_READ_TEMPERATURE = 0xF3
si7021_READ_HUMIDITY = 0xF5 
bus = smbus2.SMBus(1)
irradiance = 0
DRY_VALUE = 21580 
WET_VALUE = 10000
ADC_ADDR = 0x48

FASTAPI_URL = "http://172.20.10.13:8000/sensor-data" 
DEVICE_ID = "Eden_Biome_Monitor_01"

def send_to_fastapi(payload):
    try:
        # We use a timeout so the script doesn't hang if the server is down
        response = requests.post(FASTAPI_URL, json=payload, timeout=2)
        if response.status_code == 200:
            print(f"HTTP SUCCESS: Data sent to {FASTAPI_URL}")
        else:
            print(f"HTTP ERROR: Server returned {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"HTTP FAILED: {e}")


def get_si7021_data(command):
    cmd_msg = smbus2.i2c_msg.write(si7021_ADD, [command])
    read_result = smbus2.i2c_msg.read(si7021_ADD, 2)
    bus.i2c_rdwr(cmd_msg)
    time.sleep(0.1) 
    bus.i2c_rdwr(read_result)
    # Convert buffer to list to avoid TypeError
    data = list(read_result)
    return (data[0] << 8) | data[1]

def virtual_write(reg, value):
    # Wait for Write buffer to be empty (Bit 1 of Status 0x00)
    while True:
        status = bus.read_byte_data(AS7262_ADDR, 0x00)
        if not (status & 0x02): break
    bus.write_byte_data(AS7262_ADDR, 0x01, reg | 0x80)
    
    # Wait for Write buffer again before sending the value
    while True:
        status = bus.read_byte_data(AS7262_ADDR, 0x00)
        if not (status & 0x02): break
    bus.write_byte_data(AS7262_ADDR, 0x01, value)

def virtual_read(reg):
    # 1. Tell the sensor which register we want to read
    while True:
        status = bus.read_byte_data(AS7262_ADDR, 0x00)
        if not (status & 0x02): break
    bus.write_byte_data(AS7262_ADDR, 0x01, reg)
    
    # 2. Wait for Data to be ready to read (Bit 0 of Status 0x00)
    while True:
        status = bus.read_byte_data(AS7262_ADDR, 0x00)
        if (status & 0x01): break
    return bus.read_byte_data(AS7262_ADDR, 0x02)

def get_calibrated_float(start_reg):
    # Read the 4 bytes that make up the Float32
    b1 = virtual_read(start_reg)
    b2 = virtual_read(start_reg + 1)
    b3 = virtual_read(start_reg + 2)
    b4 = virtual_read(start_reg + 3)
    return struct.unpack('>f', bytearray([b1, b2, b3, b4]))[0]

def get_soil_moisture():
    try:
        # ADS1115: Config AIN0, +/-4.096V, Single-shot
        bus.write_i2c_block_data(ADC_ADDR, 0x01, [0xC3, 0x83])
        # Shortest possible delay for ADC conversion
        time.sleep(0.01)
        data = bus.read_i2c_block_data(ADC_ADDR, 0x00, 2)
        raw = (data[0] << 8) | data[1]
        percentage = ((DRY_VALUE - raw) / (DRY_VALUE - WET_VALUE)) * 100
        return round(max(0, min(100, percentage)), 2)
    except:
        return None

def calculate_vpd(temp_c, humidity):
    # SVP (Saturated Vapor Pressure) in kPa
    svp = 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))
    # AVP (Actual Vapor Pressure)
    avp = svp * (humidity / 100.0)
    # VPD is the deficit
    return round(svp - avp, 3)

virtual_write(0x04, 0x20) 
time.sleep(1)

# --- 4. Main Loop ---
try:
    while True:
        # A. Read sensor values
        raw_temp = get_si7021_data(si7021_READ_TEMPERATURE)
        raw_hum = get_si7021_data(si7021_READ_HUMIDITY)
        soil_pct = get_soil_moisture()

        # B. Convert to real units
        temp_c = ((175.72 * raw_temp) / 65536) - 46.85
        hum_rh = ((125 * raw_hum) / 65536) - 6

        vpd = calculate_vpd(temp_c, hum_rh)

        v = get_calibrated_float(0x14) # Violet
        b = get_calibrated_float(0x18) # Blue
        g = get_calibrated_float(0x1C) # Green
        y = get_calibrated_float(0x20) # Yellow
        o = get_calibrated_float(0x24) # Orange
        r = get_calibrated_float(0x28) # Red

        # C. Eden Project Quality Metrics
        # Weighting based on McCree's curve (Bio-efficiency)
        weighted_sum = (v*0.95) + (b*0.85) + (g*0.70) + (y*0.75) + (o*0.90) + (r*1.0)
        raw_sum = v + b + g + y + o + r
        
        # Calculate Plant Light Intensity (PPFD) and Quality Ratio
        ppfd = round(raw_sum * 0.046, 2)
        efficiency = round(weighted_sum / raw_sum, 3) if raw_sum > 0 else 0
        
        # Calculate Red:Blue ratio for morphogenesis tracking
        rb_ratio = round((o + r) / (v + b), 2) if (v + b) > 0 else 0

        sensor_payload = {
            "device_id": DEVICE_ID,
            "timestamp": time.time(),
            "climate": {
                "temperature": temp_c,
                "humidity": hum_rh,
                "vpd": vpd
            },
            "soil": {
                "moisture": soil_pct
            },
            "light": {
                "ppfd": ppfd,
                "quality_index": efficiency,
                "red_blue_ratio": rb_ratio
            }
        }
        
        print("\n" + "="*40)
        print(f"CLIMATE | Temp: {temp_c}°C | Hum: {hum_rh}% | VPD: {vpd} kPa")
        print(f"SOIL    | Moisture: {soil_pct}%")
        print(f"LIGHT   | PPFD: {ppfd} | Quality: {efficiency} | R:B: {rb_ratio}")
        
        # Quick Bio-Insight
        if vpd < 0.4:
            print("INSIGHT | Transpiration low. Risk of rot/mold.")
        elif vpd > 1.6:
            print("INSIGHT | Transpiration too high. Stomata may close.")
        
        if efficiency < 0.75:
            print("INSIGHT | Spectral Quality is poor. Check for shading.")
        time.sleep(2)

except KeyboardInterrupt:
    print("\nStopping...")