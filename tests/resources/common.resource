*** Settings ***
Documentation     Configuración común para todas las pruebas
Library           RequestsLibrary
Library           OperatingSystem
Library           String
Library           Collections
Library           Process
Library           DateTime

*** Variables ***
${NGINX_URL}       http://nginx-router:80
${GATEWAY_URL}     http://gateway:5000
${BACKEND_URL}     http://control-backend:8000
${GRPC_HOST}       control-grpc
${GRPC_PORT}       50051
${DB_HOST}         sql
${DB_PORT}         5432
${DB_NAME}         mydb
${DB_USER}         user
${DB_PASSWORD}     password

*** Keywords ***
Setup Test Environment
    Log    Iniciando configuración del entorno de pruebas
    Wait Until Keyword Succeeds    60s    5s    Check NGINX Is Running
    Wait Until Keyword Succeeds    60s    5s    Check Gateway Is Running
    Wait Until Keyword Succeeds    60s    5s    Check Backend Is Running
    Log    Entorno de pruebas configurado correctamente

Check NGINX Is Running
    ${result}=    Run Process    ping -c 1 nginx-router    shell=True
    Should Be Equal As Integers    ${result.rc}    0
    Log    NGINX está en ejecución en ${NGINX_URL}

Check Gateway Is Running
    ${result}=    Run Process    ping -c 1 gateway    shell=True
    Should Be Equal As Integers    ${result.rc}    0
    Log    Gateway está en ejecución en ${GATEWAY_URL}

Check Backend Is Running
    ${result}=    Run Process    ping -c 1 control-backend    shell=True
    Should Be Equal As Integers    ${result.rc}    0
    Log    Backend está en ejecución en ${BACKEND_URL}
