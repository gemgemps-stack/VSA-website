$body = @{
    email = 'admin@verdida.local'
    password = 'Admin123!'
} | ConvertTo-Json

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$login = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/api/auth/login' -Method POST -Body $body -ContentType 'application/json' -WebSession $session -UseBasicParsing -TimeoutSec 10
Write-Output "LOGIN: $($login.StatusCode)"
try {
    $income = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/api/income?page=0&size=1' -WebSession $session -UseBasicParsing -TimeoutSec 10
    Write-Output "INCOME: $($income.StatusCode)"
    Write-Output $income.Content
} catch {
    Write-Output "INCOME ERROR: $($_.Exception.Message)"
}
