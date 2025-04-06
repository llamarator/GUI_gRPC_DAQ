import grpc
import control_pb2
import control_pb2_grpc

def run():
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = control_pb2_grpc.ControlServiceStub(channel)
        # hacemos un get al servidor:
        response = stub.GetData(control_pb2.Empty())
        print(f"Datos recibidos: Estado: {response.estado}, Valores: {response.valores}")
        # enciamos un post
        send_response = stub.SendData(control_pb2.DataRequest(mensaje="6"))
        print(f"Respuesta del servidor: {send_response.recibido}")

if __name__ == "__main__":
    run()
