*** Settings ***
Documentation     Suite de pruebas de integración para todo el sistema
Resource          ../resources/common.resource
Suite Setup       Setup Test Environment

*** Test Cases ***
Verify All Services Are Running
    [Documentation]    Verifica que todos los servicios estén en ejecución
    Check All Services

Test End-to-End Flow
    [Documentation]    Prueba el flujo completo de la aplicación de principio a fin
    # Acceder al frontend a través de nginx
    Create Session    nginx    ${NGINX_URL}    verify=True
    ${frontend_response}=    GET On Session    nginx    /    expected_status=any
    Should Be True    ${frontend_response.status_code} < 500
    
    # Acceder al API del backend a través de nginx
    ${backend_response}=    GET On Session    nginx    /api/status    expected_status=any
    Should Be True    ${backend_response.status_code} < 500
    
    # Verificar que el gateway esté funcionando correctamente
    Create Session    gateway    ${GATEWAY_URL}    verify=True
    ${gateway_response}=    GET On Session    gateway    /status    expected_status=any
    Should Be True    ${gateway_response.status_code} < 500
    
    Log    End-to-End test completed successfully

*** Keywords ***
Check All Services
    ${nginx_result}=    Run Process    ping -c 1 nginx-router    shell=True
    Should Be Equal As Integers    ${nginx_result.rc}    0
    
    ${gateway_result}=    Run Process    ping -c 1 gateway    shell=True
    Should Be Equal As Integers    ${gateway_result.rc}    0
    
    ${frontend_result}=    Run Process    ping -c 1 control-frontend    shell=True
    Should Be Equal As Integers    ${frontend_result.rc}    0
    
    ${backend_result}=    Run Process    ping -c 1 control-backend    shell=True
    Should Be Equal As Integers    ${backend_result.rc}    0
    
    ${grpc_result}=    Run Process    ping -c 1 control-grpc    shell=True
    Should Be Equal As Integers    ${grpc_result.rc}    0
    
    ${sql_result}=    Run Process    ping -c 1 sql    shell=True
    Should Be Equal As Integers    ${sql_result.rc}    0
    
    Log    All services are running correctly
