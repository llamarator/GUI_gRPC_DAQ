import grpc
import random
import psycopg2
from concurrent import futures
import time
import threading
import os
from datetime import datetime
import control_pb2
import control_pb2_grpc

class ControlServiceServicer(control_pb2_grpc.ControlServiceServicer):
    def __init__(self):
        super().__init__()
        print("Initializing ControlServiceServicer")
        self.db_connection = None
        # Store the active clients that need periodic updates
        self.streaming_clients = {}
        self.client_lock = threading.Lock()
        # Connect to the database
        self.connect_to_db()
        self.setup_db()
        # Start the periodic refresh thread
        #self.start_periodic_refresh()
    
    def connect_to_db(self):
        """Connect to PostgreSQL database"""
        print("Starting SQL server connection")
        try:
            # Get database connection parameters from environment variables with fallbacks
            host = os.getenv("DB_HOST", "172.90.0.40")
            port = os.getenv("DB_PORT", "5432")
            database = os.getenv("DB_NAME", "mydb")
            user = os.getenv("DB_USER", "user")
            password = os.getenv("DB_PASSWORD", "password")
            
            self.db_connection = psycopg2.connect(
                host=host,
                port=port,
                database=database,
                user=user,
                password=password
            )
            print(f"Connected to PostgreSQL database at {host}:{port}")
        except Exception as e:
            print(f"Failed to connect to database: {e}")
            # Wait and try again instead of raising
            time.sleep(5)
            self.connect_to_db()
    
    def setup_db(self):
        """Create necessary tables if they don't exist"""
        try:
            cursor = self.db_connection.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sensor_data (
                    id SERIAL PRIMARY KEY,
                    value INTEGER NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    server VARCHAR(100) DEFAULT 'main-server'
                )
            """)
            self.db_connection.commit()
            cursor.close()
            print("Database setup complete")
        except Exception as e:
            print(f"Failed to setup database: {e}")
            # If database connection is lost, reconnect
            if "connection" in str(e).lower():
                print("Attempting to reconnect to database...")
                self.connect_to_db()
                self.setup_db()
            else:
                raise
    
    def check_db_connection(self):
        """Check if the database connection is alive and reconnect if needed"""
        try:
            # Simple query to check connection
            cursor = self.db_connection.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            return True
        except Exception:
            # Connection lost, try to reconnect
            try:
                self.db_connection.close()
            except:
                pass
            self.connect_to_db()
            return self.db_connection is not None
    
    def GetData(self, request, context):
        """Retrieve data from PostgreSQL database"""
        print(f"server.py: GetData request received: {request}")
        
        # Register client for periodic updates if interval > 0
        client_id = context.peer()
        if hasattr(request, 'interval') and request.interval > 0:
            with self.client_lock:
                self.streaming_clients[client_id] = {
                    'interval': request.interval,
                    'last_update': time.time(),
                    'context': context
                }
                print(f"Registered client {client_id} for updates every {request.interval}ms")
        
        try:
            # Ensure database connection is active
            if not self.check_db_connection():
                return control_pb2.DataResponse(
                    estado="ERROR",
                    valores=[0, 0, 0, 0, 0]
                )
            
            cursor = self.db_connection.cursor()
            
            # Get the number of entries based on interval if specified
            limit = 50  # Default
            if hasattr(request, 'interval') and request.interval > 0:
                # Adjust number of records based on interval
                #limit = max(5, min(20, int(30000 / request.interval)))
                print(f"Using limit of {limit} based on interval {request.interval}")
            
            cursor.execute("""
                SELECT value FROM sensor_data
                ORDER BY timestamp DESC
                LIMIT %s
            """, (limit,))
            results = cursor.fetchall()
            cursor.close()
            
            # Extract values from results
            values = [row[0] for row in results]
            
            # If there are fewer than 5 entries, pad with zeros
            while len(values) < 5:
                values.append(0)
            
            print(f"Returning {len(values)} values")
            return control_pb2.DataResponse(
                estado="OK",
                valores=values
            )
        except Exception as e:
            print(f"Error retrieving data: {e}")
            # If database error, try to reconnect
            if "connection" in str(e).lower():
                self.check_db_connection()
            
            return control_pb2.DataResponse(
                estado="ERROR",
                valores=[0, 0, 0, 0, 0]
            )
    
    def SendData(self, request, context):
        """Store data in PostgreSQL database"""
        print(f"server.py: SendData request received: {request}")
        try:
            # Ensure database connection is active
            if not self.check_db_connection():
                return control_pb2.Response(success=False, recibido=request.mensaje)
            
            # Parse the value from mensaje
            try:
                value = int(request.mensaje)
            except ValueError:
                print(f"Invalid value format: {request.mensaje}")
                return control_pb2.Response(success=False, recibido=f"Invalid value: {request.mensaje}")
            
            # Insert data into database
            cursor = self.db_connection.cursor()
            cursor.execute("""
                INSERT INTO sensor_data (value)
                VALUES (%s) RETURNING id, timestamp
            """, (value,))
            result = cursor.fetchone()
            self.db_connection.commit()
            cursor.close()
            
            record_id = result[0]
            timestamp = result[1]
            print(f"Stored value {value} with ID {record_id} at {timestamp}")
            
            return control_pb2.Response(
                success=True, 
                recibido=f"Stored value {value} with ID {record_id}"
            )
        except Exception as e:
            print(f"Error storing data: {e}")
            # If database error, try to reconnect
            if "connection" in str(e).lower():
                self.check_db_connection()
            
            return control_pb2.Response(
                success=False, 
                recibido=f"Error: {str(e)}"
            )
    
    def GetHistoricalData(self, request, context):
        """Retrieve historical data from PostgreSQL database"""
        print(f"server.py: GetHistoricalData request received: {request}")
        try:
            # Ensure database connection is active
            if not self.check_db_connection():
                return control_pb2.HistoricalDataResponse(success=False, data=[])
            
            cursor = self.db_connection.cursor()
            
            # Parse the time range
            time_filter = "1 day"  # Default 24h
            if request.timeRange == "1h":
                time_filter = "1 hour"
            elif request.timeRange == "6h":
                time_filter = "6 hours"
            elif request.timeRange == "7d":
                time_filter = "7 days"
            elif request.timeRange == "30d":
                time_filter = "30 days"
            
            if request.timeRange == "all":
                # Get all data (with reasonable limit)
                cursor.execute("""
                    SELECT value, timestamp, server FROM sensor_data
                    ORDER BY timestamp DESC
                    LIMIT 1000
                """)
            else:
                # Get data within time range
                cursor.execute("""
                    SELECT value, timestamp, server FROM sensor_data
                    WHERE timestamp > NOW() - INTERVAL %s
                    ORDER BY timestamp DESC
                """, (time_filter,))
            
            results = cursor.fetchall()
            cursor.close()
            
            # Format the response
            data_items = []
            for row in results:
                item = control_pb2.HistoricalDataItem(
                    value=row[0],
                    timestamp=row[1].isoformat(),
                    server=row[2] if row[2] else "main-server"
                )
                data_items.append(item)
            
            print(f"Returning {len(data_items)} historical data points")
            return control_pb2.HistoricalDataResponse(
                success=True,
                data=data_items
            )
        except Exception as e:
            print(f"Error retrieving historical data: {e}")
            # If database error, try to reconnect
            if "connection" in str(e).lower():
                self.check_db_connection()
            
            return control_pb2.HistoricalDataResponse(
                success=False,
                data=[]
            )
    
    def StreamData(self, request, context):
        """Stream data updates to the client"""
        client_id = context.peer()
        #client_id = request.clientId
        interval_ms = request.interval if request.interval > 0 else 5000  # Default 5 seconds
        print(f"New streaming client connected: {client_id}, interval: {interval_ms}ms")
        
        # Create a queue for this client
        import queue
        client_queue = queue.Queue()
        
        # Register the client
        with self.client_lock:
            self.streaming_clients[client_id] = {
                'interval': interval_ms,
                'last_update': 0,  # 0 means send immediately
                'queue': client_queue
            }
        
        # Send initial data
        initial_data = self.GetData(control_pb2.DataRequest(mensaje="initial", interval=interval_ms), context)
        yield initial_data
        
        # Set up cleanup callback
        def on_rpc_done():
            print(f"Streaming client disconnected: {client_id}")
            with self.client_lock:
                if client_id in self.streaming_clients:
                    del self.streaming_clients[client_id]
        
        context.add_callback(on_rpc_done)
        
        # Start background thread for this client
        client_thread = threading.Thread(
            target=self.handle_client_stream,
            args=(client_id, client_queue, interval_ms, context),
            daemon=True
        )
        client_thread.start()
        
        # Wait for updates from the queue and yield them to the client
        try:
            while not context.is_active():
                try:
                    # Get the next update, with timeout
                    update = client_queue.get(timeout=0.5)
                    print(f"Sending update to client {client_id}: {update.valores}")
                    yield update
                except queue.Empty:
                    # No update available, check if context is still active
                    if not context.is_active():
                        break
                    continue
        except Exception as e:
            print(f"Error in StreamData for client {client_id}: {e}")
        finally:
            # Clean up on exit
            with self.client_lock:
                if client_id in self.streaming_clients:
                    del self.streaming_clients[client_id]
            print(f"StreamData for client {client_id} has ended")
    
    def handle_client_stream(self, client_id, client_queue, interval_ms, context):
        """Periodically fetch and queue data for a specific client"""
        interval_seconds = interval_ms / 1000
        
        while context.is_active():
            try:
                start_time = time.time()
                
                # Only proceed if enough time has passed since the last update
                with self.client_lock:
                    if client_id not in self.streaming_clients:
                        # Client was removed, exit the thread
                        break
                    
                    client_info = self.streaming_clients[client_id]
                    time_since_update = start_time - client_info['last_update']
                    
                    if time_since_update < interval_seconds:
                        # Not time for an update yet
                        sleep_time = max(0.1, interval_seconds - time_since_update)
                        time.sleep(sleep_time)
                        continue
                
                # Time for an update - fetch the latest data
                if not self.check_db_connection():
                    time.sleep(1)  # Wait before retrying
                    continue
                
                cursor = self.db_connection.cursor()
                limit = max(5, min(20, int(30000 / interval_ms)))
                cursor.execute("""
                    SELECT value FROM sensor_data
                    ORDER BY timestamp DESC
                    LIMIT %s
                """, (limit,))
                results = cursor.fetchall()
                cursor.close()
                
                # Extract values from results
                values = [row[0] for row in results]
                while len(values) < 5:
                    values.append(0)
                
                # Create a response
                data_response = control_pb2.DataResponse(
                    estado="OK",
                    valores=values,
                    timestamp=int(time.time())
                )
                
                # Queue the update for the client
                with self.client_lock:
                    if client_id in self.streaming_clients:
                        self.streaming_clients[client_id]['queue'].put(data_response)
                        self.streaming_clients[client_id]['last_update'] = time.time()
                        print(f"Queued periodic update for client {client_id} with values {values}")
                
                # Sleep until the next update is due
                time.sleep(interval_seconds)
                
            except Exception as e:
                print(f"Error handling stream for client {client_id}: {e}")
                time.sleep(1)  # Wait before retrying
                
                # If database connection error, try to reconnect
                if "connection" in str(e).lower():
                    self.check_db_connection()


        


def serve():
    """Start the gRPC server"""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    control_pb2_grpc.add_ControlServiceServicer_to_server(ControlServiceServicer(), server)
    server_address = '[::]:50051'
    server.add_insecure_port(server_address)
    server.start()
    print(f"gRPC Server running on {server_address}")
    try:
        # Keep the server running until interrupted
        while True:
            time.sleep(86400)  # 1 day in seconds
    except KeyboardInterrupt:
        print("Server shutting down...")
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