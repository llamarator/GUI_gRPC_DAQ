*** Settings ***
Documentation     Suite de pruebas para el servicio Backend
Resource          ../resources/common.resource
Suite Setup       Setup Test Environment

*** Test Cases ***
Verify Backend Service Is Available
    [Documentation]    Verifica que el servicio Backend esté disponible
    Create Session    backend    ${BACKEND_URL}    verify=True
    ${response}=    GET On Session    backend    /    expected_status=any
    Should Be True    ${response.status_code} < 500
    Log    Backend responded with status code: ${response.status_code}

Test Backend API Endpoints
    [Documentation]    Prueba los endpoints API del Backend
    Create Session    backend    ${BACKEND_URL}    verify=True
    ${response}=    GET On Session    backend    /api/status    expected_status=any
    Should Be True    ${response.status_code} < 500
    Log    Backend API status: ${response.text}

Test Backend Database Connection
    [Documentation]    Verifica la conexión a la base de datos desde el Backend
    Create Session    backend    ${BACKEND_URL}    verify=True
    ${response}=    GET On Session    backend    /api/db-status    expected_status=any
    Should Be True    ${response.status_code} < 500
    Log    Database connection status: ${response.text}
