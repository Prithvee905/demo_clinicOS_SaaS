$baseUrl = "http://localhost:8080/api"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$clinicCode = "test-be-$timestamp"
$adminEmail = "admin-$timestamp@test.com"

Write-Host "--------------------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 Testing Spring Boot Monolith API (Localhost:8080)" -ForegroundColor Cyan
Write-Host "--------------------------------------------------" -ForegroundColor Cyan

# 1. Register Clinic
Write-Host "1. Registering Clinic with code: $clinicCode..." -ForegroundColor Yellow
$registerBody = @{
    clinicName = "Backend Test Clinic"
    clinicCode = $clinicCode
    clinicPhone = "9988776655"
    clinicEmail = "contact@betest.com"
    clinicAddress = "456 Backend Lane, Bangalore"
    ownerName = "Dr. API Test"
    adminName = "API Admin"
    adminEmail = $adminEmail
    adminPhone = "9988776655"
    password = "password123"
} | ConvertTo-Json -Depth 5

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    $token = $regResponse.accessToken
    $code = $regResponse.clinicCode
    Write-Host "✅ Registration Successful!" -ForegroundColor Green
    Write-Host "   Clinic Code: $code" -ForegroundColor White
    Write-Host "   Admin Email: $adminEmail" -ForegroundColor White
    Write-Host "   JWT Token:   $($token.Substring(0, 30))..." -ForegroundColor White
} catch {
    Write-Host "❌ Registration Failed:" -ForegroundColor Red
    Write-Error $_.Exception
    exit 1
}

# 2. Query Doctors List
Write-Host "`n2. Querying Doctors List (Secured Endpoint)..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $doctors = Invoke-RestMethod -Uri "$baseUrl/doctors" -Method Get -Headers $headers
    Write-Host "✅ API Communication Successful!" -ForegroundColor Green
    Write-Host "   HTTP Status: 200 OK" -ForegroundColor White
    Write-Host "   Response Payload: $doctors" -ForegroundColor Gray
} catch {
    Write-Host "❌ Query Failed (Spring Security blocks access):" -ForegroundColor Red
    Write-Error $_.Exception
    exit 1
}

Write-Host "`n--------------------------------------------------" -ForegroundColor Cyan
Write-Host "🎉 All Backend API REST Tests Passed!" -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Cyan
