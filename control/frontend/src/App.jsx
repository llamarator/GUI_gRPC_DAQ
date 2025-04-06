import { useEffect, useState } from "react";
import axios from "./api";
import { Line, Bar, Pie } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip } from "chart.js";

// Registrar todos los módulos necesarios
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip);

function App() {
  console.log("Inicio de app");
  
  const [data, setData] = useState([10, 20, 30, 40, 50]); // Valores predeterminados
  const [ip, setIp] = useState(""); // Dirección IP
  const [port, setPort] = useState(""); // Puerto
  const [inputValue, setInputValue] = useState(""); // Valor de entrada para enviar

  useEffect(() => {
    console.log("Inicio de useEffect");
    
    const fetchData = () => {
      axios.get("/data")
        .then((response) => {
          console.log("Datos obtenidos:", response.data);
          setData(response.data.valores);
        })
        .catch((error) => {
          console.error("Error al obtener los datos:", error);
        });
    };

    fetchData(); // Llamar a la API al inicio

  // Simular datos en tiempo real cada 2 segundos
  const interval = setInterval(() => {
    axios.get("/data") // Hacer una nueva petición cada 2 segundos
      .then((response) => {
        console.log("Actualización en tiempo real:", response.data);
        setData(response.data.valores); // Actualizar los datos con los nuevos valores del backend
      })
      .catch((error) => {
        console.error("Error al obtener datos en tiempo real:", error);
      });
  }, 2000);

    return () => clearInterval(interval);
  }, []);

  // 🔹 Configuración del gráfico de líneas
  const lineChartData = {
    labels: data.map((_, i) => i + 1),
    datasets: [
      {
        label: "Valores en Tiempo Real",
        data: data,
        borderColor: "blue",
        backgroundColor: "rgba(0, 0, 255, 0.2)",
        borderWidth: 2,
        fill: false,
      },
    ],
  };

  // 🔹 Configuración del gráfico de barras
  const barChartData = {
    labels: data.map((_, i) => i + 1),
    datasets: [
      {
        label: "Datos de barras",
        data: data,
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  // 🔹 Configuración del gráfico de pastel
  const pieChartData = {
    labels: ["A", "B", "C", "D", "E"],
    datasets: [
      {
        data: data.slice(-5), // Solo los últimos 5 valores
        backgroundColor: ["red", "blue", "yellow", "green", "purple"],
      },
    ],
  };

  // 🔹 Cargar datos desde el servidor
  const loadDataFromServer = () => {
    axios.get(`/data?ip=${ip}&port=${port}`)
      .then(response => {
        console.log("Datos cargados desde el servidor:", response.data);
        setData(response.data.valores);
      })
      .catch(error => {
        console.error("Error al cargar datos desde el servidor:", error);
      });
  };

  // 🔹 Enviar datos al servidor
  const sendDataToServer = () => {
    if (ip && port && inputValue) {
      axios.post(`/sendData`, { ip, port, data: inputValue })
        .then(response => console.log("Datos enviados correctamente:", response.data))
        .catch(error => console.error("Error al enviar datos al servidor:", error));
    } else {
      console.error("Faltan campos requeridos");
    }
  };

  // 🔹 Limpiar los datos
  const clearData = () => {
    setData([]);
    console.log("Datos limpiados");
  };

  return (
    <div style={{ maxWidth: "900px", margin: "auto", textAlign: "center", padding: "20px" }}>
      <h1>📊 Control Panel</h1>

      {/* Gráfico de líneas */}
      <div style={{ background: "#f8f9fa", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
        <h3>📈 Gráfico de Líneas</h3>
        <Line data={lineChartData} />
      </div>

      {/* Gráfico de barras */}
      <div style={{ background: "#e3f2fd", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
        <h3>📊 Gráfico de Barras</h3>
        <Bar data={barChartData} />
      </div>

      {/* Gráfico de pastel */}
      <div style={{ background: "#fce4ec", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
        <h3>🥧 Gráfico de Pastel</h3>
        <Pie data={pieChartData} />
      </div>

      {/* Tabla de valores */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr style={{ background: "#007bff", color: "white" }}>
            <th>#</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(-10).map((value, index) => (
            <tr key={index} style={{ background: index % 2 === 0 ? "#f1f1f1" : "#ffffff" }}>
              <td>{data.length - 10 + index + 1}</td>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Botones de acción */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={loadDataFromServer} style={{ marginRight: "10px" }}>📥 Cargar Datos</button>
        <button onClick={clearData} style={{ background: "#dc3545", color: "white" }}>🧹 Limpiar Datos</button>
      </div>

      {/* Sección para enviar datos */}
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
        <input type="text" placeholder="IP del servidor" value={ip} onChange={(e) => setIp(e.target.value)} />
        <input type="text" placeholder="Puerto" value={port} onChange={(e) => setPort(e.target.value)} />
        <input type="text" placeholder="Valor" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
        <button onClick={sendDataToServer}>🚀 Enviar Datos</button>
      </div>
    </div>
  );
}

export default App;





// import { useEffect, useState } from "react";
// import axios from "./api";
// import { Line } from "react-chartjs-2";
// import { Chart, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
// Chart.register(CategoryScale, LinearScale, PointElement, LineElement);

// function App() {
//   console.log("Inicio de app");
//   const [data, setData] = useState([10, 20, 30, 40, 50]); // Valores predeterminados
//   const [ip, setIp] = useState(""); // Dirección IP
//   const [port, setPort] = useState(""); // Puerto
//   const [inputValue, setInputValue] = useState(""); // Valor de entrada para enviar

//   useEffect(() => {
//     console.log("Inicio de useEffect");
    
//     // Obtener datos iniciales (solo si la API es accesible)
//     axios
//       .get("/data")
//       .then((response) => {
//         console.log("Datos obtenidos:", response.data);
//         setData(response.data.valores);  // Asegúrate de que la estructura sea correcta
//       })
//       .catch((error) => {
//         console.error("Error al obtener los datos:", error);
//       });

//     // Simular datos en tiempo real cada 2s
//     const interval = setInterval(() => {
//       console.log("Nuevo valor aleatorio");
//       setData((prevData) => [...prevData, Math.floor(Math.random() * 100)]);
//     }, 2000);

//     return () => clearInterval(interval); // Limpieza del intervalo
//   }, []);

//   const chartData = {
//     labels: data.map((_, i) => i + 1),
//     datasets: [
//       {
//         label: "Valores en Tiempo Real",
//         data: data,
//         borderColor: "blue",
//         borderWidth: 2,
//         fill: false,
//       },
//     ],
//   };

//   // Función para manejar la carga de datos desde un servidor SQL
//   const loadDataFromServer = () => {
//     axios.get(`/data?ip=${ip}&port=${port}`)
//       .then(response => {
//         console.log("Datos cargados desde el servidor:", response.data);
//         setData(response.data.valores);  // Asume que el servidor devuelve un formato similar
//       })
//       .catch(error => {
//         console.error("Error al cargar datos desde el servidor:", error);
//       });
//   };

//   // Función para enviar datos al servidor
//   const sendDataToServer = () => {
//     if (ip && port && inputValue) {
//       axios.post(`/sendData`, {
//         ip,
//         port,
//         data: inputValue
//       })
//       .then(response => {
//         console.log("Datos enviados correctamente:", response.data);
//       })
//       .catch(error => {
//         console.error("Error al enviar datos al servidor:", error);
//       });
//     } else {
//       console.error("Faltan campos requeridos");
//     }
//   };

//   // Ajuste automático de tamaño
//   const resizeHandler = () => {
//     // Aquí se podrían añadir cálculos adicionales si deseas ajustar otras propiedades de tamaño
//     console.log("Redimensionando ventana");
//   };

//   useEffect(() => {
//     window.addEventListener('resize', resizeHandler);
//     return () => {
//       window.removeEventListener('resize', resizeHandler);
//     };
//   }, []);

//   return (
//     <div style={{ maxWidth: "800px", margin: "auto", textAlign: "center", padding: "20px" }}>
//       <h1>📊 Control Panel</h1>

//       {/* Gráfico de líneas */}
//       <div style={{ background: "#f8f9fa", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
//         <Line data={chartData} />
//       </div>

//       {/* Tabla de valores */}
//       <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
//         <thead>
//           <tr style={{ background: "#007bff", color: "white" }}>
//             <th>#</th>
//             <th>Valor</th>
//           </tr>
//         </thead>
//         <tbody>
//           {data.slice(-10).map((value, index) => (
//             <tr key={index} style={{ background: index % 2 === 0 ? "#f1f1f1" : "#ffffff" }}>
//               <td>{data.length - 10 + index + 1}</td>
//               <td>{value}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Botón para cargar datos desde el servidor */}
//       <div style={{ marginTop: "20px" }}>
//         <button onClick={loadDataFromServer}>Cargar Datos del Servidor SQL</button>
//       </div>

//       {/* Sección para enviar datos */}
//       <div style={{ marginTop: "20px" }}>
//         <input
//           type="text"
//           placeholder="IP del servidor"
//           value={ip}
//           onChange={(e) => setIp(e.target.value)}
//           style={{ marginRight: "10px" }}
//         />
//         <input
//           type="text"
//           placeholder="Puerto"
//           value={port}
//           onChange={(e) => setPort(e.target.value)}
//           style={{ marginRight: "10px" }}
//         />
//         <input
//           type="text"
//           placeholder="Valor para enviar"
//           value={inputValue}
//           onChange={(e) => setInputValue(e.target.value)}
//           style={{ marginRight: "10px" }}
//         />
//         <button onClick={sendDataToServer}>Enviar Datos al Servidor</button>
//       </div>
//     </div>
//   );
// }

// export default App;


//  funcional
// import { useEffect, useState } from "react";
// import axios from "./api";
// import { Line } from "react-chartjs-2";
// import { Chart, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
// Chart.register(CategoryScale, LinearScale, PointElement, LineElement);


// function App() {
//   console.log("Inicio de app");
//   const [data, setData] = useState([10, 20, 30, 40, 50]); // Valores predeterminados
//   console.log("Inicio de app datos asignados");

//   useEffect(() => {
//     console.log("Inicio de useEffect");
    
//     // Obtener datos iniciales (solo si la API es accesible)
//     axios
//       .get("/data")
//       .then((response) => {
//         console.log("Datos obtenidos:", response.data);
//         setData(response.data.valores);  // Asegúrate de que la estructura sea correcta
//       })
//       .catch((error) => {
//         console.error("Error al obtener los datos:", error);
//       });

//     // Simular datos en tiempo real cada 2s
//     const interval = setInterval(() => {
//       console.log("Nuevo valor aleatorio");
//       setData((prevData) => [...prevData, Math.floor(Math.random() * 100)]);
//     }, 2000);

//     return () => clearInterval(interval); // Limpieza del intervalo
//   }, []);

//   const chartData = {
//     labels: data.map((_, i) => i + 1),
//     datasets: [
//       {
//         label: "Valores en Tiempo Real",
//         data: data,
//         borderColor: "blue",
//         borderWidth: 2,
//         fill: false,
//       },
//     ],
//   };

//   return (
//     <div style={{ maxWidth: "800px", margin: "auto", textAlign: "center", padding: "20px" }}>
//       <h1>📊 Control Panel</h1>

//       {/* Gráfico de líneas */}
//       <div style={{ background: "#f8f9fa", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
//         <Line data={chartData} />
//       </div>

//       {/* Tabla de valores */}
//       <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
//         <thead>
//           <tr style={{ background: "#007bff", color: "white" }}>
//             <th>#</th>
//             <th>Valor</th>
//           </tr>
//         </thead>
//         <tbody>
//           {data.slice(-10).map((value, index) => (
//             <tr key={index} style={{ background: index % 2 === 0 ? "#f1f1f1" : "#ffffff" }}>
//               <td>{data.length - 10 + index + 1}</td>
//               <td>{value}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// export default App;

 



/*
import { useEffect, useState } from "react";
import axios from "./api";
import { Line } from "react-chartjs-2";

function App() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios
    .get("/data")
    .then((response) => {
      setData(response.data.valores);
    })
    .catch((error) => {
      console.error("Error al obtener los datos:", error);
    });
    console.log("App.jsx: useEffect")
  }, []);

  const chartData = {
    labels: data.map((_, i) => i + 1),
    datasets: [
      {
        label: "Valores recibidos",
        data: data,
        borderColor: "blue",
        borderWidth: 2,
        fill: false,
      },
    ],
  };

  return (
    <div>
      <h1>Panel de Control</h1>
      <Line data={chartData} />
    </div>
  );
}

export default App;
*/

// previous

/*
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
*/