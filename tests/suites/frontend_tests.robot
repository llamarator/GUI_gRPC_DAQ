*** Settings ***
Documentation     Suite de pruebas para el servicio Frontend
Resource          ../resources/common.resource
Suite Setup       Setup Test Environment

*** Test Cases ***
Verify Frontend Service Is Available
    [Documentation]    Verifica que el servicio Frontend esté disponible
    Create Session    frontend    http://control-frontend:3000    verify=True
    ${response}=    GET On Session    frontend    /    expected_status=any
    Should Be True    ${response.status_code} < 500
    Log    Frontend responded with status code: ${response.status_code}

Test Frontend Content
    [Documentation]    Verifica que el Frontend devuelva contenido HTML válido
    Create Session    frontend    http://control-frontend:3000    verify=True
    ${response}=    GET On Session    frontend    /    expected_status=any
    Should Contain    ${response.text}    <!DOCTYPE html>
    Log    Frontend content contains HTML doctype

Test Frontend Assets
    [Documentation]    Verifica que los recursos estáticos del Frontend estén disponibles
    Create Session    frontend    http://control-frontend:3000    verify=True
    ${response}=    GET On Session    frontend    /assets    expected_status=any
    Should Be True    ${response.status_code} < 500
    Log    Frontend assets response: ${response.status_code}
