import grpc
import sys
import control_pb2
import control_pb2_grpc

def run(value=None):
    """
    Run the gRPC client.
    
    Args:
        value (str, optional): The value to send to the server. If provided, will make a SendData request.
                               If not provided, will make a GetData request.
    """
    with grpc.insecure_channel('localhost:50051') as channel:
        stub = control_pb2_grpc.ControlServiceStub(channel)
        
        if value is not None:
            # Send data to the server
            try:
                send_response = stub.SendData(control_pb2.DataRequest(mensaje=value))
                print(f"Data sent successfully. Server received: {send_response.recibido}")
                print(f"Success: {send_response.success}")
            except grpc.RpcError as e:
                print(f"Failed to send data: {e.details()}")
        else:
            # Get data from the server
            try:
                response = stub.GetData(control_pb2.Empty())
                print(f"Data received from server:")
                print(f"Status: {response.estado}")
                print(f"Values: {response.valores}")
            except grpc.RpcError as e:
                print(f"Failed to get data: {e.details()}")

if __name__ == "__main__":
    # Check if a value was provided as a command line argument
    if len(sys.argv) > 1:
        value = sys.argv[1]
        print(f"Sending value: {value}")
        run(value)
    else:
        print("No value provided. Getting data from server.")
        run()