*** Settings ***
Documentation     Suite de pruebas para el servicio gRPC
Resource          ../resources/common.resource
Library           ../libraries/GrpcClient.py
Suite Setup       Setup Test Environment

*** Test Cases ***
Verify GRPC Service Is Running
    [Documentation]    Verifica que el servicio gRPC esté en ejecución
    ${result}=    Run Process    ping -c 3 control-grpc    shell=True
    Should Be Equal As Integers    ${result.rc}    0
    Log    gRPC service is running at ${GRPC_HOST}:${GRPC_PORT}

Test GRPC Connection
    [Documentation]    Prueba la conexión al servicio gRPC
    ${status}=    Test GRPC Connection    ${GRPC_HOST}    ${GRPC_PORT}
    Should Be Equal    ${status}    True
    Log    Successfully connected to gRPC service

Test GRPC Methods
    [Documentation]    Prueba los métodos disponibles en el servicio gRPC
    ${response}=    Call GRPC Method    GetStatus
    Should Not Be Empty    ${response}
    Log    gRPC GetStatus response: ${response}
