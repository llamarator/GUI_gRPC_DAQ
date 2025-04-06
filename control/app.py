from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return """
    <html>
      <head>
        <title>Control Panel</title>
      </head>
      <body>
        <h1>Bienvenido al Panel de Control</h1>
        <p>Aquí podrás ver los datos recibidos y enviar comandos.</p>
      </body>
    </html>
    """

@app.route('/api/data', methods=['GET'])
def get_data():
    # Simulación de consulta de datos (por ejemplo, desde el servidor SQL)
    datos = {
        'estado': 'OK',
        'valores': [1, 2, 3, 4, 5]
    }
    return jsonify(datos)

@app.route('/api/send', methods=['POST'])
def send_data():
    # Recibe y procesa datos enviados desde el panel
    contenido = request.json
    # Aquí podrías reenviar el contenido al gateway o procesarlo
    return jsonify({'success': True, 'recibido': contenido})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
