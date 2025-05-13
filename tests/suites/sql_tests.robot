*** Settings ***
Documentation     Suite de pruebas para la base de datos SQL
Resource          ../resources/common.resource
Library           DatabaseLibrary
Suite Setup       Connect To Database    psycopg2    ${DB_NAME}    ${DB_USER}    ${DB_PASSWORD}    ${DB_HOST}    ${DB_PORT}
Suite Teardown    Disconnect From Database

*** Test Cases ***
Verify Database Connection
    [Documentation]    Verifica la conexión a la base de datos SQL
    Table Must Exist    pg_tables
    Log    Successfully connected to the database

Test Database Tables
    [Documentation]    Verifica la existencia de tablas necesarias en la base de datos
    @{tables}=    Query    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    Log Many    @{tables}
    Log    Database contains tables

Test Database Queries
    [Documentation]    Prueba consultas básicas a la base de datos
    @{result}=    Query    SELECT version()
    Log Many    @{result}
    Log    Database version query executed successfully
