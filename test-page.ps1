$wc = New-Object System.Net.WebClient
try {
    $html = $wc.DownloadString('http://localhost:3000/')
    Write-Host "SUCCESS: Page loaded, length: $($html.Length)"
} catch {
    Write-Host "ERROR: " $_.Exception.Message
}
$wc.Dispose()