#include <boost/asio.hpp>
#include <iostream>
#include <thread>

using boost::asio::ip::tcp;

void session(tcp::socket socket) {
    try {
        char data[1024];
        while (true) {
            std::size_t length = socket.read_some(boost::asio::buffer(data));
            std::cout << "Received: " << std::string(data, length) << std::endl;
            
            // Lógica de reenvío: se conecta directamente a la IP fija del contenedor destino
            boost::asio::io_context io_context;
            tcp::endpoint destination_endpoint(
                boost::asio::ip::address::from_string("10.89.0.20"), 6000);
            tcp::socket forward_socket(io_context);
            forward_socket.connect(destination_endpoint);
            boost::asio::write(forward_socket, boost::asio::buffer(data, length));
        }
    } catch (std::exception& e) {
        std::cerr << "Exception: " << e.what() << "\n";
    }
}

int main() {
    try {
        boost::asio::io_context io_context;
        tcp::acceptor acceptor(io_context, tcp::endpoint(tcp::v4(), 5000));
        
        while (true) {
            tcp::socket socket(io_context);
            acceptor.accept(socket);
            std::thread(session, std::move(socket)).detach();
        }
    } catch (std::exception& e) {
        std::cerr << "Exception: " << e.what() << "\n";
    }
    return 0;
}
