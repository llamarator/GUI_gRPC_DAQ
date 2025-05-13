import grpc
import sys
import os
import time

# Añadir el directorio raíz del proyecto al path para poder importar los módulos
sys.path.append('/app')

# Importar los módulos gRPC generados
from control.grpc.control_pb2 import StatusRequest
from control.grpc.control_pb2_grpc import ControlServiceStub

class GrpcClient:
    """
    Biblioteca personalizada para Robot Framework que proporciona funciones para interactuar con servicios gRPC
    """
    
    def test_grpc_connection(self, host, port):
        """
        Prueba la conexión a un servidor gRPC
        
        Args:
            host: El host del servidor gRPC
            port: El puerto del servidor gRPC
            
        Returns:
            bool: True si la conexión es exitosa, False en caso contrario
        """
        try:
            channel = grpc.insecure_channel(f'{host}:{port}')
            # Establecer un tiempo de espera para la conexión
            grpc.channel_ready_future(channel).result(timeout=10)
            return True
        except grpc.FutureTimeoutError:
            return False
        except Exception as e:
            print(f"Error al conectar al servidor gRPC: {e}")
            return False
    
    def call_grpc_method(self, method_name, **kwargs):
        """
        Llama a un método específico del servicio gRPC
        
        Args:
            method_name: Nombre del método gRPC a llamar
            **kwargs: Argumentos para el método
            
        Returns:
            object: La respuesta del método gRPC o None en caso de error
        """
        host = os.environ.get('GRPC_HOST', 'control-grpc')
        port = os.environ.get('GRPC_PORT', '50051')
        
        try:
            channel = grpc.insecure_channel(f'{host}:{port}')
            stub = ControlServiceStub(channel)
            
            # Determinar qué método llamar basado en method_name
            if method_name == "GetStatus":
                request = StatusRequest()
                response = stub.GetStatus(request)
                return {"status": response.status, "message": response.message}
            # Añadir más métodos según sea necesario
            else:
                return f"Método {method_name} no implementado"
        
        except Exception as e:
            print(f"Error al llamar al método gRPC {method_name}: {e}")
            return None
