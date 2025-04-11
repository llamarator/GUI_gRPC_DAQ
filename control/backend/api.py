from fastapi import FastAPI, WebSocket
import grpc
import sys
import os
import time
import psycopg2  # Add this import for PostgreSQL
from dotenv import load_dotenv  # Add this for environment variables
import asyncio

from fastapi import HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import uuid
import json
from datetime import datetime, timedelta


sys.path.append("..")
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import control_pb2
import control_pb2_grpc
from fastapi.middleware.cors import CORSMiddleware
from starlette.websockets import WebSocketDisconnect

# Load environment variables
load_dotenv()

# Database connection setup
def get_db_connection():
    """Create and return a database connection"""
    return psycopg2.connect(
            #host="sql",
            host="172.90.0.40",
            port="5432",
            database="mydb",
            user="user",
            password="password"
            )
    

# Create a connection pool or global connection
# For simplicity, we'll use a global connection, but in production
# you might want to use a connection pool
conn = get_db_connection()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can change "*" to ["http://localhost:3000"] for better security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# gRPC client setup
def get_grpc_client():
    """Create and return a gRPC client connection"""
    #channel = grpc.insecure_channel(os.getenv("GRPC_SERVER", "localhost:50051"))
    channel = grpc.insecure_channel(os.getenv("GRPC_SERVER", "172.90.0.33:50051"))
    return control_pb2_grpc.ControlServiceStub(channel)


# Models for sample data
class DataPoint(BaseModel):
    time: str
    timestamp: Optional[str] = None
    value: float

class Sample(BaseModel):
    name: str
    data: List[DataPoint]
    timestamp: str

class SampleCreate(BaseModel):
    name: str
    data: List[dict]
    timestamp: str

class SampleResponse(BaseModel):
    id: str
    name: str
    timestamp: str
    dataPoints: int


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"Client disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send a message to all connected clients"""
        if not self.active_connections:
            return
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to client: {e}")

manager = ConnectionManager()







@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Send initial data to the client when they connect
    try:
        # Fetch latest data from database
        cursor = conn.cursor()
        cursor.execute("""
            SELECT value FROM sensor_data
            ORDER BY timestamp DESC
            LIMIT 10
        """)
        results = cursor.fetchall()
        cursor.close()
        
        # Extract values from results
        values = [row[0] for row in results]
        
        # Send initial data
        await websocket.send_json({
            "type": "update",
            "valores": values,
            "status": "Connected to real-time feed"
        })
    except Exception as e:
        print(f"Error sending initial data: {e}")
    
    try:
        # Keep the connection alive and handle client messages
        while True:
            # Wait for messages (if client sends any commands)
            data = await websocket.receive_json()
            
            # Handle different message types
            if "command" in data:
                if data["command"] == "fetch_latest":
                    # Fetch latest data and send it
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT value FROM sensor_data
                        ORDER BY timestamp DESC
                        LIMIT 5
                    """)
                    results = cursor.fetchall()
                    cursor.close()
                    
                    values = [row[0] for row in results]
                    await websocket.send_json({
                        "type": "update",
                        "valores": values,
                        "requestId": data.get("requestId")
                    })
                elif data["command"] == "ping":
                    # Simple ping-pong to keep connection alive
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": time.time()
                    })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected normally")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

async def notify_clients_of_new_data(new_value):
    """Notify all connected WebSocket clients about new data"""
    try:
        # Fetch a few recent values to provide context
        cursor = conn.cursor()
        cursor.execute("""
            SELECT value FROM sensor_data
            ORDER BY timestamp DESC
            LIMIT 5
        """)
        results = cursor.fetchall()
        cursor.close()
        
        values = [row[0] for row in results]
        
        # Broadcast to all connected clients
        await manager.broadcast({
            "type": "update",
            "valores": values,
            "timestamp": time.time(),
            "message": "New data received"
        })
        
        print(f"Notified {len(manager.active_connections)} clients of new data")
    except Exception as e:
        print(f"Error notifying clients: {e}")

@app.get("/history")
async def get_historical_data(timeRange: str = "24h"):
    """Get historical data from the database (maps to gRPC GetHistoricalData)"""
    try:
        # Use gRPC client to get historical data
        grpc_client = get_grpc_client()
        request = control_pb2.HistoricalDataRequest(timeRange=timeRange)
        response = grpc_client.GetHistoricalData(request)
        
        if response.success:
            # Format the data for the API response
            data = []
            for item in response.data:
                data.append({
                    "value": item.value,
                    "timestamp": item.timestamp,
                    "server": item.server
                })
            
            return {
                "success": True,
                "data": data,
                "timeRange": timeRange,
                "count": len(data)
            }
        else:
            # If gRPC failed, fall back to direct database query
            time_filter = "1 day"  # Default for 24h
            
            if timeRange == "1h":
                time_filter = "1 hour"
            elif timeRange == "6h":
                time_filter = "6 hours"
            elif timeRange == "7d":
                time_filter = "7 days"
            elif timeRange == "30d":
                time_filter = "30 days"
            
            cursor = conn.cursor()
            
            if timeRange == "all":
                # Get all data (with reasonable limit)
                cursor.execute("""
                    SELECT value, timestamp FROM sensor_data
                    ORDER BY timestamp DESC
                    LIMIT 1000
                """)
            else:
                # Get data within time range
                cursor.execute("""
                    SELECT value, timestamp FROM sensor_data
                    WHERE timestamp > NOW() - INTERVAL %s
                    ORDER BY timestamp DESC
                """, (time_filter,))
            
            results = cursor.fetchall()
            cursor.close()
            
            # Format the response data
            data = []
            for row in results:
                data.append({
                    "value": row[0],
                    "timestamp": row[1].isoformat() if hasattr(row[1], 'isoformat') else str(row[1]),
                    "server": "main-server"  # You can add more metadata as needed
                })
            
            return {
                "success": True,
                "data": data,
                "timeRange": timeRange,
                "count": len(data)
            }
    except Exception as e:
        print(f"Error retrieving historical data: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": []
        }

@app.get("/data")
async def get_data(interval: int = 5000):
    """Get current data with dynamic limit based on interval (maps to gRPC GetData)"""
    try:
        # Try to use gRPC service first
        try:
            grpc_client = get_grpc_client()
            request = control_pb2.DataRequest(mensaje="get_current_data", interval=interval)
            response = grpc_client.GetData(request)
            
            # If we got a valid response, return it
            if response.estado == "OK":
                print(f"api.py: get_data: estado: \"OK\" (via gRPC)")
                for val in response.valores:
                    print(f"valores: {val}")
                
                return {
                    "estado": response.estado,
                    "valores": list(response.valores),
                    "interval": interval
                }
        except Exception as grpc_error:
            print(f"gRPC error, falling back to direct DB: {grpc_error}")
            # Proceed to direct DB query on error
        
        # Calculate a reasonable number of records based on the interval
        # Shorter intervals = fewer records, longer intervals = more records
        limit = max(5, min(20, int(30000 / interval)))
        print(f"get_data: limit of elements: {limit}")
        cursor = conn.cursor()
        cursor.execute("""
            SELECT value FROM sensor_data
            ORDER BY timestamp DESC
            LIMIT %s
        """, (limit,))
        results = cursor.fetchall()
        cursor.close()
        
        # Extract values from results
        values = [row[0] for row in results]
        
        # If there are fewer entries than expected, pad with zeros
        while len(values) < 5:
            values.append(0)
        
        print(f"api.py: get_data: estado: \"OK\"")
        for val in values:
            print(f"valores: {val}")
        
        return {
            "estado": "OK",
            "valores": values,
            "interval": interval
        }
    except Exception as e:
        print(f"Error fetching data: {e}")
        return {
            "estado": "ERROR",
            "valores": [0, 0, 0, 0, 0],
            "error": str(e)
        }

@app.post("/send")
async def send_data(data: dict):
    """Send data to the database and notify connected clients (maps to gRPC SendData)"""
    try:
        # Extract the value from the request
        if isinstance(data, dict):
            value = data.get("value", 0)
        else:
            # Try to parse the data if it's not already a dict
            value = int(data)
        
        # Try to use gRPC service first
        try:
            grpc_client = get_grpc_client()
            request = control_pb2.DataRequest(mensaje=str(value), interval=0)
            response = grpc_client.SendData(request)
            
            if response.success:
                # Notify all connected WebSocket clients
                await notify_clients_of_new_data(value)
                
                return {
                    "success": True,
                    "message": response.recibido,
                    "value": value
                }
        except Exception as grpc_error:
            print(f"gRPC error, falling back to direct DB: {grpc_error}")
            # Continue with direct DB insertion on error
        
        # Insert into database
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sensor_data (value)
            VALUES (%s)
            RETURNING id
        """, (value,))
        record_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        
        # Notify all connected WebSocket clients
        await notify_clients_of_new_data(value)
        
        return {
            "success": True,
            "message": f"Data received and stored with ID {record_id}",
            "value": value
        }
    except Exception as e:
        print(f"Error in send_data: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# Add an endpoint to handle connection errors or reconnection
@app.get("/status")
async def get_status():
    """Check the status of both database and gRPC connections"""
    status = {
        "database_connected": False,
        "grpc_connected": False,
        "active_websocket_connections": len(manager.active_connections),
        "timestamp": time.time()
    }
    
    # Check database connection
    try:
        global conn
        # If connection is closed, try to reconnect
        if conn.closed:
            conn = get_db_connection()
        
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        status["database_connected"] = True
    except Exception as db_error:
        status["database_error"] = str(db_error)
        # Try to reconnect
        try:
            conn = get_db_connection()
            status["database_reconnected"] = True
        except:
            status["database_reconnected"] = False
    
    # Check gRPC connection
    try:
        grpc_client = get_grpc_client()
        # Simple ping (use an empty request if available, or a minimal one)
        request = control_pb2.DataRequest(mensaje="ping", interval=0)
        response = grpc_client.GetData(request)
        status["grpc_connected"] = True
    except Exception as grpc_error:
        status["grpc_error"] = str(grpc_error)
    
    return status
# Initialize sample database tables
def init_sample_db():
    conn = sqlite3.connect('network_data.db')
    cursor = conn.cursor()
    
    # Create samples table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS samples (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        data TEXT NOT NULL
    )
    ''')
    
    conn.commit()
    conn.close()
# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Executed when the application starts"""
    print("FastAPI application starting up")
    
    # Verify database connection
    try:
        global conn
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        print("Database connection established")
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        # Try to reconnect
        try:
            conn = get_db_connection()
            print("Database reconnection successful")
        except Exception as reconnect_error:
            print(f"Database reconnection failed: {reconnect_error}")
    init_sample_db()
    print("Sample database initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Executed when the application shuts down"""
    print("FastAPI application shutting down")
    
    # Close database connection
    try:
        global conn
        if not conn.closed:
            conn.close()
            print("Database connection closed")
    except Exception as e:
        print(f"Error closing database connection: {e}")

@app.on_event("startup")
async def start_grpc_streaming():
    """Start gRPC streaming connection in background"""
    # Create the task but also handle exceptions properly
    task = asyncio.create_task(connect_to_grpc_stream())
    def handle_task_exception(task):
        try:
            # This will re-raise any exception that occurred in the task
            task.result()
        except Exception as e:
            print(f"Background task error: {e}")
            # Don't let this crash the application
    
    task.add_done_callback(handle_task_exception)


@app.post("/samples/save")
async def save_sample(sample: SampleCreate):
    # Generate a unique ID for the sample
    sample_id = str(uuid.uuid4())
    
    try:
        # Connect to database
        conn = sqlite3.connect('network_data.db')
        cursor = conn.cursor()
        
        # Insert sample
        cursor.execute(
            "INSERT INTO samples (id, name, timestamp, data) VALUES (?, ?, ?, ?)",
            (sample_id, sample.name, sample.timestamp, json.dumps(sample.data))
        )
        
        conn.commit()
        conn.close()
        
        return {"success": True, "id": sample_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/samples/list")
async def list_samples():
    try:
        # Connect to database
        conn = sqlite3.connect('network_data.db')
        cursor = conn.cursor()
        
        # Get all samples
        cursor.execute("SELECT id, name, timestamp, data FROM samples ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        
        # Format response
        samples = []
        for row in rows:
            sample_id, name, timestamp, data = row
            data_parsed = json.loads(data)
            samples.append({
                "id": sample_id,
                "name": name,
                "timestamp": timestamp,
                "dataPoints": len(data_parsed)
            })
        
        conn.close()
        
        return {"samples": samples}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/samples/{sample_id}")
async def get_sample(sample_id: str):
    try:
        # Connect to database
        conn = sqlite3.connect('network_data.db')
        cursor = conn.cursor()
        
        # Get specific sample
        cursor.execute("SELECT id, name, timestamp, data FROM samples WHERE id = ?", (sample_id,))
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Sample not found")
        
        # Format response
        sample_id, name, timestamp, data = row
        data_parsed = json.loads(data)
        
        conn.close()
        
        return {
            "id": sample_id,
            "name": name,
            "timestamp": timestamp,
            "data": data_parsed
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/samples/{sample_id}")
async def delete_sample(sample_id: str):
    try:
        # Connect to database
        conn = sqlite3.connect('network_data.db')
        cursor = conn.cursor()
        
        # Check if sample exists
        cursor.execute("SELECT id FROM samples WHERE id = ?", (sample_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Sample not found")
        
        # Delete sample
        cursor.execute("DELETE FROM samples WHERE id = ?", (sample_id,))
        
        conn.commit()
        conn.close()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/samples/compare")
async def compare_samples(sample_ids: List[str] = Body(...)):
    if not sample_ids or len(sample_ids) > 3:
        raise HTTPException(status_code=400, detail="Please provide 1-3 sample IDs to compare")
    
    try:
        # Connect to database
        conn = sqlite3.connect('network_data.db')
        cursor = conn.cursor()
        
        result = []
        for sample_id in sample_ids:
            # Get specific sample
            cursor.execute("SELECT id, name, timestamp, data FROM samples WHERE id = ?", (sample_id,))
            row = cursor.fetchone()
            
            if not row:
                continue
            
            # Format response
            sample_id, name, timestamp, data = row
            data_parsed = json.loads(data)
            
            result.append({
                "id": sample_id,
                "name": name,
                "timestamp": timestamp,
                "data": data_parsed
            })
        
        conn.close()
        
        return {"samples": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

async def connect_to_grpc_stream():
    """Connect to gRPC streaming service and handle updates"""
    print("Starting gRPC streaming connection")
    consecutive_errors = 0
    
    while True:
        try:
            # Create a non-blocking channel
            channel = grpc.aio.insecure_channel(os.getenv("GRPC_SERVER", "localhost:50051"))
            stub = control_pb2_grpc.ControlServiceStub(channel)
            
            request = control_pb2.StreamRequest(interval=5000, clientId="api-server")
            consecutive_errors = 0
            
            print("Starting data stream from gRPC server")
            async for response in stub.StreamData(request):
                if response.estado == "OK":
                    values = list(response.valores)
                    print(f"Received streaming update with values: {values}")
                    
                    # Broadcast to all connected WebSocket clients
                    await manager.broadcast({
                        "type": "update",
                        "valores": values,
                        "timestamp": response.timestamp,
                        "message": "Real-time data update"
                    })
                    
                    # Explicitly yield control back to the event loop
                    await asyncio.sleep(0)
                else:
                    print(f"Received error from stream: {response.estado}")
        
        except Exception as e:
            consecutive_errors += 1
            print(f"Error in gRPC streaming connection: {e}")
            
            # Exponential backoff
            backoff_time = min(5 * (2 ** consecutive_errors), 300)
            print(f"Waiting {backoff_time} seconds before reconnecting...")
            await asyncio.sleep(backoff_time)


# async def periodic_update_task():
#     """Task that runs in the background to send periodic updates to clients"""
#     while True:
#         if manager.active_connections:
#             try:
#                 # Fetch latest data
#                 cursor = conn.cursor()
#                 cursor.execute("""
#                     SELECT value FROM sensor_data
#                     ORDER BY timestamp DESC
#                     LIMIT 5
#                 """)
#                 results = cursor.fetchall()
#                 cursor.close()
                
#                 # Extract values from results
#                 values = [row[0] for row in results]
                
#                 # Broadcast to all connected clients
#                 await manager.broadcast({
#                     "type": "heartbeat",
#                     "valores": values,
#                     "timestamp": time.time()
#                 })
#             except Exception as e:
#                 print(f"Error in periodic update: {e}")
        
#         # Wait before next update (30 seconds)
#         await asyncio.sleep(30)

# # Start the background task when the app starts
# @app.on_event("startup")
# async def startup_event():
#     asyncio.create_task(periodic_update_task())















# Conexión con el servidor gRPC
# channel = grpc.insecure_channel("localhost:50051")
# stub = control_pb2_grpc.ControlServiceStub(channel)
# print("init server")
# @app.get("/data")
# async def get_data():
#     response = stub.GetData(control_pb2.Empty())
#     print(f"api.py: get_data: {response}")
#     return {"estado": response.estado, "valores": list(response.valores)}

# @app.post("/send")
# async def send_data(mensaje: str):
#     response = stub.SendData(control_pb2.DataRequest(mensaje=mensaje))
#     print(f"api.py: send_data: {response}")
#     print(mensaje)
#     return {"success": response.success, "recibido": response.recibido}

# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     try:
#         while True:
#             # You need to properly handle the messages
#             # If you're expecting JSON:
#             data = await websocket.receive_json()
#             print(f"Received data: {data}")
#             # Send a response to keep the connection alive
#             await websocket.send_json({"type": "update", "valores": [50, 55, 60]})
#     except WebSocketDisconnect:
#         print("Client disconnected normally")
#     except Exception as e:
#         print(f"Error in WebSocket connection: {e}")
