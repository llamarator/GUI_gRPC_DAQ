import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from "react-chartjs-2";
import { RefreshCw, Database, Send, Play, Square, Trash2, Clock, Settings, List, DownloadCloud, Plus, Layers,ChevronDown } from 'lucide-react';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const NetworkMonitoringDashboard = () => {
  // State for data and configuration
  const [data, setData] = useState([
    { time: '00:00', value: 42 },
    { time: '00:05', value: 47 },
    { time: '00:10', value: 53 },
    { time: '00:15', value: 49 },
    { time: '00:20', value: 58 }
  ]);
  const [ip, setIp] = useState('localhost');
  const [port, setPort] = useState('8000');
  const [inputValue, setInputValue] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [notification, setNotification] = useState(null);
  const [status, setStatus] = useState({
    state: isMonitoring ? 'active' : 'inactive',
    message: isMonitoring ? 'Monitoring' : 'Stopped'
  });
  const [stats, setStats] = useState({
    currentSpeed: data.length > 0 ? data[data.length - 1].value : '0',
    peakSpeed: data.length > 0 ? Math.max(...data.map(item => item.value)) : '0',
    averageSpeed: data.length > 0 ? (data.reduce((sum, item) => sum + item.value, 0) / data.length).toFixed(1) : '0',
    lastUpdated: 'Never'
  });
  const [activeTab, setActiveTab] = useState('live');
  // State for update interval configuration
  const [updateInterval, setUpdateInterval] = useState(5000); // 5 seconds default
  const [showSettings, setShowSettings] = useState(false);
  // New state for historical data view
  const [showHistoricalData, setShowHistoricalData] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [historicalDataLoading, setHistoricalDataLoading] = useState(false);
  const [historyTimeRange, setHistoryTimeRange] = useState('24h'); // Default to last 24 hours

  const [samples, setSamples] = useState([]);
  const [activeSample, setActiveSample] = useState(null);
  const [sampleName, setSampleName] = useState('');
  const [showNewSampleModal, setShowNewSampleModal] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState([]);



  // References
  const monitoringInterval = useRef(null);
  const ws = useRef(null);

  // API URL
  const apiBaseUrl = `http://${ip}:${port}`;
  const wsBaseUrl = `ws://${ip}:${port}`;

  // Show notification
  const showNotification = useCallback((message, type) => {
    setNotification({ message, type });
    
    // Auto-hide notification after 3 seconds
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  // Clear data
  const clearData = useCallback(() => {
    setData([]);
    setStats({
      currentSpeed: 0,
      peakSpeed: 0,
      averageSpeed: 0,
      lastUpdated: 'Cleared'
    });
    showNotification('Data cleared', 'info');
  }, [showNotification]);

    // Helper function to update statistics
    const updateStatistics = useCallback((dataToProcess) => {
      const numericValues = dataToProcess.map(item => item.value).filter(val => !isNaN(val));
      
      if (numericValues.length > 0) {
        const currentValue = numericValues[numericValues.length - 1];
        const peakValue = Math.max(...numericValues);
        const avgValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        
        setStats({
          currentSpeed: currentValue,
          peakSpeed: peakValue,
          averageSpeed: avgValue.toFixed(1),
          lastUpdated: new Date().toLocaleTimeString()
        });
      }
    }, []);

  const startNewSample = useCallback(async () => {
    if (!sampleName) {
      showNotification('Please enter a name for the sample', 'error');
      return;
    }
    
    showNotification('Saving current sample and starting new...', 'info');
    
    try {
      // Save current data as a sample
      const response = await fetch(`${apiBaseUrl}/samples/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sampleName,
          data: data,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        showNotification(`Sample "${sampleName}" saved successfully!`, 'success');
        setShowNewSampleModal(false);
        setSampleName('');
        clearData(); // Clear current data to start fresh
        loadSamples(); // Refresh the samples list
      } else {
        showNotification('Failed to save sample', 'error');
      }
    } catch (error) {
      showNotification(`Error saving sample: ${error.message}`, 'error');
      console.error("API Error:", error);
    }
  }, [apiBaseUrl, sampleName, data, showNotification, clearData]);

// 4. Function to load available samples
const loadSamples = useCallback(async () => {
  showNotification('Loading available samples...', 'info');
  
  try {
    const response = await fetch(`${apiBaseUrl}/samples/list`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.samples) {
      setSamples(result.samples);
      showNotification(`${result.samples.length} samples loaded`, 'success');
    } else {
      showNotification('No samples available', 'info');
      setSamples([]);
    }
  } catch (error) {
    showNotification(`Error loading samples: ${error.message}`, 'error');
    console.error("API Error:", error);
  }
}, [apiBaseUrl, showNotification]);

// 5. Function to load a specific sample
const loadSample = useCallback(async (sampleId) => {
  showNotification(`Loading sample ${sampleId}...`, 'info');
  
  try {
    const response = await fetch(`${apiBaseUrl}/samples/${sampleId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.data) {
      // If in compare mode, add to selected samples
      if (compareMode) {
        setSelectedSamples(prev => {
          // Check if already selected
          if (prev.some(s => s.id === result.id)) {
            return prev;
          }
          // Add to selection (limit to 3 for comparison)
          return [...prev, result].slice(0, 3);
        });
      } else {
        // Normal mode - replace current data
        setData(result.data);
        setActiveSample(result);
        updateStatistics(result.data);
        showNotification(`Sample "${result.name}" loaded successfully!`, 'success');
      }
    } else {
      showNotification('Sample data not found', 'error');
    }
  } catch (error) {
    showNotification(`Error loading sample: ${error.message}`, 'error');
    console.error("API Error:", error);
  }
}, [apiBaseUrl, showNotification, compareMode, updateStatistics]);



// 6. Function to delete a sample
const deleteSample = useCallback(async (sampleId) => {
  if (!confirm('Are you sure you want to delete this sample?')) {
    return;
  }
  
  showNotification(`Deleting sample ${sampleId}...`, 'info');
  
  try {
    const response = await fetch(`${apiBaseUrl}/samples/${sampleId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      showNotification('Sample deleted successfully!', 'success');
      // Update samples list
      setSamples(samples.filter(sample => sample.id !== sampleId));
      // If active sample was deleted, clear it
      if (activeSample && activeSample.id === sampleId) {
        setActiveSample(null);
        clearData();
      }
    } else {
      showNotification('Failed to delete sample', 'error');
    }
  } catch (error) {
    showNotification(`Error deleting sample: ${error.message}`, 'error');
    console.error("API Error:", error);
  }
}, [apiBaseUrl, showNotification, samples, activeSample, clearData]);


// 7. Load samples on component mount and when switching to the samples tab
useEffect(() => {
  if (activeTab === 'samples') {
    loadSamples();
  }
}, [activeTab, loadSamples]);


  // Function to append new data values to existing data (instead of replacing it)
  const appendDataValues = useCallback((newValues) => {
    if (!newValues || newValues.length === 0) return;
    
    const now = new Date();
    const processedNewValues = newValues.map((value) => {
      return {
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: typeof value === 'number' ? value : parseFloat(value)
      };
    });
    
    // Append new values to existing data
    setData(currentData => [...currentData, ...processedNewValues]);
    
    // Update statistics
    updateStatistics([...data, ...processedNewValues]);
  }, [data]);

  // Function to replace data with new values
  const updateDataWithNewValues = useCallback((values) => {
    if (!values || values.length === 0) return;
    
    const now = new Date();
    const newData = values.map((value, index) => {
      // Create timestamps spaced 5 minutes apart, with the last one being now
      const time = new Date(now - (values.length - index - 1) * 5 * 60000);
      return {
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        value: typeof value === 'number' ? value : parseFloat(value)
      };
    });
    
    setData(newData);
    
    // Update statistics
    updateStatistics(newData);
  }, []);


  // Fetch data from FastAPI backend
  const fetchDataFromServer = useCallback(async () => {
    showNotification('Fetching data from server...', 'info');
    
    try {
      const response = await fetch(`${apiBaseUrl}/data`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Data received from API:", result);
      
      if (result.valores && result.valores.length > 0) {
        // Update with values from API
        updateDataWithNewValues(result.valores);
        showNotification('Data fetched successfully!', 'success');
        setStatus({ state: 'active', message: result.estado || 'Online' });
      } else {
        showNotification('No data returned from server', 'info');
      }
    } catch (error) {
      showNotification(`Error fetching data: ${error.message}`, 'error');
      console.error("API Error:", error);
      setStatus({ state: 'inactive', message: 'Error' });
    }
  }, [apiBaseUrl, showNotification, updateDataWithNewValues]);

  // New function to fetch all historical data from SQL server
  const fetchHistoricalData = useCallback(async () => {
    setHistoricalDataLoading(true);
    showNotification('Fetching historical data from database...', 'info');
    
    try {
      const response = await fetch(`${apiBaseUrl}/history?timeRange=${historyTimeRange}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Historical data received:", result);
      
      if (result.data && result.data.length > 0) {
        // Format dates and sort by timestamp
        const formattedData = result.data.map(item => ({
          ...item,
          formattedTime: new Date(item.timestamp).toLocaleString()
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        setHistoricalData(formattedData);
        showNotification(`Loaded ${formattedData.length} historical records`, 'success');
      } else {
        setHistoricalData([]);
        showNotification('No historical data found for selected period', 'info');
      }
    } catch (error) {
      showNotification(`Error fetching historical data: ${error.message}`, 'error');
      console.error("Historical Data API Error:", error);
    } finally {
      setHistoricalDataLoading(false);
    }
  }, [apiBaseUrl, showNotification, historyTimeRange]);

  // Function to export historical data as CSV
  const exportHistoricalDataAsCSV = useCallback(() => {
    if (historicalData.length === 0) {
      showNotification('No data to export', 'error');
      return;
    }
    
    // Create CSV content
    const headers = ['Timestamp', 'Value (Mbps)', 'Server'];
    const rows = historicalData.map(item => [
      item.formattedTime, 
      item.value, 
      item.server || 'Unknown'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `network-data-${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Data exported successfully', 'success');
  }, [historicalData, showNotification]);

  // Function to send data to server
  const sendDataToServer = useCallback(async () => {
    if (!inputValue) {
      showNotification('Please enter a value to send', 'error');
      return;
    }
    
    showNotification('Sending data to server...', 'info');
    
    try {
      const response = await fetch(`${apiBaseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputValue),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Send result:", result);
      
      if (result.success) {
        showNotification('Data sent successfully!', 'success');
        setInputValue('');
        
        // No need to manually fetch data after sending - WebSocket will update it
      } else {
        showNotification('Server received message but reported failure', 'error');
      }
    } catch (error) {
      showNotification(`Error sending data: ${error.message}`, 'error');
      console.error("API Error:", error);
    }
  }, [apiBaseUrl, inputValue, showNotification]);

  // Function to generate random data for demo purposes
  const generateRandomData = useCallback(() => {
    // Create 1-5 random values between 30 and 90
    const count = Math.floor(Math.random() * 5) + 1; // Random count between 1 and 5
    const randomValues = Array(count).fill(0).map(() => Math.floor(Math.random() * 60) + 30);
    appendDataValues(randomValues); // Use append instead of update to demonstrate the dynamic data feature
    setStatus({ state: 'active', message: `Updated with ${count} values (Simulated)` });
  }, [appendDataValues]);

  // Initialize WebSocket connection
  const initWebSocket = useCallback(() => {
    // Close existing connection if any
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
      ws.current.close();
    }

    try {
      // Create a new WebSocket connection
      ws.current = new WebSocket(`${wsBaseUrl}/ws`);
      
      ws.current.onopen = () => {
        console.log('WebSocket connection established');
        showNotification('Real-time updates connected!', 'success');
        setStatus(prev => ({ ...prev, message: 'Connected (Real-time)' }));
      };
      
      ws.current.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          // Handle different types of messages
          if (data.type === 'update' && data.valores) {
            // Changed to appendDataValues to support dynamic number of values
            appendDataValues(data.valores);
            setStatus({ state: 'active', message: `Updated with ${data.valores.length} values (Real-time)` });
          } else if (data.type === 'notification') {
            showNotification(data.message, data.notificationType || 'info');
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      ws.current.onclose = (event) => {
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
        if (isMonitoring) {
          showNotification(`WebSocket closed (code: ${event.code}). Falling back to polling.`, 'info');
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        showNotification('WebSocket error. Falling back to polling.', 'error');
      };
      
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      showNotification('Could not establish real-time connection. Using polling instead.', 'error');
    }
  }, [wsBaseUrl, showNotification, appendDataValues, isMonitoring]);



  // Start real-time monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    setStatus({ state: 'active', message: 'Monitoring' });
    showNotification(`Real-time monitoring started (updates every ${updateInterval/1000}s)`, 'success');
    console.log("monitoring state:",isMonitoring)
    console.log("interval:",updateInterval)
    // Initialize WebSocket for real-time updates
    //initWebSocket();
    
    // Set up regular polling as fallback or primary method
    // monitoringInterval.current = setInterval(async () => {
    //   try {
    //     await fetchDataFromServer();
    //   } catch (error) {
    //     console.error("Polling error:", error);
    //     generateRandomData(); // Optional fallback
    //   }
    // }, updateInterval);

    monitoringInterval.current = setInterval(() => {
      fetchDataFromServer();

    }, updateInterval);
    
    // Initial fetch
    //fetchDataFromServer();
  }, [isMonitoring,fetchDataFromServer, updateInterval, showNotification, setStatus]);
//  }, [isMonitoring, fetchDataFromServer, initWebSocket, showNotification, updateInterval, generateRandomData]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    // if (!isMonitoring) {
    //   console.log("monitoring state in stopping function returned:")
    //   return;
    // }
    console.log("monitoring state in stopping function:",isMonitoring)
    setIsMonitoring(false);
    
    // Close WebSocket
    if (ws.current) {
      ws.current.close();
    }
    
    // Clear polling interval
    if (monitoringInterval.current) {
      clearInterval(monitoringInterval.current);
      monitoringInterval.current = null;
    }
    
    setStatus({ state: 'inactive', message: 'Stopped' });
    showNotification('Monitoring stopped', 'info');
  }, []);


  // Initialize on component mount
  useEffect(() => {
    fetchDataFromServer();
    return () => {
      // Clean up on component unmount
      if (monitoringInterval.current) {
        clearInterval(monitoringInterval.current);
      }
      
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [fetchDataFromServer]);

  // Update API URL when IP or port changes
  useEffect(() => {
    if (isMonitoring) {
      stopMonitoring();
      // Small delay to ensure clean state before restarting
      setTimeout(() => {
        startMonitoring();
      }, updateInterval);
    }
  }, [ip, port]);
//}, [ip, port, isMonitoring, startMonitoring, stopMonitoring]);

  // Update monitoring when update interval changes
  useEffect(() => {
    if (isMonitoring) {
      // Restart monitoring with new interval
      stopMonitoring();
      setTimeout(() => {
        startMonitoring();
      }, updateInterval);
    }
  }, [updateInterval]);
//}, [updateInterval, isMonitoring, startMonitoring, stopMonitoring]);

  // Add event listener for server-sent updates via postMessage (for iframe integrations)
  useEffect(() => {
    const handleExternalMessage = (event) => {
      // Validate the origin if needed
      
      try {
        const messageData = event.data;
        if (messageData && messageData.type === 'networkUpdate' && messageData.valores) {
          // Changed to appendDataValues to support dynamic number of values
          appendDataValues(messageData.valores);
          setStatus({ state: 'active', message: `Updated with ${messageData.valores.length} values (External)` });
        }
      } catch (error) {
        console.error('Error handling external message:', error);
      }
    };
    
    window.addEventListener('message', handleExternalMessage);
    
    return () => {
      window.removeEventListener('message', handleExternalMessage);
    };
  }, [appendDataValues]);

  // Chart data and options for the live view
  const chartData = {
    labels: data.map(item => item.time),
    datasets: [
      {
        label: 'Value',
        data: data.map(item => item.value),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      }
    ]
  };
  
  // Chart options with dark mode styling
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1f2937',
        borderColor: '#374151',
        titleColor: '#f3f4f6',
        bodyColor: '#f3f4f6',
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6
        }
      },
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9ca3af'
        },
        beginAtZero: true
      }
    }
  };
  
  // Historical chart data
  const historicalChartData = {
    labels: historicalData.map(item => item.formattedTime),
    datasets: [
      {
        label: 'Value',
        data: historicalData.map(item => item.value),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 1,
      }
    ]
  };
  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen">
      <div className="max-w-6xl mx-auto px-3 py-4">
        {/* Header */}
        <header className="bg-gray-800 rounded-lg shadow-lg p-4 mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white"> Control Panel</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${status.state === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm">{status.message}</span>
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="text-gray-400 hover:text-gray-200"
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Settings Panel (Collapsible) */}
        {showSettings && (
          <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <ChevronDown size={16} />
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">
                  Update Interval: {updateInterval / 1000}s
                </label>
                <input
                  type="range"
                  min="1000"
                  max="60000"
                  step="1000"
                  value={updateInterval}
                  onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={() => {
                  if (isMonitoring) {
                    stopMonitoring();
                  }
                }}
                className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800 rounded-lg shadow-md p-3 flex flex-col justify-between">
            <div className="text-xs text-gray-400">Current</div>
            <div className="text-xl font-bold text-blue-400">{stats.currentSpeed} <span className="text-xs">Mbps</span></div>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-md p-3 flex flex-col justify-between">
            <div className="text-xs text-gray-400">Peak</div>
            <div className="text-xl font-bold text-green-400">{stats.peakSpeed} <span className="text-xs">Mbps</span></div>
          </div>
          
          <div className="bg-gray-800 rounded-lg shadow-md p-3 flex flex-col justify-between">
            <div className="text-xs text-gray-400">Average</div>
            <div className="text-xl font-bold text-purple-400">{stats.averageSpeed} <span className="text-xs">Mbps</span></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg shadow-md p-2 mb-4 flex space-x-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1 text-sm rounded ${activeTab === 'live' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Live
          </button>
          <button
            onClick={() => {
              setActiveTab('historical');
              fetchHistoricalData();
            }}
            className={`px-3 py-1 text-sm rounded ${activeTab === 'historical' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Historical
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1 text-sm rounded ${activeTab === 'sql' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Database
          </button>
          <button
          onClick={() => setActiveTab('samples')}
          className={`px-3 py-1 text-sm rounded ${activeTab === 'samples' 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          Samples
        </button>
        </div>

        {/* Main Content Area */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 gap-4 mb-4">
            {/* Chart - Ahora ocupa todo el ancho y es más alto */}
            <div className="bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Value 1</h2>
                <button
                  onClick={fetchDataFromServer}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <div className="h-96">
                {data.length > 0 ? (
                  <Line data={chartData} options={chartOptions} />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Recent Data - Ahora en una fila separada debajo del gráfico */}

          </div>
        )}

        {activeTab === 'historical' && (
          <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Historical Data</h2>
              <div className="flex items-center space-x-2">
                <select
                  value={historyTimeRange}
                  onChange={(e) => setHistoryTimeRange(e.target.value)}
                  className="bg-gray-700 text-gray-200 text-xs border-0 rounded p-1"
                >
                  <option value="1h">1h</option>
                  <option value="6h">6h</option>
                  <option value="24h">24h</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                </select>
                <button 
                  onClick={fetchHistoricalData}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <RefreshCw size={14} />
                </button>
                <button 
                  onClick={exportHistoricalDataAsCSV}
                  className="text-gray-400 hover:text-gray-200"
                  disabled={historicalData.length === 0}
                >
                  <DownloadCloud size={14} />
                </button>
              </div>
            </div>
            
            {/* Chart más alto */}
            <div className="h-96 mb-3">
              {historicalData.length > 0 ? (
                <Line data={historicalChartData} options={chartOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                  No historical data available
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-gray-400">
                  <tr>
                    <th className="text-left p-2">Timestamp</th>
                    <th className="text-right p-2">Mbps</th>
                    <th className="text-left p-2">Server</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {historicalData.length > 0 ? (
                    historicalData.slice(0, 5).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-700">
                        <td className="p-2">{item.formattedTime}</td>
                        <td className="p-2 text-right font-medium">{item.value}</td>
                        <td className="p-2">{item.server || 'Unknown'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-2 text-center text-gray-500">No data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Database Explorer</h2>
              <div className="flex items-center space-x-2">
                <select
                  value={historyTimeRange}
                  onChange={(e) => setHistoryTimeRange(e.target.value)}
                  className="bg-gray-700 text-gray-200 text-xs border-0 rounded p-1"
                >
                  <option value="1h">1h</option>
                  <option value="6h">6h</option>
                  <option value="24h">24h</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                </select>
                <button
                  onClick={fetchHistoricalData}
                  className="bg-blue-600 text-white p-1 rounded text-xs hover:bg-blue-700 flex items-center"
                >
                  <List size={12} className="mr-1" />
                  Query
                </button>
                <button
                  onClick={exportHistoricalDataAsCSV}
                  className="bg-green-600 text-white p-1 rounded text-xs hover:bg-green-700 flex items-center"
                  disabled={historicalData.length === 0}
                >
                  <DownloadCloud size={12} className="mr-1" />
                  CSV
                </button>
              </div>
            </div>
            
            {/* Chart más alto aquí también */}
            <div className="h-96 mb-3">
              {historicalData.length > 0 ? (
                <Line data={historicalChartData} options={chartOptions} />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                  Query the database to display chart
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-gray-400">
                  <tr>
                    <th className="text-left p-2">Timestamp</th>
                    <th className="text-right p-2">Mbps</th>
                    <th className="text-left p-2">Server</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {historicalData.length > 0 ? (
                    historicalData.slice(0, 10).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-700">
                        <td className="p-2">{item.formattedTime}</td>
                        <td className="p-2 text-right font-medium">{item.value}</td>
                        <td className="p-2">{item.server || 'Unknown'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-2 text-center text-gray-500">Query the database to view records</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'samples' && (
          <div className="bg-gray-800 rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Data Samples</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowNewSampleModal(true)}
                  className="bg-green-600 text-white p-1 rounded text-xs hover:bg-green-700 flex items-center"
                >
                  <Plus size={12} className="mr-1" />
                  New Sample
                </button>
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={`p-1 rounded text-xs flex items-center ${
                    compareMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  <Layers size={12} className="mr-1" />
                  {compareMode ? 'Exit Compare' : 'Compare'}
                </button>
                <button
                  onClick={loadSamples}
                  className="text-gray-400 hover:text-gray-200"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
    {/* Sample list */}
    <div className="overflow-y-auto max-h-96 mb-3 bg-gray-700 rounded-lg">
      {samples.length > 0 ? (
        <ul className="divide-y divide-gray-600">
          {samples.map(sample => (
            <li key={sample.id} className="p-2 hover:bg-gray-600 flex items-center justify-between">
              <div 
                className="flex-1 cursor-pointer flex items-center"
                onClick={() => loadSample(sample.id)}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  activeSample && activeSample.id === sample.id 
                    ? 'bg-blue-500' 
                    : compareMode && selectedSamples.some(s => s.id === sample.id)
                      ? 'bg-green-500'
                      : 'bg-gray-500'
                }`}></div>
                <div>
                  <div className="font-medium text-sm">{sample.name}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(sample.timestamp).toLocaleString()} - {sample.dataPoints || 0} points
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteSample(sample.id)}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
          No samples available
        </div>
      )}
    </div>
    {/* Chart for selected sample or comparison */}
    <div className="h-72 mb-3 bg-gray-700 rounded-lg p-2">
      {compareMode && selectedSamples.length > 0 ? (
        <Line 
          data={{
            labels: selectedSamples[0]?.data?.map(item => item.time) || [],
            datasets: selectedSamples.map((sample, index) => ({
              label: sample.name,
              data: sample.data.map(item => item.value),
              borderColor: [
                '#3b82f6',
                '#10b981',
                '#8b5cf6',
              ][index % 3],
              backgroundColor: [
                'rgba(59, 130, 246, 0.1)',
                'rgba(16, 185, 129, 0.1)',
                'rgba(139, 92, 246, 0.1)',
              ][index % 3],
              fill: false,
              tension: 0.4,
              pointRadius: 2,
            }))
          }}
          options={chartOptions}
        />
      ) : activeSample ? (
        <Line data={chartData} options={chartOptions} />
      ) : (
        <div className="flex h-full items-center justify-center text-gray-500 text-sm">
          Select a sample to view data
        </div>
      )}
    </div>
  </div>
)}
{/* New Sample Modal */}
{showNewSampleModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-gray-800 rounded-lg shadow-lg p-4 max-w-md w-full">
      <h2 className="text-lg font-semibold mb-3">Save Current Data as Sample</h2>
      <input
        type="text"
        placeholder="Sample name"
        value={sampleName}
        onChange={(e) => setSampleName(e.target.value)}
        className="w-full bg-gray-700 border-0 rounded p-2 text-sm mb-3"
      />
      <div className="flex justify-end space-x-2">
        <button
          onClick={() => setShowNewSampleModal(false)}
          className="bg-gray-700 text-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={startNewSample}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Connection Controls */}
          <div className="bg-gray-800 rounded-lg shadow-md p-3">
            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Server IP"
                  className="flex-1 bg-gray-700 border-0 rounded p-1 text-sm"
                />
                <input
                  type="text"
                  placeholder="Port"
                  className="w-20 bg-gray-700 border-0 rounded p-1 text-sm"
                />
                <button
                  onClick={fetchDataFromServer}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
                >
                  <Database size={14} className="mr-1" />
                  Test
                </button>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={startMonitoring}
                  disabled={isMonitoring}
                  className={`flex-1 flex items-center justify-center text-sm rounded py-1 ${
                    isMonitoring ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Play size={14} className="mr-1" />
                  Start
                </button>
                <button
                  onClick={stopMonitoring}
                  disabled={!isMonitoring}
                  className={`flex-1 flex items-center justify-center text-sm rounded py-1 ${
                    !isMonitoring ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  <Square size={14} className="mr-1" />
                  Stop
                </button>
                <button
                  onClick={clearData}
                  className="flex-1 flex items-center justify-center bg-gray-700 text-gray-200 py-1 rounded text-sm hover:bg-gray-600"
                >
                  <Trash2 size={14} className="mr-1" />
                  Clear
                </button>
              </div>
            </div>
          </div>
          
          {/* Manual Data Input */}
          <div className="bg-gray-800 rounded-lg shadow-md p-3">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter data to send"
                className="flex-1 bg-gray-700 border-0 rounded p-1 text-sm"
              />
              <button
                onClick={sendDataToServer}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
              >
                <Send size={14} className="mr-1" />
                Send
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="text-center text-gray-500 text-xs py-2">
          DAQ_davrod v0.4 © 2025
        </footer>
      </div>
    </div>
  );
};


export default NetworkMonitoringDashboard;





// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
// import { Line } from "react-chartjs-2";
// import { RefreshCw, Database, Send, Play, Square, Trash2, Clock, Settings } from 'lucide-react';

// // Register ChartJS components
// ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// const NetworkMonitoringDashboard = () => {
//   // State for data and configuration
//   const [data, setData] = useState([
//     { time: '00:00', value: 42 },
//     { time: '00:05', value: 47 },
//     { time: '00:10', value: 53 },
//     { time: '00:15', value: 49 },
//     { time: '00:20', value: 58 }
//   ]);
//   const [ip, setIp] = useState('localhost');
//   const [port, setPort] = useState('8000');
//   const [inputValue, setInputValue] = useState('');
//   const [isMonitoring, setIsMonitoring] = useState(false);
//   const [status, setStatus] = useState({ state: 'inactive', message: 'Offline' });
//   const [notification, setNotification] = useState(null);
//   const [stats, setStats] = useState({
//     currentSpeed: 0,
//     peakSpeed: 0,
//     averageSpeed: 0,
//     lastUpdated: 'Never'
//   });
//   // New state for update interval configuration
//   const [updateInterval, setUpdateInterval] = useState(5000); // 5 seconds default
//   const [showSettings, setShowSettings] = useState(false);

//   // References
//   const monitoringInterval = useRef(null);
//   const ws = useRef(null);

//   // API URL
//   const apiBaseUrl = `http://${ip}:${port}`;
//   const wsBaseUrl = `ws://${ip}:${port}`;

//   // Function to update data with new values - now as a useCallback to avoid recreating it on every render
//   const updateDataWithNewValues = useCallback((values) => {
//     const now = new Date();
//     const newData = values.map((value, index) => {
//       // Create timestamps spaced 5 minutes apart, with the last one being now
//       const time = new Date(now - (values.length - index - 1) * 5 * 60000);
//       return {
//         time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//         value: typeof value === 'number' ? value : parseFloat(value)
//       };
//     });
    
//     setData(newData);
    
//     // Update statistics
//     const numericValues = newData.map(item => item.value).filter(val => !isNaN(val));
    
//     if (numericValues.length > 0) {
//       const currentValue = numericValues[numericValues.length - 1];
//       const peakValue = Math.max(...numericValues);
//       const avgValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      
//       setStats({
//         currentSpeed: currentValue,
//         peakSpeed: peakValue,
//         averageSpeed: avgValue.toFixed(1),
//         lastUpdated: now.toLocaleTimeString()
//       });
//     }
//   }, []);

//   // Show notification
//   const showNotification = useCallback((message, type) => {
//     setNotification({ message, type });
    
//     // Auto-hide notification after 3 seconds
//     setTimeout(() => {
//       setNotification(null);
//     }, 3000);
//   }, []);

//   // Fetch data from FastAPI backend
//   const fetchDataFromServer = useCallback(async () => {
//     showNotification('Fetching data from server...', 'info');
    
//     try {
//       const response = await fetch(`${apiBaseUrl}/data`);
//       if (!response.ok) {
//         throw new Error(`HTTP error! Status: ${response.status}`);
//       }
      
//       const result = await response.json();
//       console.log("Data received from API:", result);
      
//       if (result.valores && result.valores.length > 0) {
//         // Update with values from API
//         updateDataWithNewValues(result.valores);
//         showNotification('Data fetched successfully!', 'success');
//         setStatus({ state: 'active', message: result.estado || 'Online' });
//       } else {
//         showNotification('No data returned from server', 'info');
//       }
//     } catch (error) {
//       showNotification(`Error fetching data: ${error.message}`, 'error');
//       console.error("API Error:", error);
//       setStatus({ state: 'inactive', message: 'Error' });
//     }
//   }, [apiBaseUrl, showNotification, updateDataWithNewValues]);

//   // Function to send data to server
//   const sendDataToServer = useCallback(async () => {
//     if (!inputValue) {
//       showNotification('Please enter a value to send', 'error');
//       return;
//     }
    
//     showNotification('Sending data to server...', 'info');
    
//     try {
//       const response = await fetch(`${apiBaseUrl}/send`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(inputValue),
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! Status: ${response.status}`);
//       }
      
//       const result = await response.json();
//       console.log("Send result:", result);
      
//       if (result.success) {
//         showNotification('Data sent successfully!', 'success');
//         setInputValue('');
        
//         // No need to manually fetch data after sending - WebSocket will update it
//       } else {
//         showNotification('Server received message but reported failure', 'error');
//       }
//     } catch (error) {
//       showNotification(`Error sending data: ${error.message}`, 'error');
//       console.error("API Error:", error);
//     }
//   }, [apiBaseUrl, inputValue, showNotification]);

//   // Function to generate random data for demo purposes
//   const generateRandomData = useCallback(() => {
//     // Create 5 random values between 30 and 90
//     const randomValues = Array(5).fill(0).map(() => Math.floor(Math.random() * 60) + 30);
//     updateDataWithNewValues(randomValues);
//     setStatus({ state: 'active', message: 'Updated (Simulated)' });
//   }, [updateDataWithNewValues]);

//   // Initialize WebSocket connection
//   const initWebSocket = useCallback(() => {
//     // Close existing connection if any
//     if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
//       ws.current.close();
//     }

//     try {
//       // Create a new WebSocket connection
//       ws.current = new WebSocket(`${wsBaseUrl}/ws`);
      
//       ws.current.onopen = () => {
//         console.log('WebSocket connection established');
//         showNotification('Real-time updates connected!', 'success');
//         setStatus(prev => ({ ...prev, message: 'Connected (Real-time)' }));
//       };
      
//       ws.current.onmessage = (event) => {
//         console.log('WebSocket message received:', event.data);
//         try {
//           const data = JSON.parse(event.data);
          
//           // Handle different types of messages
//           if (data.type === 'update' && data.valores) {
//             updateDataWithNewValues(data.valores);
//             setStatus({ state: 'active', message: 'Updated (Real-time)' });
//           } else if (data.type === 'notification') {
//             showNotification(data.message, data.notificationType || 'info');
//           }
//         } catch (err) {
//           console.error('Error parsing WebSocket message:', err);
//         }
//       };
      
//       ws.current.onclose = () => {
//         console.log('WebSocket connection closed');
//         if (isMonitoring) {
//           showNotification('Real-time connection closed. Falling back to polling.', 'info');
//         }
//       };
      
//       ws.current.onerror = (error) => {
//         console.error('WebSocket error:', error);
//         showNotification('WebSocket error. Falling back to polling.', 'error');
//       };
      
//     } catch (error) {
//       console.error('Failed to establish WebSocket connection:', error);
//       showNotification('Could not establish real-time connection. Using polling instead.', 'error');
//     }
//   }, [wsBaseUrl, showNotification, updateDataWithNewValues, isMonitoring]);

//   // Start real-time monitoring
//   const startMonitoring = useCallback(() => {
//     if (isMonitoring) return;
    
//     setIsMonitoring(true);
//     setStatus({ state: 'active', message: 'Monitoring' });
//     showNotification(`Real-time monitoring started (updates every ${updateInterval/1000}s)`, 'success');
    
//     // Initialize WebSocket for real-time updates
//     initWebSocket();
    
//     // Set up regular polling as fallback or primary method
//     monitoringInterval.current = setInterval(() => {
//       // Try to fetch from server
//       try {
//         fetchDataFromServer();
//       } catch (error) {
//         console.error("Error in periodic update:", error);
//         // Fallback to random data generation for demo purposes
//         generateRandomData();
//       }
//     }, updateInterval);
    
//     // Initial fetch
//     fetchDataFromServer();
//   }, [isMonitoring, fetchDataFromServer, initWebSocket, showNotification, updateInterval, generateRandomData]);

//   // Stop monitoring
//   const stopMonitoring = useCallback(() => {
//     if (!isMonitoring) return;
    
//     setIsMonitoring(false);
    
//     // Close WebSocket
//     if (ws.current) {
//       ws.current.close();
//     }
    
//     // Clear polling interval
//     if (monitoringInterval.current) {
//       clearInterval(monitoringInterval.current);
//       monitoringInterval.current = null;
//     }
    
//     setStatus({ state: 'inactive', message: 'Stopped' });
//     showNotification('Monitoring stopped', 'info');
//   }, [isMonitoring, showNotification]);

//   // Clear data
//   const clearData = useCallback(() => {
//     setData([]);
//     setStats({
//       currentSpeed: 0,
//       peakSpeed: 0,
//       averageSpeed: 0,
//       lastUpdated: 'Cleared'
//     });
//     showNotification('Data cleared', 'info');
//   }, [showNotification]);

//   // Initialize on component mount
//   useEffect(() => {
//     fetchDataFromServer();
    
//     return () => {
//       // Clean up on component unmount
//       if (monitoringInterval.current) {
//         clearInterval(monitoringInterval.current);
//       }
      
//       if (ws.current) {
//         ws.current.close();
//       }
//     };
//   }, [fetchDataFromServer]);

//   // Update API URL when IP or port changes
//   useEffect(() => {
//     if (isMonitoring) {
//       stopMonitoring();
//       // Small delay to ensure clean state before restarting
//       setTimeout(() => {
//         startMonitoring();
//       }, 100);
//     }
//   }, [ip, port, isMonitoring, startMonitoring, stopMonitoring]);

//   // Update monitoring when update interval changes
//   useEffect(() => {
//     if (isMonitoring) {
//       // Restart monitoring with new interval
//       stopMonitoring();
//       setTimeout(() => {
//         startMonitoring();
//       }, 100);
//     }
//   }, [updateInterval, isMonitoring, startMonitoring, stopMonitoring]);

//   // Add event listener for server-sent updates via postMessage (for iframe integrations)
//   useEffect(() => {
//     const handleExternalMessage = (event) => {
//       // Validate the origin if needed
      
//       try {
//         const messageData = event.data;
//         if (messageData && messageData.type === 'networkUpdate' && messageData.valores) {
//           updateDataWithNewValues(messageData.valores);
//           setStatus({ state: 'active', message: 'Updated (External)' });
//         }
//       } catch (error) {
//         console.error('Error handling external message:', error);
//       }
//     };
    
//     window.addEventListener('message', handleExternalMessage);
    
//     return () => {
//       window.removeEventListener('message', handleExternalMessage);
//     };
//   }, [updateDataWithNewValues]);

//   // Prepare chart data for react-chartjs-2
//   const chartData = {
//     labels: data.map(item => item.time),
//     datasets: [
//       {
//         label: 'Network Speed',
//         data: data.map(item => item.value),
//         fill: false,
//         backgroundColor: 'rgba(59, 130, 246, 0.5)',
//         borderColor: '#3b82f6',
//         tension: 0.1,
//         pointRadius: 4,
//         pointHoverRadius: 6
//       }
//     ]
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     scales: {
//       y: {
//         beginAtZero: false,
//         title: {
//           display: true,
//           text: 'Mbps'
//         }
//       }
//     },
//     animation: {
//       duration: 500 // Faster animations for more responsive updates
//     }
//   };

//   return (
//     <div className="bg-gray-100 min-h-screen">
//       <div className="max-w-6xl mx-auto px-4 py-8">
//         {/* Header */}
//         <header className="bg-blue-800 text-white rounded-lg shadow-lg p-6 mb-8">
//           <div className="flex items-center justify-between">
//             <h1 className="text-2xl font-bold">Real-Time Network Monitor</h1>
//             <div className="flex items-center space-x-4">
//               <div className="flex items-center space-x-2">
//                 <div className={`w-3 h-3 rounded-full ${status.state === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
//                 <span>{status.message}</span>
//               </div>
//               <button 
//                 onClick={() => setShowSettings(!showSettings)}
//                 className="flex items-center text-white hover:text-blue-200"
//               >
//                 <Settings size={18} />
//               </button>
//             </div>
//           </div>
//         </header>

//         {/* Settings Panel */}
//         {showSettings && (
//           <div className="bg-white rounded-lg shadow-md p-6 mb-6">
//             <h2 className="text-lg font-semibold mb-4">Monitoring Settings</h2>
//             <div className="flex flex-wrap gap-6">
//               <div className="flex-1 min-w-[200px]">
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Update Interval (milliseconds)
//                 </label>
//                 <div className="flex items-center">
//                   <input
//                     type="range"
//                     min="1000"
//                     max="60000"
//                     step="1000"
//                     value={updateInterval}
//                     onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
//                     className="w-full mr-2"
//                   />
//                   <span className="min-w-[80px] text-center">
//                     {updateInterval / 1000}s
//                   </span>
//                 </div>
//               </div>
//               <div className="flex items-end">
//                 <button
//                   onClick={() => {
//                     if (isMonitoring) {
//                       stopMonitoring();
//                       setTimeout(() => startMonitoring(), 100);
//                     }
//                     showNotification(`Update interval set to ${updateInterval/1000} seconds`, 'success');
//                   }}
//                   className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
//                 >
//                   Apply Settings
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Notification */}
//         {notification && (
//           <div className={`mb-6 p-4 rounded-lg shadow-md ${
//             notification.type === 'success' ? 'bg-green-100 text-green-800' :
//             notification.type === 'error' ? 'bg-red-100 text-red-800' :
//             'bg-blue-100 text-blue-800'
//           }`}>
//             {notification.message}
//           </div>
//         )}

//         {/* Statistics Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
//             <h3 className="text-gray-500 text-sm mb-1">Current Speed</h3>
//             <p className="text-3xl font-bold text-blue-600">{stats.currentSpeed} <span className="text-sm">Mbps</span></p>
//             <div className="mt-4 text-xs text-gray-500 flex items-center">
//               <Clock size={12} className="mr-1" />
//               Last updated: {stats.lastUpdated}
//             </div>
//           </div>
          
//           <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
//             <h3 className="text-gray-500 text-sm mb-1">Peak Speed</h3>
//             <p className="text-3xl font-bold text-green-600">{stats.peakSpeed} <span className="text-sm">Mbps</span></p>
//             <div className="mt-4 text-xs text-gray-500">Today's highest value</div>
//           </div>
          
//           <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
//             <h3 className="text-gray-500 text-sm mb-1">Average Speed</h3>
//             <p className="text-3xl font-bold text-purple-600">{stats.averageSpeed} <span className="text-sm">Mbps</span></p>
//             <div className="mt-4 text-xs text-gray-500">Last hour average</div>
//           </div>
//         </div>

//         {/* Main Dashboard */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
//           {/* Line Chart */}
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-lg font-semibold mb-4">Network Speed Over Time (Mbps)</h2>
//             <div className="h-64">
//               {data.length > 0 ? (
//                 <Line data={chartData} options={chartOptions} />
//               ) : (
//                 <div className="flex h-full items-center justify-center text-gray-400">
//                   No data available
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Data Table */}
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-lg font-semibold">Recent Measurements</h2>
//               <button 
//                 onClick={fetchDataFromServer}
//                 className="flex items-center text-blue-600 hover:text-blue-800"
//               >
//                 <RefreshCw size={16} className="mr-1" />
//                 Refresh
//               </button>
//             </div>

//             <div className="overflow-y-auto max-h-64">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead>
//                   <tr>
//                     <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
//                     <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Speed (Mbps)</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-200">
//                   {data.length > 0 ? (
//                     data.map((item, index) => (
//                       <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
//                         <td className="px-4 py-3 text-sm text-gray-900">{item.time}</td>
//                         <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.value}</td>
//                       </tr>
//                     ))
//                   ) : (
//                     <tr>
//                       <td colSpan="2" className="px-4 py-3 text-sm text-gray-500 text-center">No data available</td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>

//         {/* Data Input Section */}
//         <div className="bg-white rounded-lg shadow-md p-6 mb-8">
//           <h2 className="text-lg font-semibold mb-4">Server Configuration</h2>
//           <div className="flex flex-col md:flex-row gap-4">
//             <div className="flex-1">
//               <label className="block text-sm font-medium text-gray-700 mb-1">API Server IP</label>
//               <input
//                 type="text"
//                 value={ip}
//                 onChange={(e) => setIp(e.target.value)}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 placeholder="Enter server IP"
//               />
//             </div>
//             <div className="flex-1">
//               <label className="block text-sm font-medium text-gray-700 mb-1">API Port</label>
//               <input
//                 type="text"
//                 value={port}
//                 onChange={(e) => setPort(e.target.value)}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 placeholder="Enter port"
//               />
//             </div>
//             <div className="flex-1">
//               <label className="block text-sm font-medium text-gray-700 mb-1">Speed (Mbps)</label>
//               <div className="flex">
//                 <input
//                   type="number"
//                   value={inputValue}
//                   onChange={(e) => setInputValue(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter Mbps value"
//                 />
//                 <button
//                   onClick={sendDataToServer}
//                   className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 flex items-center"
//                 >
//                   <Send size={16} className="mr-1" />
//                   Send
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Connection Status */}
//         {isMonitoring && (
//           <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
//             <h2 className="text-lg font-semibold mb-2">Monitoring Status</h2>
//             <div className="flex flex-col gap-2">
//               {/* Monitoring info */}
//               <div className="flex items-center">
//                 <div className="w-3 h-3 rounded-full mr-2 bg-green-500 animate-pulse"></div>
//                 <span>Auto-updating every {updateInterval/1000} seconds</span>
//               </div>
              
//               {/* WebSocket status if available */}
//               {ws.current && (
//                 <div className="flex items-center mt-1">
//                   <div className={`w-3 h-3 rounded-full mr-2 ${
//                     ws.current.readyState === WebSocket.OPEN ? 'bg-green-500' : 
//                     ws.current.readyState === WebSocket.CONNECTING ? 'bg-yellow-500' : 
//                     'bg-red-500'
//                   }`}></div>
//                   <span>
//                     WebSocket: {ws.current.readyState === WebSocket.OPEN ? 'Connected' : 
//                     ws.current.readyState === WebSocket.CONNECTING ? 'Connecting...' : 
//                     'Disconnected (Using polling)'}
//                   </span>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {/* Control Buttons */}
//         <div className="flex flex-wrap justify-center gap-4">
//           <button
//             onClick={fetchDataFromServer}
//             className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center shadow-md"
//           >
//             <Database size={16} className="mr-2" />
//             Fetch Data
//           </button>
          
//           {!isMonitoring ? (
//             <button
//               onClick={startMonitoring}
//               className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 flex items-center shadow-md"
//             >
//               <Play size={16} className="mr-2" />
//               Start Monitoring
//             </button>
//           ) : (
//             <button
//               onClick={stopMonitoring}
//               className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 flex items-center shadow-md"
//             >
//               <Square size={16} className="mr-2" />
//               Stop Monitoring
//             </button>
//           )}
          
//           <button
//             onClick={clearData}
//             className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 flex items-center shadow-md"
//           >
//             <Trash2 size={16} className="mr-2" />
//             Clear Data
//           </button>
          
//           {/* Demo mode button - generates random data for testing */}
//           <button
//             onClick={generateRandomData}
//             className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700 flex items-center shadow-md"
//           >
//             <RefreshCw size={16} className="mr-2" />
//             Generate Test Data
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default NetworkMonitoringDashboard;





// import { useEffect, useState } from "react";
// import axios from "./api";
// import { Line, Bar, Pie } from "react-chartjs-2";
// import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip } from "chart.js";





// // Registrar todos los módulos necesarios
// Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip);

// function App() {
//   console.log("Inicio de app");
  
//   const [data, setData] = useState([10, 20, 30, 40, 50]); // Valores predeterminados
//   const [ip, setIp] = useState(""); // Dirección IP
//   const [port, setPort] = useState(""); // Puerto
//   const [inputValue, setInputValue] = useState(""); // Valor de entrada para enviar

//   useEffect(() => {
//     console.log("Inicio de useEffect");
    
//     const fetchData = () => {
//       axios.get("/data")
//         .then((response) => {
//           console.log("Datos obtenidos:", response.data);
//           setData(response.data.valores);
//         })
//         .catch((error) => {
//           console.error("Error al obtener los datos:", error);
//         });
//     };

//     fetchData(); // Llamar a la API al inicio

//   // Simular datos en tiempo real cada 2 segundos
//   const interval = setInterval(() => {
//     axios.get("/data") // Hacer una nueva petición cada 2 segundos
//       .then((response) => {
//         console.log("Actualización en tiempo real:", response.data);
//         setData(response.data.valores); // Actualizar los datos con los nuevos valores del backend
//       })
//       .catch((error) => {
//         console.error("Error al obtener datos en tiempo real:", error);
//       });
//   }, 2000);

//     return () => clearInterval(interval);
//   }, []);

//   // 🔹 Configuración del gráfico de líneas
//   const lineChartData = {
//     labels: data.map((_, i) => i + 1),
//     datasets: [
//       {
//         label: "Valores en Tiempo Real",
//         data: data,
//         borderColor: "blue",
//         backgroundColor: "rgba(0, 0, 255, 0.2)",
//         borderWidth: 2,
//         fill: false,
//       },
//     ],
//   };

//   // 🔹 Configuración del gráfico de barras
//   const barChartData = {
//     labels: data.map((_, i) => i + 1),
//     datasets: [
//       {
//         label: "Datos de barras",
//         data: data,
//         backgroundColor: "rgba(255, 99, 132, 0.5)",
//         borderColor: "rgba(255, 99, 132, 1)",
//         borderWidth: 1,
//       },
//     ],
//   };

//   // 🔹 Configuración del gráfico de pastel
//   const pieChartData = {
//     labels: ["A", "B", "C", "D", "E"],
//     datasets: [
//       {
//         data: data.slice(-5), // Solo los últimos 5 valores
//         backgroundColor: ["red", "blue", "yellow", "green", "purple"],
//       },
//     ],
//   };

//   // 🔹 Cargar datos desde el servidor
//   const loadDataFromServer = () => {
//     axios.get(`/data?ip=${ip}&port=${port}`)
//       .then(response => {
//         console.log("Datos cargados desde el servidor:", response.data);
//         setData(response.data.valores);
//       })
//       .catch(error => {
//         console.error("Error al cargar datos desde el servidor:", error);
//       });
//   };

//   // 🔹 Enviar datos al servidor
//   const sendDataToServer = () => {
//     if (ip && port && inputValue) {
//       axios.post(`/sendData`, { ip, port, data: inputValue })
//         .then(response => console.log("Datos enviados correctamente:", response.data))
//         .catch(error => console.error("Error al enviar datos al servidor:", error));
//     } else {
//       console.error("Faltan campos requeridos");
//     }
//   };

//   // 🔹 Limpiar los datos
//   const clearData = () => {
//     setData([]);
//     console.log("Datos limpiados");
//   };

//   return (
//     <div style={{ maxWidth: "900px", margin: "auto", textAlign: "center", padding: "20px" }}>
//       <h1>📊 Control Panel</h1>

//       {/* Gráfico de líneas */}
//       <div style={{ background: "#f8f9fa", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
//         <h3>📈 Gráfico de Líneas</h3>
//         <Line data={lineChartData} />
//       </div>

//       {/* Gráfico de barras */}
//       <div style={{ background: "#e3f2fd", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
//         <h3>📊 Gráfico de Barras</h3>
//         <Bar data={barChartData} />
//       </div>

//       {/* Gráfico de pastel */}
//       <div style={{ background: "#fce4ec", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
//         <h3>🥧 Gráfico de Pastel</h3>
//         <Pie data={pieChartData} />
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

//       {/* Botones de acción */}
//       <div style={{ marginTop: "20px" }}>
//         <button onClick={loadDataFromServer} style={{ marginRight: "10px" }}>📥 Cargar Datos</button>
//         <button onClick={clearData} style={{ background: "#dc3545", color: "white" }}>🧹 Limpiar Datos</button>
//       </div>

//       {/* Sección para enviar datos */}
//       <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
//         <input type="text" placeholder="IP del servidor" value={ip} onChange={(e) => setIp(e.target.value)} />
//         <input type="text" placeholder="Puerto" value={port} onChange={(e) => setPort(e.target.value)} />
//         <input type="text" placeholder="Valor" value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
//         <button onClick={sendDataToServer}>🚀 Enviar Datos</button>
//       </div>
//     </div>
//   );
// }

// export default App;


