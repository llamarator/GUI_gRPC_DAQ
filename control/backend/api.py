from fastapi import FastAPI
import grpc
import sys
sys.path.append("..")  # Asegura que el backend pueda encontrar control_pb2.py
import control_pb2
import control_pb2_grpc
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Puedes cambiar "*" por ["http://localhost:3000"] para mayor seguridad
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos (GET, POST, etc.)
    allow_headers=["*"],  # Permite todos los encabezados
)


# Conexión con el servidor gRPC
channel = grpc.insecure_channel("localhost:50051")
stub = control_pb2_grpc.ControlServiceStub(channel)
print("init server")
@app.get("/data")
async def get_data():
    response = stub.GetData(control_pb2.Empty())
    print(f"api.py: get_data: {response}")
    return {"estado": response.estado, "valores": list(response.valores)}

@app.post("/send")
async def send_data(mensaje: str):
    response = stub.SendData(control_pb2.DataRequest(mensaje=mensaje))
    print(f"api.py: post: {response}")
    return {"success": response.success, "recibido": response.recibido}
