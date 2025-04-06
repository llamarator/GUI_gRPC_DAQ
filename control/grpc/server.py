import grpc
import random
import psycopg2
from concurrent import futures
import time
import control_pb2
import control_pb2_grpc

class ControlServiceServicer(control_pb2_grpc.ControlServiceServicer):
    def __init__(self):
        super().__init__()
        print("initializing")
        self.db_connection = None
        self.connect_to_db()
        self.setup_db()
    
    def connect_to_db(self):
        """Connect to PostgreSQL database"""
        print("start sql server connection")
        try:
            self.db_connection = psycopg2.connect(
                host="0.0.0.0",
                port="5432",
                database="mydb",
                user="user",
                password="password"
            )
            print("Connected to PostgreSQL database")
        except Exception as e:
            print(f"Failed to connect to database: {e}")
            raise
    
    def setup_db(self):
        """Create necessary tables if they don't exist"""
        try:
            cursor = self.db_connection.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sensor_data (
                    id SERIAL PRIMARY KEY,
                    value INTEGER NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            self.db_connection.commit()
            cursor.close()
            print("Database setup complete")
        except Exception as e:
            print(f"Failed to setup database: {e}")
            raise
    
    def GetData(self, request, context):
        """Retrieve data from PostgreSQL database"""
        try:
            cursor = self.db_connection.cursor()
            # Get the latest 5 entries
            cursor.execute("""
                SELECT value FROM sensor_data
                ORDER BY timestamp DESC
                LIMIT 5
            """)
            results = cursor.fetchall()
            cursor.close()
            
            # Extract values from results
            values = [row[0] for row in results]
            
            # If there are fewer than 5 entries, pad with zeros
            while len(values) < 5:
                values.append(0)
                
            response = control_pb2.DataResponse(
                estado="OK",
                valores=values
            )
            
            print(f"server.py: sending data {response}")
            print(f"server.py: sending request {request}")
            print(f"server.py: sending context {context}")
            
            return response
        except Exception as e:
            print(f"Error retrieving data: {e}")
            # If there's an error, return a response with an error state
            return control_pb2.DataResponse(
                estado="ERROR",
                valores=[0, 0, 0, 0, 0]
            )
    
    def SendData(self, request, context):
        """Store data in PostgreSQL database"""
        try:
            value = int(request.mensaje)
            
            cursor = self.db_connection.cursor()
            cursor.execute("""
                INSERT INTO sensor_data (value)
                VALUES (%s)
            """, (value,))
            self.db_connection.commit()
            cursor.close()
            
            print(f"Received and stored request: {request}")
            return control_pb2.Response(success=True, recibido=request.mensaje)
        except Exception as e:
            print(f"Error storing data: {e}")
            return control_pb2.Response(success=False, recibido=request.mensaje)

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    control_pb2_grpc.add_ControlServiceServicer_to_server(ControlServiceServicer(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("gRPC Server running on port 50051")
    try:
        while True:
            time.sleep(86400)  # 1 day in seconds
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == "__main__":
    serve()




'''

import grpc
import random
from concurrent import futures
import time
import control_pb2
import control_pb2_grpc

class ControlServiceServicer(control_pb2_grpc.ControlServiceServicer):
    data = list
    request = "empty"
    context = "empty"
    def __init__(self):
        super().__init__()


    def GetData(self, request, context):
        #random_values = [random.randint(0, 100) for _ in range(5)]
        response = control_pb2.DataResponse(
            estado="OK",
            valores=random_values
        )
        print(f"server.py: sending data {response}")
        print(f"server.py: sending request {request}")
        print(f"server.py: sending context {context}")
        return response
    
    def SendData(self, request, context):
        print("receving request:{request}")
        self.data.append(int(request.mensaje))
        return control_pb2.Response(success=True, recibido=request.mensaje)

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    control_pb2_grpc.add_ControlServiceServicer_to_server(ControlServiceServicer(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("Servidor gRPC en ejecución en el puerto 50051")
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == "__main__":
    serve()

    '''