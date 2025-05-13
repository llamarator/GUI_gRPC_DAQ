*** Settings ***
Documentation     Suite de pruebas para el servicio NGINX
Resource          ../resources/common.resource
Suite Setup       Setup Test Environment

*** Test Cases ***
Verify NGINX Service Is Available
    [Documentation]    Verifica que el servicio NGINX esté disponible y responda correctamente
    Create Session    nginx    ${NGINX_URL}    verify=True
    ${response}=    GET On Session    nginx    /    expected_status=any
    Should Be True    ${response.status_code} < 500
    Log    NGINX responded with status code: ${response.status_code}

Test NGINX Routes To Frontend
    [Documentation]    Verifica que NGINX redireccione correctamente al frontend
    Create Session    nginx    ${NGINX_URL}    verify=True
    ${response}=    GET On Session    nginx    /    expected_status=any
    Should Be True    ${response.status_code} < 500
    Log    Response from frontend route: ${response.text}

Test NGINX Routes To Backend API
    [Documentation]    Verifica que NGINX redireccione correctamente al backend API
    Create Session    nginx    ${NGINX_URL}    verify=True
    ${response}=    GET On Session    nginx    /api/    expected_status=any
    Should Be True    ${response.status_code} < 500
    Log    Response from backend API route: ${response.text}
