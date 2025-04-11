#include <boost/asio.hpp>
#include <iostream>
#include <thread>
#include <string>
#include <map>
#include <regex>
#include <memory>
#include <set>  // Added missing include for std::set

using boost::asio::ip::tcp;

// Forward declarations with complete class definition
class Session;
class SessionManager;

// Structure to define container endpoints
struct ContainerEndpoint {
    std::string ip;
    unsigned short port;
};

// Router configuration
class RouterConfig {
public:
    RouterConfig() {
        // Define container endpoints
        containers["backend"] = {"172.90.0.10", 8000};   // FastAPI backend
        containers["frontend"] = {"172.90.0.20", 3000};  // Frontend
        containers["database"] = {"172.90.0.40", 5432};  // PostgreSQL
        containers["grpc"] = {"172.90.0.30", 50051};     // gRPC service
        
        // Define which ports route to which services
        portMappings[80] = "frontend";   // HTTP traffic to frontend
        portMappings[443] = "frontend";  // HTTPS traffic to frontend
        portMappings[8000] = "backend";  // Direct backend access
        portMappings[5432] = "database"; // Direct database access
        portMappings[50051] = "grpc";    // Direct gRPC access
    }
    
    ContainerEndpoint getEndpointForPort(unsigned short port) {
        if (portMappings.find(port) != portMappings.end()) {
            std::string service = portMappings[port];
            return containers[service];
        }
        // Default to frontend if port not found
        return containers["frontend"];
    }
    
    // Parse HTTP requests to route based on path
    ContainerEndpoint getEndpointForHttpRequest(const std::string& request) {
        // Check if the request is for API endpoints
        std::regex apiPattern("(GET|POST|PUT|DELETE|PATCH) /api/");
        if (std::regex_search(request, apiPattern)) {
            return containers["backend"];
        }
        
        // Check for specific paths
        std::regex grpcPattern("(GET|POST) /grpc/");
        if (std::regex_search(request, grpcPattern)) {
            return containers["grpc"];
        }
        
        // Default to frontend for all other HTTP requests
        return containers["frontend"];
    }
    
private:
    std::map<std::string, ContainerEndpoint> containers;
    std::map<unsigned short, std::string> portMappings;
};

// Session class to handle client connections - MOVED UP before SessionManager
class Session : public std::enable_shared_from_this<Session> {
public:
    Session(tcp::socket socket, RouterConfig& config, SessionManager& manager);
    
    void start();
    
private:
    void determineDestination();
    void connectToContainer(const ContainerEndpoint& endpoint, const std::string& initialData, std::size_t length);
    void readFromClient();
    void readFromContainer();
    
    tcp::socket client_socket_;
    tcp::socket container_socket_;
    RouterConfig& config_;
    SessionManager& manager_;
    std::vector<char> client_buffer_;
    std::vector<char> container_buffer_;
};

// Session manager to keep track of active sessions
class SessionManager {
public:
    void start(std::shared_ptr<Session> session) {
        sessions.insert(session);
        session->start();
    }
    
    void stop(std::shared_ptr<Session> session) {
        sessions.erase(session);
    }
    
private:
    std::set<std::shared_ptr<Session>> sessions;
};

// Now we can implement Session methods with SessionManager fully defined
Session::Session(tcp::socket socket, RouterConfig& config, SessionManager& manager)
    : client_socket_(std::move(socket)),
      container_socket_(client_socket_.get_executor()),
      config_(config),
      manager_(manager),
      client_buffer_(8192),
      container_buffer_(8192) {
}

void Session::start() {
    determineDestination();
}

void Session::determineDestination() {
    auto self = shared_from_this();
    
    // First read data from client to determine routing
    client_socket_.async_read_some(
        boost::asio::buffer(client_buffer_),
        [this, self](boost::system::error_code ec, std::size_t length) {
            if (!ec) {
                std::string request(client_buffer_.begin(), client_buffer_.begin() + length);
                ContainerEndpoint endpoint;
                
                // If it's HTTP traffic, route based on the request
                if (request.find("HTTP/") != std::string::npos) {
                    endpoint = config_.getEndpointForHttpRequest(request);
                } else {
                    // Otherwise route based on the incoming port
                    endpoint = config_.getEndpointForPort(client_socket_.remote_endpoint().port());
                }
                
                std::cout << "Routing request to " << endpoint.ip << ":" << endpoint.port << std::endl;
                
                // Connect to the container
                connectToContainer(endpoint, request, length);
            } else {
                manager_.stop(shared_from_this());
            }
        });
}

void Session::connectToContainer(const ContainerEndpoint& endpoint, const std::string& initialData, std::size_t length) {
    auto self = shared_from_this();
    
    // Connect to the container
    tcp::endpoint destination(
        boost::asio::ip::address::from_string(endpoint.ip),
        endpoint.port
    );
    
    container_socket_.async_connect(
        destination,
        [this, self, length](const boost::system::error_code& ec) {
            if (!ec) {
                // Forward the initial data
                boost::asio::async_write(
                    container_socket_,
                    boost::asio::buffer(client_buffer_, length),
                    [this, self](boost::system::error_code ec, std::size_t /*length*/) {
                        if (!ec) {
                            // Start bidirectional forwarding
                            readFromClient();
                            readFromContainer();
                        } else {
                            manager_.stop(shared_from_this());
                        }
                    });
            } else {
                std::cerr << "Failed to connect to container: " << ec.message() << std::endl;
                manager_.stop(shared_from_this());
            }
        });
}

void Session::readFromClient() {
    auto self = shared_from_this();
    
    client_socket_.async_read_some(
        boost::asio::buffer(client_buffer_),
        [this, self](boost::system::error_code ec, std::size_t length) {
            if (!ec) {
                boost::asio::async_write(
                    container_socket_,
                    boost::asio::buffer(client_buffer_, length),
                    [this, self](boost::system::error_code ec, std::size_t /*length*/) {
                        if (!ec) {
                            readFromClient();
                        } else {
                            manager_.stop(shared_from_this());
                        }
                    });
            } else {
                manager_.stop(shared_from_this());
            }
        });
}

void Session::readFromContainer() {
    auto self = shared_from_this();
    
    container_socket_.async_read_some(
        boost::asio::buffer(container_buffer_),
        [this, self](boost::system::error_code ec, std::size_t length) {
            if (!ec) {
                boost::asio::async_write(
                    client_socket_,
                    boost::asio::buffer(container_buffer_, length),
                    [this, self](boost::system::error_code ec, std::size_t /*length*/) {
                        if (!ec) {
                            readFromContainer();
                        } else {
                            manager_.stop(shared_from_this());
                        }
                    });
            } else {
                manager_.stop(shared_from_this());
            }
        });
}

// Main server class
class Router {
public:
    Router(boost::asio::io_context& io_context, const tcp::endpoint& endpoint)
        : acceptor_(io_context, endpoint) {
        startAccept();
    }
    
private:
    void startAccept() {
        acceptor_.async_accept(
            [this](boost::system::error_code ec, tcp::socket socket) {
                if (!ec) {
                    std::cout << "Accepted connection from " 
                              << socket.remote_endpoint().address().to_string() 
                              << ":" << socket.remote_endpoint().port() << std::endl;
                    
                    auto session = std::make_shared<Session>(std::move(socket), config_, manager_);
                    manager_.start(session);
                }
                
                startAccept();
            });
    }
    
    tcp::acceptor acceptor_;
    RouterConfig config_;
    SessionManager manager_;
};

int main() {
    try {
        boost::asio::io_context io_context;
        
        // Define the router's IP and port to listen on
        std::string router_ip = "0.0.0.0";  // Listen on all interfaces
        unsigned short router_port = 80;    // HTTP port
        
        tcp::endpoint endpoint(
            boost::asio::ip::address::from_string(router_ip),
            router_port
        );
        
        Router router(io_context, endpoint);
        
        std::cout << "Router started on " << router_ip << ":" << router_port << std::endl;
        std::cout << "Configure your firewall to allow this port and forward external traffic here" << std::endl;
        
        // Run the io_context with multiple threads for better performance
        const int num_threads = 4;
        std::vector<std::thread> threads;
        for (int i = 0; i < num_threads - 1; ++i) {
            threads.emplace_back([&io_context]() { io_context.run(); });
        }
        
        io_context.run();
        
        // Wait for all threads to complete
        for (auto& thread : threads) {
            thread.join();
        }
    } catch (std::exception& e) {
        std::cerr << "Exception: " << e.what() << std::endl;
    }
    
    return 0;
}